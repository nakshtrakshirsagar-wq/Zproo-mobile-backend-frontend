import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Api, BusTrip } from '../../api/endpoints';
import { Box, ErrorView, Loading } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useBusUi } from '../../components/BusResult';
import { SeatMap, toSeatMapDecks } from '../../components/SeatMap';
import { BookingSteps } from '../../components/BookingSteps';
import { type, ui as uiFont } from '../../theme/typography';
import { duration, rupees, time24 } from '../../utils/format';
import { toast } from '../../utils/toast';

const PRIMARY = '#E11D2E';

/**
 * Seat booking page (opened with "Select" on a bus). The seat drawing itself lives in components/SeatMap and is
 * reused as-is; this screen only loads the seats, keeps the selection and shows the "Select boarding and dropping points" button.
 */
export function SeatLayoutScreen({ navigation, route }: any) {
  const ui = useBusUi();
  const insets = useSafeAreaInsets();
  const { trip, women } = route.params as { trip: BusTrip; women: boolean };
  const q = useQuery({ queryKey: ['seats', trip.id, women], queryFn: () => Api.busSeats(trip.id, women), refetchInterval: 30000 });
  const [sel, setSel] = useState<string[]>([]);
  const seats = q.data?.seats;
  const maxSeats = q.data?.maxSeats ?? 6;
  const decks = useMemo(() => toSeatMapDecks(seats ?? []), [seats]);
  const priceOf = useMemo(() => new Map((seats ?? []).map((s) => [s.id, s.farePaise] as const)), [seats]);
  const total = sel.reduce((a, id) => a + (priceOf.get(id) ?? 0), 0);

  // a seat that got booked by someone else while this page was open is dropped from the selection
  useEffect(() => {
    if (!seats) return;
    const free = new Set(seats.filter((s) => s.status === 'AVAILABLE').map((s) => s.id));
    setSel((cur) => (cur.every((id) => free.has(id)) ? cur : cur.filter((id) => free.has(id))));
  }, [seats]);

  const onToggle = useCallback((seat: { number: string }) => {
    if (sel.includes(seat.number)) return setSel(sel.filter((x) => x !== seat.number));
    if (sel.length >= maxSeats) return toast(`You can select up to ${maxSeats} seats`, 'error');
    setSel([...sel, seat.number]);
  }, [sel, maxSeats]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ui.page }} edges={['top']}>
      {/* header: back + title + bus summary */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} color={ui.ink} />
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...type('header', 24), color: ui.ink, lineHeight: 28, letterSpacing: -0.2 }}>Select Seats</Text>
          <Text numberOfLines={1} style={{ ...type('listTitle'), color: ui.ink }}>{trip.operator}</Text>
          <Text numberOfLines={1} style={{ ...type('label', 13), color: ui.muted }}>{trip.busType} · {time24(trip.departAt)} → {time24(trip.arriveAt)} · {duration(trip.durationMin)}</Text>
        </View>
      </View>

      <BookingSteps current={0} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
        {q.isLoading ? <Loading text="Loading seat map…" /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : (
          <>
            <SeatMap decks={decks} selected={sel} onToggle={onToggle} />
            <Box text={`Select up to ${maxSeats} seats. Selected seats are held for 10 minutes once you continue.`} />
            {women && <Box kind="success" icon="shield" text="Seats marked with the woman icon are reserved for women." />}
          </>
        )}
      </ScrollView>

      {/* footer: selection summary + the next step (only when something is selected, like the prototype) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: ui.surface, borderTopWidth: 1, borderTopColor: ui.line }}>
        {sel.length > 0 ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text numberOfLines={2} style={{ ...type('label', 13), flex: 1, color: ui.muted }}>Selected: <Text style={{ ...uiFont('medium'), color: ui.ink }}>{sel.join(', ')}</Text></Text>
              <Text style={{ ...type('subHeader', 18), color: ui.ink }}>{rupees(total)}</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('BoardingDropping', { trip, seatIds: sel, women, totalPaise: total })} accessibilityRole="button"
              style={({ pressed }) => ({ marginTop: 12, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', backgroundColor: pressed ? '#B9111F' : PRIMARY })}>
              <Text style={{ ...type('button'), color: '#fff' }}>Select boarding and dropping points</Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ ...type('label', 13), color: ui.muted, textAlign: 'center', paddingVertical: 6 }}>Tap an available seat to select it</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
