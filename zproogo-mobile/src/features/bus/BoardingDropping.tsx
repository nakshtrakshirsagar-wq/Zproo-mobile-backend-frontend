import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Api } from '../../api/endpoints';
import { Box, ErrorView, Loading } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useBusUi } from '../../components/BusResult';
import { BoardingPoints } from '../../components/BoardingPoints';
import { BookingSteps } from '../../components/BookingSteps';
import { useAction } from '../../hooks/useApi';
import { useBooking } from '../../store/booking';
import { type, ui as uiFont } from '../../theme/typography';
import { rupees, time24 } from '../../utils/format';

const PRIMARY = '#E11D2E';

/**
 * Step 2 of the bus booking: Board/Drop point (Design 1 - tabs list). The list itself is components/BoardingPoints.
 * "Continue to passenger info" creates the seat hold (guest allowed) and then opens the login gate if needed.
 */
export function BoardingDroppingScreen({ navigation, route }: any) {
  const ui = useBusUi();
  const insets = useSafeAreaInsets();
  const { trip, seatIds, women, totalPaise } = route.params as { trip: any; seatIds: string[]; women: boolean; totalPaise?: number };
  const q = useQuery({ queryKey: ['points', trip.id, women], queryFn: () => Api.busPoints(trip.id, women) });
  const [b, setB] = useState<string>();
  const [d, setD] = useState<string>();
  // nothing is pre-selected: the passenger has to choose (the button stays disabled until both are picked)
  useEffect(() => { setB(undefined); setD(undefined); }, [trip.id]);

  const hold = useAction(() => Api.hold({ mode: 'BUS', tripId: trip.id, seatIds, boardingId: b, droppingId: d, womenMode: women }), {
    onSuccess: (h) => {
      useBooking.getState().setHold(h, women);
      // login gate disabled for now: go straight to the passenger details page
      navigation.navigate('BusPassengers', { trip, boarding: bp, dropping: dp });
    },
  });

  const bp = q.data?.boarding.find((p) => p.id === b), dp = q.data?.dropping.find((p) => p.id === d);
  const ready = !!b && !!d;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ui.page }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={22} color={ui.ink} />
        </Pressable>
        <Text numberOfLines={1} style={{ ...type('header', 24), flex: 1, color: ui.ink, lineHeight: 28, letterSpacing: -0.2 }}>{trip.fromCity} → {trip.toCity}</Text>
      </View>
      <BookingSteps current={1} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ ...type('subHeader', 18), color: ui.ink }}>Select boarding and dropping points</Text>
        {q.isLoading ? <Loading /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : (
          <BoardingPoints boarding={q.data!.boarding} dropping={q.data!.dropping} boardingId={b} droppingId={d} onChangeBoarding={setB} onChangeDropping={setD} women={women} />
        )}
        <Box text="Your seats stay on hold for 10 minutes. Guests log in at the next step." />
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: ui.surface, borderTopWidth: 1, borderTopColor: ui.line }}>
        <Text style={{ ...type('label', 13), color: ui.muted, lineHeight: 19 }}>
          Seats: <Text style={{ ...uiFont('medium'), color: ui.ink }}>{seatIds.join(', ')}</Text>{totalPaise ? <> · Total <Text style={{ ...uiFont('medium'), color: ui.ink }}>{rupees(totalPaise)}</Text></> : null}
          {'\n'}Boarding: <Text style={{ ...uiFont('medium'), color: ui.ink }}>{bp ? `${bp.name} ${time24(bp.time)}` : 'not selected'}</Text>
          {' · '}Dropping: <Text style={{ ...uiFont('medium'), color: ui.ink }}>{dp ? `${dp.name} ${time24(dp.time)}` : 'not selected'}</Text>
        </Text>
        <Pressable disabled={!ready || hold.isPending} onPress={() => hold.mutate()} accessibilityRole="button" accessibilityState={{ disabled: !ready }}
          style={({ pressed }) => ({ marginTop: 12, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: !ready ? '#EAB3B6' : pressed ? '#B9111F' : PRIMARY })}>
          <Text style={{ ...type('button'), color: '#fff' }}>{hold.isPending ? 'Please wait…' : 'Continue to passenger info'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
