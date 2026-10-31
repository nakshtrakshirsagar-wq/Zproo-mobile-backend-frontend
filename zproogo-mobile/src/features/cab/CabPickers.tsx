import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Geolocation from '@react-native-community/geolocation';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Button, Chip, Row, Sheet, Txt } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { Api, CabPlace } from '../../api/endpoints';
import { toast } from '../../utils/toast';

/** Search places (pickup / drop) with "use current location". Unserviceable pickups are shown but not selectable. */
export function PlaceSheet({ visible, onClose, title, city, forPickup, onPick }: {
  visible: boolean; onClose: () => void; title: string; city?: string; forPickup?: boolean; onPick: (p: CabPlace) => void;
}) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [locating, setLocating] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const res = useQuery({ queryKey: ['cabplaces', debounced, city], queryFn: () => Api.cabPlaces(debounced, city), enabled: visible, staleTime: 300_000 });

  const pick = (p: CabPlace) => {
    if (forPickup && !p.serviceable) return toast(`Cabs are not available in ${p.city} yet`, 'error');
    onPick(p); setQ(''); onClose();
  };
  const useGps = async () => {
    setLocating(true);
    try {
      if (Platform.OS === 'android') {
        const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (r !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Allow location access to use your current location');
      }
      const pos = await new Promise<{ lat: number; lng: number }>((ok, fail) =>
        Geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), () => fail(new Error('Could not get your location. Turn on GPS and try again.')),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }));
      pick(await Api.cabNearest(pos.lat, pos.lng));
    } catch (e: any) { toast(e.message, 'error'); } finally { setLocating(false); }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={[st.search, { borderColor: c.border, backgroundColor: c.surface }]}>
        <Icon name="search" size={15} color={c.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search area, landmark, airport" placeholderTextColor={c.muted} style={{ flex: 1, color: c.text, padding: 0 }}
          autoFocus maxLength={60} accessibilityLabel="Search places" />
        {!!q && <Pressable onPress={() => setQ('')} accessibilityLabel="Clear"><Icon name="x" size={14} color={c.muted} /></Pressable>}
      </View>
      {forPickup && (
        <Pressable onPress={useGps} disabled={locating} style={[st.item, { borderBottomColor: c.border }]} accessibilityRole="button">
          <Row>{locating ? <ActivityIndicator color={c.brand} /> : <Icon name="target" color={c.brand} />}
            <View style={{ flex: 1 }}><Txt v="h3" color={c.brand}>Use current location</Txt><Txt v="xs" muted>Nearest pickup point to you</Txt></View></Row>
        </Pressable>
      )}
      {res.isLoading ? <ActivityIndicator color={c.brand} style={{ marginTop: 20 }} /> : (res.data ?? []).map((p) => {
        const off = forPickup && !p.serviceable;
        return (
          <Pressable key={p.id} onPress={() => pick(p)} style={[st.item, { borderBottomColor: c.border, opacity: off ? 0.5 : 1 }]} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.city}`}>
            <Row>
              <View style={[st.ic, { backgroundColor: c.chip }]}><Icon name={p.airport ? 'plane' : 'pin'} size={15} color={c.brand} /></View>
              <View style={{ flex: 1 }}><Txt v="h3">{p.name}</Txt><Txt v="xs" muted>{p.area} · {p.city}</Txt></View>
              {p.airport && <Badge text="Airport" kind="info" />}
              {off && <Badge text="Not serviceable" />}
            </Row>
          </Pressable>
        );
      })}
      {!res.isLoading && !res.data?.length && <Txt muted center style={{ marginTop: 16 }}>No matching places. Try another name.</Txt>}
    </Sheet>
  );
}

const SLOT_GROUPS = [{ label: 'Night', from: 0, to: 6 }, { label: 'Morning', from: 6, to: 12 }, { label: 'Afternoon', from: 12, to: 17 }, { label: 'Evening', from: 17, to: 24 }];

/** Date strip + 15-minute time slots. Only times between `min` and `min + maxDays` can be chosen. */
export function DateTimeSheet({ visible, onClose, title, value, min, maxDays, onPick }: {
  visible: boolean; onClose: () => void; title: string; value: Date | null; min: Date; maxDays: number; onPick: (d: Date) => void;
}) {
  const { c } = useTheme();
  const max = useMemo(() => dayjs(min).add(maxDays, 'day'), [min, maxDays]);
  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = dayjs(min).startOf('day'); !d.isAfter(max, 'day'); d = d.add(1, 'day')) out.push(d.format('YYYY-MM-DD'));
    return out;
  }, [min, max]);
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    const v = value && !dayjs(value).isBefore(min) ? dayjs(value) : null;
    setDay(v ? v.format('YYYY-MM-DD') : days[0]);
    setSlot(v ? v.format('HH:mm') : null);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const slots = useMemo(() => Array.from({ length: 96 }, (_, i) => dayjs(`${day}T00:00`).add(i * 15, 'minute'))
    .filter((t) => !t.isBefore(min) && !t.isAfter(max)), [day, min, max]);
  const chosen = slot ? dayjs(`${day}T${slot}`) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 6 }}>
        {days.map((d) => {
          const on = d === day;
          return (
            <Pressable key={d} onPress={() => { setDay(d); setSlot(null); }} style={[st.day, { backgroundColor: on ? c.brand : c.surface, borderColor: on ? c.brand : c.border }]}
              accessibilityState={{ selected: on }}>
              <Txt v="xs" color={on ? '#fff' : c.muted}>{dayjs(d).isSame(dayjs(), 'day') ? 'Today' : dayjs(d).isSame(dayjs().add(1, 'day'), 'day') ? 'Tmrw' : dayjs(d).format('ddd')}</Txt>
              <Txt v="h3" color={on ? '#fff' : c.text}>{dayjs(d).format('D')}</Txt>
              <Txt v="xs" color={on ? '#fff' : c.muted}>{dayjs(d).format('MMM')}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      {SLOT_GROUPS.map((g) => {
        const list = slots.filter((t) => t.hour() >= g.from && t.hour() < g.to);
        if (!list.length) return null;
        return (
          <View key={g.label} style={{ marginTop: 8 }}>
            <Txt v="small" muted>{g.label}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {list.map((t) => <Chip key={t.format('HH:mm')} label={t.format('hh:mm A')} on={slot === t.format('HH:mm')} onPress={() => setSlot(t.format('HH:mm'))} />)}
            </View>
          </View>
        );
      })}
      {!slots.length && <Txt muted center style={{ marginVertical: 16 }}>No times left on this day. Pick another date.</Txt>}
      <Button title={chosen ? `Confirm · ${chosen.format('ddd, D MMM · hh:mm A')}` : 'Choose a time'} disabled={!chosen} style={{ marginTop: 14 }}
        onPress={() => { if (chosen) { onPick(chosen.toDate()); onClose(); } }} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 6 },
  item: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  ic: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  day: { width: 56, alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingVertical: 6 },
});
