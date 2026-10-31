import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Box, Button, Card, Chip, ChipGroup, Row, Screen, Section, Tabs, Toggle, Txt } from '../../components/ui';
import { SearchCard } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import type { CabPlace, CabTripReq } from '../../api/endpoints';
import { usePrefs } from '../../store/prefs';
import { CAB_RULES, CabForm, RENTAL_PACKAGES, TRIP_TABS, TripType, earliestPickup, validateCabForm } from './cabRules';
import { DateTimeSheet, PlaceSheet } from './CabPickers';

const TAB_ICON = { CITY: 'car', AIRPORT: 'plane', OUTSTATION: 'map', RENTAL: 'clock' } as const;
const fmt = (d: Date) => dayjs(d).format('ddd, D MMM · hh:mm A');

export function toCabReq(f: CabForm, women: boolean): CabTripReq {
  return {
    tripType: f.tripType, pickupId: f.pickup!.id, dropId: f.tripType === 'RENTAL' ? null : f.drop?.id ?? null, when: f.when,
    pickupAt: f.when === 'LATER' && f.pickupAt ? f.pickupAt.toISOString() : null,
    roundTrip: f.tripType === 'OUTSTATION' && f.roundTrip, returnAt: f.tripType === 'OUTSTATION' && f.roundTrip && f.returnAt ? f.returnAt.toISOString() : null,
    rentalPackage: f.tripType === 'RENTAL' ? f.rentalPackage : null, women,
  };
}

/** CAB·01 - search: trip type, pickup / drop, ride now or schedule, round trip, rental package, women safety ride. */
export function CabSearchScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const [f, setF] = useState<CabForm & { pickup: CabPlace | null; drop: CabPlace | null }>({
    tripType: route.params?.tripType ?? 'CITY', pickup: null, drop: null, when: 'NOW', pickupAt: null, roundTrip: false, returnAt: null, rentalPackage: '2H20',
  });
  const [women, setWomen] = useState(prefs.womenMode);
  const [sheet, setSheet] = useState<'pickup' | 'drop' | 'time' | 'return' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const errors = validateCabForm(f);
  // show a field's error once it has a value (instant feedback) or after the user tried to search
  const err = (k: keyof typeof errors, filled: boolean) => (submitted || filled ? errors[k] : undefined);
  const minPickup = useMemo(() => earliestPickup(f.tripType), [f.tripType, sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  const returnMin = useMemo(() => dayjs(f.when === 'LATER' && f.pickupAt ? f.pickupAt : new Date()).add(3, 'hour').startOf('hour').toDate(), [f.when, f.pickupAt]);

  const search = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    navigation.navigate('CabOptions', { req: toCabReq(f, women) });
  };
  const switchType = (t: TripType) => set({ tripType: t, pickupAt: f.pickupAt && f.pickupAt < earliestPickup(t) ? null : f.pickupAt });

  const rows = [{ icon: 'pin' as const, label: 'Pickup', value: f.pickup ? `${f.pickup.name}, ${f.pickup.city}` : 'Choose pickup point', onPress: () => setSheet('pickup') }];
  if (f.tripType !== 'RENTAL') rows.push({ icon: 'pin' as const, label: f.tripType === 'OUTSTATION' ? 'Destination city' : 'Drop', value: f.drop ? `${f.drop.name}, ${f.drop.city}` : 'Where to?', onPress: () => setSheet('drop') });

  return (
    <Screen title="Cabs" footer={<Button title={women ? 'Search women safety rides' : 'Search cabs'} icon="search" onPress={search} />}>
      <Txt v="title" color={c.brand}>Cab</Txt>
      <Txt muted>Verified drivers · live tracking · SOS on every ride</Txt>
      <Tabs value={f.tripType} onChange={switchType} items={TRIP_TABS.map((t) => ({ value: t.value, label: t.label, icon: TAB_ICON[t.value] }))} />
      <Txt v="small" muted>{TRIP_TABS.find((t) => t.value === f.tripType)?.hint}</Txt>

      <SearchCard rows={rows} onSwap={f.tripType !== 'RENTAL' && f.pickup && f.drop ? () => set({ pickup: f.drop, drop: f.pickup }) : undefined} />
      {!!err('pickup', !!f.pickup) && <Txt v="xs" color={c.danger}>{errors.pickup}</Txt>}
      {!!err('drop', !!f.drop) && <Txt v="xs" color={c.danger}>{errors.drop}</Txt>}
      {f.tripType === 'AIRPORT' && !f.pickup?.airport && !f.drop?.airport && <Txt v="xs" muted>Tip: search "airport" for pickup or drop.</Txt>}

      {f.tripType === 'OUTSTATION' && (
        <Tabs value={f.roundTrip ? 'R' : 'O'} onChange={(v) => set({ roundTrip: v === 'R' })} items={[{ value: 'O', label: 'One way' }, { value: 'R', label: 'Round trip' }]} />
      )}

      <Section title="When" />
      <Row gap={6}>
        <Chip label="Ride now" icon="zap" on={f.when === 'NOW'} onPress={() => set({ when: 'NOW' })} />
        <Chip label="Schedule" icon="cal" on={f.when === 'LATER'} onPress={() => { set({ when: 'LATER' }); if (!f.pickupAt) setSheet('time'); }} />
      </Row>
      {f.when === 'LATER' && (
        <Card onPress={() => setSheet('time')}>
          <Row><Icon name="clock" color={c.brand} /><View style={{ flex: 1 }}><Txt v="xs" muted>Pickup time</Txt><Txt v="h3">{f.pickupAt ? fmt(f.pickupAt) : 'Choose date & time'}</Txt></View><Icon name="chev" color={c.muted} /></Row>
        </Card>
      )}
      {!!err('time', !!f.pickupAt) && <Txt v="xs" color={c.danger}>{errors.time}</Txt>}
      {f.when === 'LATER' && <Txt v="xs" muted>Book {CAB_RULES.laterMinLeadMin[f.tripType] >= 60 ? `${CAB_RULES.laterMinLeadMin[f.tripType] / 60} h` : `${CAB_RULES.laterMinLeadMin[f.tripType]} min`} to {CAB_RULES.maxAdvanceDays[f.tripType]} days ahead · driver details 15 min before pickup</Txt>}

      {f.tripType === 'OUTSTATION' && f.roundTrip && (
        <Card onPress={() => setSheet('return')}>
          <Row><Icon name="refresh" color={c.brand} /><View style={{ flex: 1 }}><Txt v="xs" muted>Return (drop back at pickup)</Txt><Txt v="h3">{f.returnAt ? fmt(f.returnAt) : 'Choose return date & time'}</Txt></View><Icon name="chev" color={c.muted} /></Row>
        </Card>
      )}
      {!!err('return', !!f.returnAt) && <Txt v="xs" color={c.danger}>{errors.return}</Txt>}

      {f.tripType === 'RENTAL' && <>
        <Section title="Package" />
        <ChipGroup value={f.rentalPackage ?? ''} onChange={(v) => set({ rentalPackage: v })} options={RENTAL_PACKAGES} />
        <Txt v="xs" muted>Extra km and time beyond the package are charged at the car's rate, shown on the next screen.</Txt>
        {!!err('package', false) && <Txt v="xs" color={c.danger}>{errors.package}</Txt>}
      </>}

      <Toggle highlight value={women} icon="shield" label="Women safety ride" sub={women ? 'On · women drivers where available, SOS & live sharing' : 'Prefer women drivers, SOS & trip sharing'}
        onChange={(v) => { setWomen(v); prefs.set({ womenMode: v }); }} />
      {f.tripType === 'OUTSTATION' && <Box text="Outstation fares include driver allowance and estimated tolls. Night stay for round trips is covered by the daily allowance." />}

      <PlaceSheet visible={sheet === 'pickup'} onClose={() => setSheet(null)} title="Pickup point" forPickup city={f.drop?.city ?? prefs.city}
        onPick={(p) => set({ pickup: p })} />
      <PlaceSheet visible={sheet === 'drop'} onClose={() => setSheet(null)} title={f.tripType === 'OUTSTATION' ? 'Destination' : 'Drop point'} city={f.pickup?.city ?? prefs.city}
        onPick={(p) => set({ drop: p })} />
      <DateTimeSheet visible={sheet === 'time'} onClose={() => setSheet(null)} title="Pickup time" value={f.pickupAt} min={minPickup}
        maxDays={CAB_RULES.maxAdvanceDays[f.tripType]} onPick={(d) => set({ pickupAt: d, returnAt: f.returnAt && f.returnAt <= d ? null : f.returnAt })} />
      <DateTimeSheet visible={sheet === 'return'} onClose={() => setSheet(null)} title="Return time" value={f.returnAt} min={returnMin}
        maxDays={CAB_RULES.maxRoundTripDays} onPick={(d) => set({ returnAt: d })} />
    </Screen>
  );
}
