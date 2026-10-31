import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Price, Row, Screen, Txt } from '../../components/ui';
import { ConfirmDialog } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useBooking } from '../../store/booking';
import { rupees } from '../../utils/format';
import { toast } from '../../utils/toast';
import { FlightCard } from './FlightList';

/** Screens 52-53 - fare families; the fare is re-priced live when held. A changed fare must be accepted. */
export function FareOptionsScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const { flight, query } = route.params;
  const [key, setKey] = useState(flight.fares[0].key);
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState<{ previousPaise: number; newPaise: number } | null>(null);
  const requireLogin = useRequireLogin();
  const hold = async (acceptedPricePaise?: number) => {
    setBusy(true);
    try {
      const h = await Api.hold({ mode: 'FLIGHT', fareKey: key, acceptedPricePaise, adults: query.adults, children: query.children, infants: query.infants });
      useBooking.getState().setHold(h);
      useBooking.getState().setDetails({ extras: { international: flight.international, fareKey: key, paxCounts: { adults: query.adults, children: query.children, infants: query.infants } } });
      requireLogin(() => navigation.navigate('FlightTravellers'));
    } catch (e: any) {
      if (e.code === 'FARE_CHANGED') setChanged(e.details); else toast(e.message, 'error');
    } finally { setBusy(false); }
  };
  return (
    <Screen title="Choose fare" footer={<Button title="Continue" loading={busy} onPress={() => hold()} />}>
      <FlightCard f={flight} />
      {flight.fares.map((f: any) => {
        const on = f.key === key;
        return (
          <Pressable key={f.key} onPress={() => setKey(f.key)} style={{ borderWidth: 1.5, borderColor: on ? c.brand : c.border, backgroundColor: on ? c.dangerBg : c.surface, borderRadius: 14, padding: 12, marginVertical: 6 }}>
            <Row><View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: on ? 6 : 2, borderColor: on ? c.brand : c.border }} />
              <Txt v="h3" style={{ flex: 1 }}>{f.name}</Txt><Price paise={f.pricePaise} /></Row>
            <Row gap={6} style={{ marginTop: 6 }}><Icon name="bag" size={12} color={c.muted} /><Txt v="xs" muted>Cabin {f.cabinBagKg} kg · Check-in {f.checkinBagKg} kg{f.seatIncluded ? ' · free seat' : ''}{f.mealIncluded ? ' · meal' : ''}</Txt></Row>
            <Row gap={6}><Icon name="refresh" size={12} color={c.muted} /><Txt v="xs" muted>Cancel {f.cancelFeePaise ? rupees(f.cancelFeePaise) : 'free'} · change {f.changeFeePaise ? rupees(f.changeFeePaise) : 'free'}</Txt></Row>
          </Pressable>
        );
      })}
      <ConfirmDialog visible={!!changed} icon="alert" title="The fare just changed" text={changed ? `Airlines update prices fast. ${rupees(changed.previousPaise)} → ${rupees(changed.newPaise)}` : ''}
        confirm="Accept new fare" cancel="Go back to flights" onConfirm={() => { const n = changed!.newPaise; setChanged(null); hold(n); }} onCancel={() => { setChanged(null); navigation.goBack(); }} />
    </Screen>
  );
}
