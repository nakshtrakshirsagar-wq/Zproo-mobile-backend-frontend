import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { Box, HoldTimer } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useBusUi } from '../../components/BusResult';
import { BookingSteps } from '../../components/BookingSteps';
import { ConfirmDialog } from '../../components/widgets';
import {
  PassengerDetails, PassengerFormValue, PassTrip, firstErrorKey, totalWithInsurance, validatePassengerForm,
} from '../../components/PassengerDetails';
import { Api } from '../../api/endpoints';
import { useAction } from '../../hooks/useApi';
import { useBooking } from '../../store/booking';
import { useAuth } from '../../store/auth';
import { toast } from '../../utils/toast';
import { dateShort, rupees, rupeesExact, time24, toE164 } from '../../utils/format';
import { type } from '../../theme/typography';
import { cleanIdNumber, collapseSpaces } from '../../utils/validation';

const PRIMARY = '#E11D2E';

/**
 * Step 3 of the bus booking: Passenger details ("Boarding pass" design). The form is components/PassengerDetails;
 * this screen owns the state, runs the validation, scrolls to the first mistake and then reserves the seats (ETS BlockTicket) or goes to Checkout.
 * Route params (from Boarding/Dropping): { trip, boarding, dropping } - used for the pass header.
 */
export function BusPassengersScreen({ navigation, route }: any) {
  const ui = useBusUi();
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { hold, womenMode, setDetails, updateHold } = useBooking();
  const user = useAuth((s) => s.user);
  const params = (route?.params ?? {}) as { trip?: any; boarding?: { name: string; time: string }; dropping?: { name: string; time: string } };

  const seats: string[] = hold?.summary?.seats ?? [];
  const ladiesIds: string[] = (hold?.summary?.ladiesSeats as string[]) ?? [];
  // Operators that reserve seats via the supplier (ETS BlockTicket) need an ID proof of the first passenger, and only M/F.
  const needsBlock = !!hold?.needsBlock;
  const needsId = needsBlock && hold?.supplier === 'ets';

  const [form, setForm] = useState<PassengerFormValue>(() => ({
    pax: seats.map((s, i) => ({ seatId: s, name: i === 0 ? (user?.name ?? '') : '', age: '', gender: ladiesIds.includes(s) ? 'F' : '' })),
    mobile: (user?.mobile ?? '').replace('+91', ''), email: user?.email ?? '',
    insurance: false, addEmergency: womenMode, emergency: { name: '', mobile: '', relation: 'Mother' },
    idType: 'PAN', idNumber: '',
  }));
  const [submitted, setSubmitted] = useState(false);
  const [fareChange, setFareChange] = useState<{ prev: number; now: number } | null>(null);

  const errors = useMemo(() => validatePassengerForm(form, { ladiesSeatIds: ladiesIds, needsId }), [form, ladiesIds, needsId]);
  const total = totalWithInsurance(hold?.basePaise ?? 0, hold?.taxPaise ?? 0, seats.length, form.insurance);

  // ---- scroll to the first field with an error
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const fields = useRef<Record<string, View | null>>({});
  const registerField = useCallback((k: string, node: View | null) => { fields.current[k] = node; }, []);
  const scrollToField = (k: string) => {
    const node = fields.current[k], host = scroll.current as any;
    if (!node || !host?.measure) return;
    host.measure((_x: number, _y: number, _w: number, _h: number, _px: number, hostTop: number) => {
      node.measure((_a, _b, _c, _d, _e, top) => scroll.current?.scrollTo({ y: Math.max(0, scrollY.current + top - hostTop - 90), animated: true }));
    });
  };

  const cleanPax = () => form.pax.map((p) => ({ seatId: p.seatId, name: collapseSpaces(p.name), age: Number(p.age), gender: p.gender as 'M' | 'F' | 'O' }));
  const contact = () => ({ mobile: toE164(form.mobile), email: form.email.trim() });

  // ETS BlockTicket: reserve the seats for 10 minutes now that passenger details are known.
  const block = useAction(() => Api.blockHold(hold!.holdId, {
    pax: cleanPax().map((p, i) => (i === 0 && needsId ? { ...p, idType: form.idType as any, idNumber: cleanIdNumber(form.idNumber) } : p)),
    contact: contact(),
    emergencyMobile: form.addEmergency ? toE164(form.emergency.mobile) : undefined,
  }), {
    onError: (e: any) => { console.warn('[block] failed', e?.status, e?.code, e?.message); toast(e?.message ?? 'Could not reserve seats', 'error'); },
    onSuccess: (r) => {
      updateHold({ expiresAt: r.expiresAt, basePaise: r.basePaise, taxPaise: r.taxPaise });
      if (r.fareChanged) setFareChange({ prev: r.previousTotalPaise, now: r.totalPaise });
      else navigation.navigate('Checkout');
    },
  });

  const submit = () => {
    setSubmitted(true);
    const keys = Object.keys(errors);
    if (keys.length) {
      const first = firstErrorKey(errors, form.pax.length);
      if (first) scrollToField(first);
      toast(`Please fix the highlighted fields (${keys.length})`, 'error');
      return;
    }
    setDetails({
      pax: cleanPax(), contact: contact(), addOns: form.insurance ? ['INSURANCE'] : [],
      extras: form.addEmergency ? { emergencyContact: { name: collapseSpaces(form.emergency.name), mobile: toE164(form.emergency.mobile), relation: form.emergency.relation } } : {},
    });
    if (needsBlock) block.mutate(); else navigation.navigate('Checkout');
  };

  const trip: PassTrip | undefined = params.trip ? {
    from: params.boarding?.name ?? params.trip.fromCity, to: params.dropping?.name ?? params.trip.toCity,
    fromTime: params.boarding ? time24(params.boarding.time) : time24(params.trip.departAt),
    toTime: params.dropping ? time24(params.dropping.time) : time24(params.trip.arriveAt),
    date: dateShort(params.trip.departAt), durationMin: params.trip.durationMin,
  } : undefined;
  const pageBg = isDark ? c.bg : '#F5F6F8';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: pageBg }} edges={['top']}>
      {/* app bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 12, backgroundColor: ui.surface, borderBottomWidth: 1, borderBottomColor: ui.line }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? ui.chipBg : '#F1F2F5', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={20} color={ui.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type('header', 24), color: ui.ink, lineHeight: 29, letterSpacing: -0.2 }}>Passenger details</Text>
          {!!trip && <Text numberOfLines={1} style={{ ...type('label', 12), color: ui.muted, lineHeight: 17 }}>{trip.from} → {trip.to}{trip.date ? ` · ${trip.date}` : ''}</Text>}
        </View>
      </View>
      <BookingSteps current={2} />

      <ScrollView ref={scroll} onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 14, paddingBottom: 24, gap: 12 }} showsVerticalScrollIndicator={false}>
        <HoldTimer expiresAt={hold?.expiresAt} label={`Seats ${seats.join(', ')} on hold`} onExpire={() => navigation.popToTop()} />
        {seats.length === 0 ? (
          <Box kind="warn" text="Your seat hold has expired. Please select your seats again." />
        ) : (
          <PassengerDetails trip={trip} value={form} onChange={setForm} errors={errors} submitted={submitted} ladiesSeatIds={ladiesIds} needsId={needsId}
            womenMode={womenMode} totalPaise={total} registerField={registerField} />
        )}
        {womenMode && <Box kind="warn" text="A male name on a ladies seat is blocked automatically." />}
      </ScrollView>

      {/* bottom bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: ui.surface, borderTopWidth: 1, borderTopColor: ui.line }}>
        <View>
          <Text style={{ ...type('subHeader', 18), color: ui.ink }}>{rupees(total)}</Text>
          <Text style={{ ...type('label', 12), color: ui.muted }}>{seats.length} {seats.length === 1 ? 'seat' : 'seats'} · incl. taxes</Text>
        </View>
        <Pressable onPress={submit} disabled={block.isPending || seats.length === 0} accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: block.isPending || seats.length === 0 ? '#EAB3B6' : pressed ? '#B9111F' : PRIMARY })}>
          <Text style={{ ...type('button'), color: '#fff' }}>{block.isPending ? 'Reserving seats…' : needsBlock ? 'Reserve seats & continue' : 'Continue'}</Text>
        </Pressable>
      </View>

      <ConfirmDialog visible={!!fareChange} title="Fare updated by the operator"
        text={fareChange ? `Total changed from ${rupeesExact(fareChange.prev)} to ${rupeesExact(fareChange.now)} (including taxes and operator charges). Your seats are reserved for 10 minutes.` : undefined}
        confirm="Continue at new fare" cancel="Review" onCancel={() => setFareChange(null)}
        onConfirm={() => { setFareChange(null); navigation.navigate('Checkout'); }} />
    </SafeAreaView>
  );
}
