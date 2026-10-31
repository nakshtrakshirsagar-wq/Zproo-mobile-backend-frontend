import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Share, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, ChipGroup, Loading, Row, Screen, Section, Stars, Toggle, Txt } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { Config } from '../../config';
import { toast } from '../../utils/toast';

/** Screen 31 - live bus tracking (polls every 15 s). */
export function TrackBusScreen({ route }: any) {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['track', route.params.id], queryFn: () => Api.busTrack(route.params.id), refetchInterval: 15000 });
  const t = q.data;
  return (
    <Screen title="Live tracking" padded={false}>
      {!t ? <Loading /> : <>
        <MapView style={{ height: 300 }} region={{ latitude: t.lat, longitude: t.lng, latitudeDelta: 0.6, longitudeDelta: 0.6 }}>
          <Marker coordinate={{ latitude: t.lat, longitude: t.lng }} title={t.details.operator} />
        </MapView>
        <View style={{ padding: 16 }}>
          <Card><Row><Badge kind={t.status === 'ON_TIME' ? 'success' : 'warn'} text={t.status.replace('_', ' ')} /><View style={{ flex: 1 }} /><Txt v="xs" muted>Updated {new Date(t.updatedAt).toLocaleTimeString()}</Txt></Row>
            <Row style={{ marginTop: 10 }}><View style={{ flex: 1 }}><Txt v="h1">{Math.floor(t.etaMin / 60)}h {t.etaMin % 60}m</Txt><Txt v="small" muted>to {t.details.dropping}</Txt></View>
              <View style={{ alignItems: 'center' }}><Txt v="h2">{t.kmLeft} km</Txt><Txt v="xs" muted>left</Txt></View></Row></Card>
          <Card><Row><Icon name="bus" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">{t.details.operator}</Txt><Txt v="xs" muted>{t.details.vehicleNo}</Txt></View>
            {t.details.conductorPhone && <Button small variant="outline" icon="phone" title="Call" onPress={() => Linking.openURL('tel:' + t.details.conductorPhone.replace(/\s/g, ''))} />}</Row></Card>
        </View>
      </>}
    </Screen>
  );
}

/** Screen 59 - flight status (updated, whiteboard 23). */
export function FlightStatusScreen({ route }: any) {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['fstatus', route.params.id], queryFn: () => Api.flightStatus(route.params.id), refetchInterval: 60000 });
  const s = q.data;
  return (
    <Screen title="Flight status">
      {!s ? <Loading /> : <>
        <Card><Row><Txt v="h3" style={{ flex: 1 }}>{s.details.flightNo} · {s.details.from} → {s.details.to}</Txt><Badge kind={s.delayMin ? 'warn' : 'success'} text={s.status} /></Row>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.chip, marginVertical: 12 }}><View style={{ width: `${s.progressPct}%`, height: 6, borderRadius: 3, backgroundColor: c.brand }} /></View>
          <Row style={{ justifyContent: 'space-between' }}><Txt v="small" muted>Terminal {s.terminal}</Txt><Txt v="small" muted>Gate {s.gate}</Txt></Row></Card>
        <Box text="We'll notify you about delays and gate changes. Web check-in opens 48 hours before departure." icon="bell" />
      </>}
    </Screen>
  );
}

/** Screens 32 / 41 - rate trip (+50 points); women also rate safety separately. */
export function RateTripScreen({ navigation, route }: any) {
  const q = useQuery({ queryKey: ['booking', route.params.id], queryFn: () => Api.booking(route.params.id) });
  const [stars, setStars] = useState(4);
  const [tags, setTags] = useState<string[]>(['On time']);
  const [safety, setSafety] = useState<Record<string, number>>({ 'Felt safe on board': 5, 'Staff behaviour': 4, 'Boarding point safety': 5 });
  const [busy, setBusy] = useState(false);
  const women = q.data?.womenMode;
  return (
    <Screen title="Rate your trip" footer={<Button title="Submit & earn 50 points" loading={busy} onPress={async () => {
      setBusy(true);
      try { const r = await Api.rate(route.params.id, { stars, tags, safety: women ? safety : undefined }); toast(`+${r.pointsEarned} points · total ${r.points}`, 'success'); navigation.goBack(); }
      catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
    }} />}>
      <Txt v="h2" center>{q.data?.details.title}</Txt>
      <Stars value={stars} onChange={setStars} size={34} />
      <ChipGroup multi value={tags} onChange={setTags} options={(q.data?.mode === 'CAB' ? ['On time', 'Clean car', 'Polite driver', 'Safe driving', 'Knew the route', 'AC worked']
        : ['On time', 'Clean', 'Polite staff', 'Comfortable', 'Safe driving']).map((x) => ({ value: x, label: x }))} />
      {women && <>
        <Section title={q.data?.mode === 'CAB' ? 'Rate safety (helps us match women riders)' : 'Rate safety (helps rank buses for women)'} />
        {Object.keys(safety).map((k) => (
          <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 6 }}><Txt v="small">{k}</Txt><Stars value={safety[k]} size={18} onChange={(n) => setSafety({ ...safety, [k]: n })} /></Row>))}
      </>}
    </Screen>
  );
}

/** Screen 40 - travel-day safety kit: SOS (hold 2 s), live location to family, helplines. */
export function SafetyKitScreen({ route }: any) {
  const { c } = useTheme();
  const id = route.params.id;
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => Api.booking(id) });
  const contacts = useQuery({ queryKey: ['contacts'], queryFn: Api.contacts });
  const [sharing, setSharing] = useState(false);
  const watch = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => () => { if (watch.current != null) Geolocation.clearWatch(watch.current); }, []);
  const here = () => new Promise<{ lat: number; lng: number }>((res, rej) =>
    Geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { enableHighAccuracy: true, timeout: 10000 }));

  const sos = async () => {
    setHolding(false);
    try {
      const pos = await here().catch(() => ({ lat: 0, lng: 0 }));
      const r = await Api.sos(id, pos.lat, pos.lng);
      toast(`SOS sent to ${r.notified} contact(s) and Zproogo support`, 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const toggleShare = async (on: boolean) => {
    setSharing(on);
    if (!on) { if (watch.current != null) Geolocation.clearWatch(watch.current); return; }
    try {
      const pos = await here();
      const r = await Api.share(id, pos.lat, pos.lng);
      watch.current = Geolocation.watchPosition((p) => { Api.location(id, p.coords.latitude, p.coords.longitude).catch(() => undefined); }, undefined, { distanceFilter: 200 });
      Share.share({ message: `Track my trip live on Zproogo: ${r.link}` });
    } catch (e: any) { setSharing(false); toast(e?.message ?? 'Location permission needed', 'error'); }
  };
  const d = q.data?.details;
  return (
    <Screen title="Safety kit">
      <Badge kind="success" text={`Trip · ${d?.title ?? ''}`} />
      <Pressable onPressIn={() => { setHolding(true); timer.current = setTimeout(sos, 2000); }} onPressOut={() => { setHolding(false); if (timer.current) clearTimeout(timer.current); }}
        accessibilityLabel="SOS. Press and hold for 2 seconds"
        style={{ alignSelf: 'center', marginVertical: 20, width: 140, height: 140, borderRadius: 70, backgroundColor: holding ? '#9F1239' : '#E11D48', alignItems: 'center', justifyContent: 'center',
          borderWidth: 10, borderColor: 'rgba(225,29,72,0.25)' }}>
        <Txt v="title" color="#fff">SOS</Txt><Txt v="xs" color="#fff">{holding ? 'Keep holding…' : 'Hold 2 sec'}</Txt>
      </Pressable>
      <Txt v="small" muted center>Alerts your emergency contacts with live location + 24×7 Zproogo support</Txt>
      {!contacts.data?.length && <Box kind="warn" text="Add an emergency contact in Account → Emergency contacts so SOS can reach your family." />}
      <Toggle value={sharing} onChange={toggleShare} icon="share" label="Share live location" sub="Family can follow your trip for 24 hours" />
      <Card><Row><Icon name="phone" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">Women helpline {Config.WOMEN_HELPLINE}</Txt><Txt v="xs" muted>Also printed on your ticket</Txt></View>
        <Button small variant="outline" title="Call" onPress={() => Linking.openURL('tel:' + Config.WOMEN_HELPLINE)} /></Row></Card>
      <Card><Row><Icon name="phone" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">Police 112</Txt><Txt v="xs" muted>National emergency number</Txt></View>
        <Button small variant="outline" title="Call" onPress={() => Linking.openURL('tel:112')} /></Row></Card>
      {d && q.data?.mode === 'CAB' ? (d.driver ? <Card><Row><Icon name="car" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">{d.driver.name}</Txt>
        <Txt v="xs" muted>{d.driver.vehicleColor} {d.driver.vehicleModel} · {d.driver.vehicleNo}</Txt></View>
        <Button small variant="outline" title="Call" onPress={() => Linking.openURL('tel:' + d.driver.phone)} /></Row></Card>
        : <Box text="Driver details appear here once a driver is assigned." />)
        : d && <Card><Row><Icon name="bus" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">{d.operator}</Txt><Txt v="xs" muted>Bus {d.vehicleNo} · Conductor {d.conductorPhone}</Txt></View></Row></Card>}
    </Screen>
  );
}
