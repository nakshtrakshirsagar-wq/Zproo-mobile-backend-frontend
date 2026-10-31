import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, Chip, ChipGroup, Counter, ErrorView, Field, Loading, PriceRow, Row, Screen, Section, Sheet, Stepper, Txt } from '../../components/ui';
import { CalendarSheet, PickerSheet } from '../../components/widgets';
import { Icon, IconName } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { useAuth } from '../../store/auth';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { ymd } from '../../utils/format';
import { toast } from '../../utils/toast';
import { cleanName, collapseSpaces } from '../../utils/validation';
import {
  GOODS_TYPES, PARCEL_AREAS, PARCEL_RULES, PAY_METHODS, PROHIBITED, VEHICLES, WEIGHTS, VehicleId, applyCoupon, cleanAddressLine, cleanNote, cleanOtherGoods,
  cleanParcelMobile, cleanRupees, computeBreakup, isPrepaid, kmBetween, placeOf, scheduleSlots, tripFarePaise, validateContact, validateGoods, validatePayment,
  validateReceiverMobile, validateRoute, validateSchedule, vehicleOf, weightOf,
} from './parcelRules';
import { quoteRoute } from './parcelService';
import { toPoint, useParcelDraft, useParcelStore } from './parcelStore';

export const PARCEL_STEPS = ['Route', 'Vehicle', 'Goods', 'Pay'];
const rs = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN');
const VEH_ICON: Record<VehicleId, IconName> = { TWO_WHEELER: 'bike', THREE_WHEELER: 'truck', MINI_TRUCK: 'truck', PICKUP: 'truck' };
const mobileOf = (m?: string | null) => (m ?? '').replace('+91', '').replace(/\D/g, '').slice(-10);

function CheckRow({ on, onPress, label, error }: { on: boolean; onPress: () => void; label: string; error?: string }) {
  const { c } = useTheme();
  return (
    <View>
      <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: error ? c.danger : on ? c.brand : c.border, backgroundColor: on ? c.brand : c.surface, alignItems: 'center', justifyContent: 'center' }}>
          {on && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
        </View>
        <Txt v="small" style={{ flex: 1 }}>{label}</Txt>
      </Pressable>
      {!!error && <Txt v="xs" color={c.danger}>{error}</Txt>}
    </View>
  );
}

/** Guards a step: if the earlier steps are missing (app restarted / deep link) go back to the start. */
function useGuard(ok: boolean, navigation: any) {
  useEffect(() => { if (!ok) navigation.replace('ParcelHome'); }, [ok]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ============================================================ P1 · Send a parcel
export function ParcelHomeScreen({ navigation }: any) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const d = useParcelDraft();
  const [pick, setPick] = useState<'date' | 'time' | 'rules' | null>(null);
  const [tried, setTried] = useState(false);

  // pickup defaults to the user's details + a starting area; they can edit it
  useEffect(() => {
    if (!d.pickup.place) d.setPickup({ place: placeOf(PARCEL_AREAS[0]), name: d.pickup.name || (user?.name ?? '').replace(/[^A-Za-z .'-]/g, '').trim(), mobile: d.pickup.mobile || mobileOf(user?.mobile) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pErr = d.pickup.place ? validateContact(d.pickup, 'Sender') : {};
  const sErr = d.when === 'LATER' ? validateSchedule(d.date, d.slot) : '';
  const go = () => {
    setTried(true);
    if (Object.keys(pErr).length) { toast('Complete the pickup details first', 'error'); return navigation.navigate('ParcelPickup'); }
    if (sErr) return;
    const dropOk = !!d.drop.place && !Object.keys(validateContact(d.iAmReceiver ? { ...d.drop, name: d.pickup.name, mobile: d.pickup.mobile } : d.drop, 'Receiver')).length;
    navigation.navigate(dropOk ? 'ParcelVehicle' : 'ParcelDrop');
  };
  const slots = scheduleSlots(d.date);

  return (
    <Screen title="Parcel" right={<Pressable onPress={() => navigation.navigate('ParcelOrders')} accessibilityLabel="My orders"><Badge text="My orders" kind="info" /></Pressable>}
      footer={<Button title={d.drop.place ? 'Continue' : 'Set drop location'} icon="pin" onPress={go} />}>
      <Txt v="title" color={c.brand}>Parcel</Txt>
      <Txt v="small" muted>Same-city delivery · live tracked · OTP secured</Txt>

      <Card style={{ marginTop: 12 }}>
        <Pressable onPress={() => navigation.navigate('ParcelPickup')} accessibilityLabel="Edit pickup">
          <Row>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.success }} />
            <View style={{ flex: 1 }}>
              <Txt v="xs" muted>Pickup · {d.pickup.name || 'Add sender'}{d.pickup.mobile ? ` · ${d.pickup.mobile}` : ''}</Txt>
              <Txt v="h3" numberOfLines={1}>{d.pickup.place ? `${d.pickup.place.areaName}, Pune ${d.pickup.place.pin}` : 'Select pickup'}</Txt>
            </View>
            <Txt v="small" color={c.brand} bold>Edit</Txt>
          </Row>
        </Pressable>
        {tried && Object.keys(pErr).length > 0 && <Txt v="xs" color={c.danger} style={{ marginTop: 4 }}>{pErr.house ?? pErr.name ?? pErr.mobile}</Txt>}
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
        <Pressable onPress={() => navigation.navigate('ParcelDrop')} accessibilityLabel="Set drop">
          <Row>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.brand }} />
            <View style={{ flex: 1 }}>
              <Txt v="xs" muted>Drop{d.drop.name ? ` · ${d.drop.name}` : ''}</Txt>
              <Txt v="h3" numberOfLines={1}>{d.drop.place ? `${d.drop.house ? d.drop.house + ', ' : ''}${d.drop.place.areaName}` : 'Where should it go?'}</Txt>
            </View>
            <Icon name="chev" color={c.muted} />
          </Row>
        </Pressable>
      </Card>

      <Row gap={8} style={{ marginVertical: 6 }}>
        {([['NOW', 'Send now'], ['LATER', 'Schedule']] as const).map(([v, l]) => (
          <Pressable key={v} onPress={() => d.set({ when: v })} accessibilityState={{ selected: d.when === v }}
            style={{ flex: 1, padding: 11, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', borderColor: d.when === v ? c.brand : c.border, backgroundColor: d.when === v ? c.dangerBg : c.surface }}>
            <Txt v="h3" color={d.when === v ? c.brand : c.text}>{l}</Txt>
          </Pressable>
        ))}
      </Row>
      {d.when === 'LATER' && (
        <Card>
          <Row gap={8}>
            <Pressable style={{ flex: 1 }} onPress={() => setPick('date')}><Txt v="xs" muted>Pickup date</Txt><Txt v="h3">{d.date ? dayjs(d.date).format('ddd, D MMM') : 'Select date'}</Txt></Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => (d.date ? setPick('time') : toast('Select the pickup date first', 'error'))}><Txt v="xs" muted>Pickup time</Txt><Txt v="h3">{d.slot ? dayjs(`${d.date} ${d.slot}`).format('hh:mm A') : 'Select time'}</Txt></Pressable>
          </Row>
          {tried && !!sErr && <Txt v="xs" color={c.danger} style={{ marginTop: 6 }}>{sErr}</Txt>}
          <Txt v="xs" muted style={{ marginTop: 6 }}>Driver is assigned 30 minutes before pickup. Up to {PARCEL_RULES.SCHEDULE_MAX_DAYS} days ahead.</Txt>
        </Card>
      )}

      <Section title="Pick by load" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {VEHICLES.map((v) => {
          const on = d.vehicle === v.id;
          return (
            <Pressable key={v.id} onPress={() => d.set({ vehicle: on ? '' : v.id })} accessibilityState={{ selected: on }}
              style={{ width: '48%', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: on ? c.brand : c.border, backgroundColor: on ? c.dangerBg : c.surface }}>
              <Icon name={VEH_ICON[v.id]} size={26} color={c.brand} />
              <Txt v="h3" style={{ marginTop: 4 }}>{v.short}</Txt>
              <Txt v="xs" muted>Up to {v.capacityKg} kg · from {rs(v.basePaise)}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => setPick('rules')} style={{ marginTop: 12 }}>
        <Box text={`Goods covered up to ₹${PARCEL_RULES.BASE_COVER_RUPEES.toLocaleString('en-IN')}. No cash, jewellery, liquids over 5 L or illegal items. See list`} icon="shield" />
      </Pressable>

      <CalendarSheet visible={pick === 'date'} onClose={() => setPick(null)} title="Pickup date" value={d.date || ymd(dayjs())} minDate={ymd(dayjs())}
        onPick={(v) => { if (dayjs(v).isAfter(dayjs().add(PARCEL_RULES.SCHEDULE_MAX_DAYS, 'day'), 'day')) return toast(`Choose a date within ${PARCEL_RULES.SCHEDULE_MAX_DAYS} days`, 'error'); d.set({ date: v, slot: '' }); }} />
      <PickerSheet visible={pick === 'time'} onClose={() => setPick(null)} title="Pickup time" items={slots} label={(s) => dayjs(`2000-01-01 ${s}`).format('hh:mm A')} onPick={(s) => d.set({ slot: s })} />
      <Sheet visible={pick === 'rules'} onClose={() => setPick(null)} title="What you cannot send">
        {PROHIBITED.map((p) => <Row key={p} style={{ paddingVertical: 7 }}><Icon name="x" size={14} color={c.danger} /><Txt style={{ flex: 1 }}>{p}</Txt></Row>)}
      </Sheet>
    </Screen>
  );
}

// ============================================================ P2 · Pickup / Drop location & contact
function PlaceContactScreen({ navigation, kind }: { navigation: any; kind: 'pickup' | 'drop' }) {
  const { c } = useTheme();
  const d = useParcelDraft();
  const saved = useParcelStore((s) => s.saved);
  const save = useParcelStore((s) => s.save);
  const isDrop = kind === 'drop';
  const cur = isDrop ? d.drop : d.pickup;
  const set = isDrop ? d.setDrop : d.setPickup;
  const [pickArea, setPickArea] = useState(false);
  const [saveAs, setSaveAs] = useState<'' | 'Home' | 'Office' | 'Other'>('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const who = isDrop ? 'Receiver' : 'Sender';

  const all = useMemo(() => {
    const e: Record<string, string> = {};
    const x = validateContact(cur, who);
    if (isDrop && d.iAmReceiver) { delete x.name; delete x.mobile; }
    Object.assign(e, x);
    if (isDrop && !d.iAmReceiver && !x.mobile) { const m = validateReceiverMobile(cur.mobile, d.pickup.mobile, d.iAmReceiver); if (m) e.mobile = m; }
    const r = validateRoute(d.pickup.place, d.drop.place);
    const rk = isDrop ? r.drop : r.pickup; if (!cur.place) e.place = isDrop ? 'Select the drop location' : 'Select the pickup location'; else if (rk && d.pickup.place && d.drop.place) e.place = rk;
    return e;
  }, [cur, d.pickup, d.drop, d.iAmReceiver, isDrop, who]);
  const errors: Record<string, string> = {};
  Object.keys(all).forEach((k) => { if (submitted || touched[k] || (k === 'place' && !!cur.place)) errors[k] = all[k]; });

  const km = d.pickup.place && d.drop.place ? kmBetween(d.pickup.place, d.drop.place) : null;
  const toggleSelf = () => {
    const v = !d.iAmReceiver;
    d.set({ iAmReceiver: v });
    d.setDrop(v ? { name: d.pickup.name, mobile: d.pickup.mobile } : { name: '', mobile: '' });
  };
  const confirm = () => {
    setSubmitted(true);
    if (Object.keys(all).length) return toast(Object.values(all)[0], 'error');
    if (saveAs) save({ label: saveAs, place: cur.place!, house: cur.house.trim(), name: cur.name.trim(), mobile: cur.mobile });
    if (isDrop && d.iAmReceiver) d.setDrop({ name: d.pickup.name, mobile: d.pickup.mobile });
    if (!isDrop) { toast('Pickup updated', 'success'); return navigation.goBack(); }
    navigation.navigate('ParcelVehicle');
  };
  const place = cur.place;

  return (
    <Screen title={isDrop ? 'Drop location & contact' : 'Pickup location & contact'} footer={<Button title={isDrop ? 'Confirm drop' : 'Save pickup'} onPress={confirm} />}>
      {isDrop && <Stepper step={0} labels={PARCEL_STEPS} />}
      <Pressable onPress={() => setPickArea(true)} accessibilityLabel="Search area">
        <Card><Row><Icon name="search" color={c.muted} size={16} /><Txt muted style={{ flex: 1 }}>{place ? 'Change area, street or landmark' : 'Search area, street, landmark'}</Txt></Row></Card>
      </Pressable>
      {!!errors.place && <Txt v="xs" color={c.danger}>{errors.place}</Txt>}

      {place && (
        <View style={{ borderRadius: 16, overflow: 'hidden', height: 150, marginVertical: 8 }}>
          <MapView style={{ flex: 1 }} scrollEnabled={false} zoomEnabled={false} region={{ latitude: place.lat, longitude: place.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
            <Marker coordinate={{ latitude: place.lat, longitude: place.lng }} pinColor={isDrop ? '#D90404' : '#2E9E6B'} />
          </MapView>
        </View>
      )}
      {place && (
        <Card><Row><Icon name="pin" color={c.brand} /><View style={{ flex: 1 }}>
          <Txt v="h3">{place.areaName}</Txt><Txt v="xs" muted>Pune {place.pin}{isDrop && km != null ? ` · ${km} km away` : ''}</Txt></View></Row></Card>
      )}

      {saved.length > 0 && <>
        <Txt v="xs" muted style={{ marginTop: 6 }}>Saved addresses</Txt>
        <Row gap={6} style={{ flexWrap: 'wrap', marginVertical: 4 }}>
          {saved.map((a, i) => <Chip key={a.label + i} icon="pin" label={a.label + ' · ' + a.place.areaName} onPress={() => set({ place: a.place, house: a.house, ...(isDrop && d.iAmReceiver ? {} : { name: a.name, mobile: a.mobile }) })} />)}
        </Row>
      </>}

      <Field label="House / flat / floor" value={cur.house} onChangeText={(t) => set({ house: cleanAddressLine(t) })} onBlur={() => touch('house')} error={errors.house} maxLength={PARCEL_RULES.HOUSE_MAX} autoCorrect={false} />
      {isDrop && <CheckRow on={d.iAmReceiver} onPress={toggleSelf} label="I am the receiver" />}
      <Row gap={8} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><Field label={`${who} name`} value={cur.name} editable={!(isDrop && d.iAmReceiver)} onChangeText={(t) => set({ name: cleanName(t) })} onBlur={() => touch('name')} error={errors.name} autoCapitalize="words" autoCorrect={false} /></View>
        <View style={{ flex: 1 }}><Field label={`${who} mobile`} value={cur.mobile} editable={!(isDrop && d.iAmReceiver)} onChangeText={(t) => set({ mobile: cleanParcelMobile(t) })} onBlur={() => touch('mobile')} error={errors.mobile} keyboardType="number-pad" maxLength={PARCEL_RULES.MOBILE_LEN} /></View>
      </Row>
      <Txt v="xs" muted>Mobile starts with 7, 8 or 9 and has 10 digits. {isDrop ? 'The receiver gets the drop OTP by SMS.' : 'The driver calls this number at pickup.'}</Txt>

      <Section title="Save as" />
      <Row gap={8}>
        {(['Home', 'Office', 'Other'] as const).map((l) => <Chip key={l} label={l} on={saveAs === l} onPress={() => setSaveAs(saveAs === l ? '' : l)} />)}
      </Row>

      <PickerSheet visible={pickArea} onClose={() => setPickArea(false)} title={isDrop ? 'Drop area' : 'Pickup area'} items={PARCEL_AREAS} label={(a) => a.name} sub={(a) => `Pune ${a.pin}`} onPick={(a) => set({ place: placeOf(a) })} />
    </Screen>
  );
}
export const ParcelPickupScreen = ({ navigation }: any) => <PlaceContactScreen navigation={navigation} kind="pickup" />;
export const ParcelDropScreen = ({ navigation }: any) => <PlaceContactScreen navigation={navigation} kind="drop" />;

// ============================================================ P3 · Choose vehicle
export function ParcelVehicleScreen({ navigation }: any) {
  const { c } = useTheme();
  const d = useParcelDraft();
  const ok = !!d.pickup.place && !!d.drop.place;
  useGuard(ok, navigation);
  const q = useQuery({ queryKey: ['parcelQuote', d.pickup.place?.areaId, d.drop.place?.areaId], enabled: ok, retry: false,
    queryFn: () => quoteRoute(d.pickup.place!, d.drop.place!) });
  if (!ok) return <Screen title="Choose a vehicle"><Loading /></Screen>;
  const km = q.data?.km ?? 0;
  const sel = d.vehicle ? vehicleOf(d.vehicle) : null;
  return (
    <Screen title="Choose a vehicle" footer={<Row style={{ justifyContent: 'space-between' }}>
      <View><Txt v="xs" muted>{sel?.short ?? 'Select a vehicle'}</Txt><Txt v="h1" color={c.success}>{sel && q.data ? rs(tripFarePaise(sel, km)) : '—'}</Txt></View>
      <Button title="Proceed" disabled={!sel || !q.data} onPress={() => navigation.navigate('ParcelGoods')} style={{ width: 170 }} />
    </Row>}>
      <Stepper step={1} labels={PARCEL_STEPS} />
      <Card><Row>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.success }} /><Txt v="h3" numberOfLines={1} style={{ flex: 1 }}>{d.pickup.place!.areaName}</Txt>
        <Icon name="chev" size={14} color={c.muted} />
        <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.brand }} /><Txt v="h3" numberOfLines={1} style={{ flex: 1 }}>{d.drop.place!.areaName}</Txt>
        {!!q.data && <Txt v="xs" muted>{km} km</Txt>}
      </Row></Card>
      {q.isLoading ? <Loading text="Finding vehicles near you…" /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : <>
        {VEHICLES.map((v) => {
          const on = d.vehicle === v.id;
          return (
            <Pressable key={v.id} onPress={() => d.set({ vehicle: v.id })} accessibilityState={{ selected: on }}
              style={{ padding: 12, borderRadius: 14, borderWidth: 1.5, marginVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: on ? c.brand : c.border, backgroundColor: on ? c.dangerBg : c.surface }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name={VEH_ICON[v.id]} color={c.brand} /></View>
              <View style={{ flex: 1 }}>
                <Txt v="h3">{v.label}</Txt>
                <Txt v="xs" muted>{v.capacityKg} kg · {v.dims}</Txt>
                <Txt v="xs" color={c.success} bold>Pickup in {v.etaMin} min</Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}><Txt v="h2" color={c.success}>{rs(tripFarePaise(v, km))}</Txt><Txt v="xs" muted>{v.tag}</Txt></View>
            </Pressable>
          );
        })}
        <Box kind="warn" icon="info" text={`Fare includes ${PARCEL_RULES.FREE_LOADING_MIN} min free loading. Waiting after that is ₹${PARCEL_RULES.WAIT_PER_MIN_PAISE / 100}/min. Tolls and parking extra.`} />
      </>}
    </Screen>
  );
}

// ============================================================ P4 · What are you sending
export function ParcelGoodsScreen({ navigation }: any) {
  const { c } = useTheme();
  const d = useParcelDraft();
  const ok = !!d.pickup.place && !!d.drop.place && !!d.vehicle;
  useGuard(ok, navigation);
  const [submitted, setSubmitted] = useState(false);
  if (!ok) return <Screen title="What are you sending?"><Loading /></Screen>;
  const v = vehicleOf(d.vehicle as VehicleId);
  const g = d.goods;
  const errors = validateGoods(g, v.id);
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : undefined);
  const weightTooBig = !!g.weightId && weightOf(g.weightId).maxKg > v.capacityKg;
  const next = () => {
    setSubmitted(true);
    const first = Object.values(errors)[0];
    if (first) return toast(first, 'error');
    navigation.navigate('ParcelReview');
  };
  return (
    <Screen title="What are you sending?" footer={<Button title="Review order" onPress={next} />}>
      <Stepper step={2} labels={PARCEL_STEPS} />
      <Txt v="h3">Goods type</Txt>
      <ChipGroup value={g.type} onChange={(t) => d.setGoods({ type: t })} options={GOODS_TYPES.map((t) => ({ value: t, label: t }))} />
      {!!show('type') && <Txt v="xs" color={c.danger}>{show('type')}</Txt>}
      {g.type === 'Other' && <Field label="What are you sending?" value={g.other} onChangeText={(t) => d.setGoods({ other: cleanOtherGoods(t) })} error={show('other')} maxLength={PARCEL_RULES.OTHER_GOODS_MAX} />}

      <Txt v="h3" style={{ marginTop: 8 }}>Approx. weight</Txt>
      <ChipGroup value={g.weightId} onChange={(w) => d.setGoods({ weightId: w })} options={WEIGHTS.map((w) => ({ value: w.id, label: w.label }))} />
      {(show('weight') || weightTooBig) && <>
        <Txt v="xs" color={c.danger}>{errors.weight}</Txt>
        <Button small variant="outline" title="Change vehicle" icon="truck" onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
      </>}

      <Field label="Approx. value of goods (₹)" value={g.value} onChangeText={(t) => d.setGoods({ value: cleanRupees(t) })} error={show('value')} keyboardType="number-pad" maxLength={PARCEL_RULES.VALUE_MAX_DIGITS} />
      <Txt v="xs" muted>Digits only. Covered up to ₹{PARCEL_RULES.BASE_COVER_RUPEES.toLocaleString('en-IN')}; add Goods protection for up to ₹{PARCEL_RULES.PROTECTION_COVER_RUPEES.toLocaleString('en-IN')}.</Txt>

      <Field label="Note for driver (optional) · e.g. 2 cartons of glassware, keep upright" value={g.note} multiline onChangeText={(t) => d.setGoods({ note: cleanNote(t) })} error={show('note')} maxLength={PARCEL_RULES.NOTE_MAX} />
      <Txt v="xs" muted style={{ textAlign: 'right' }}>{g.note.length}/{PARCEL_RULES.NOTE_MAX}</Txt>

      <Section title="Add-ons" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ flex: 1 }}><Icon name="users" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">Loading helpers</Txt>
            <Txt v="xs" muted>{v.helpersAllowed ? `${rs(PARCEL_RULES.HELPER_PAISE)} per helper · up to 2 floors` : `Not available with a ${v.short}`}</Txt></View></Row>
          {v.helpersAllowed && <Counter value={g.helpers} onChange={(n) => d.setGoods({ helpers: n })} min={0} max={PARCEL_RULES.MAX_HELPERS} />}
        </Row>
        {!!show('helpers') && <Txt v="xs" color={c.danger}>{show('helpers')}</Txt>}
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ flex: 1 }}><Icon name="shield" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">Goods protection</Txt>
            <Txt v="xs" muted>{rs(PARCEL_RULES.PROTECTION_PAISE)} · covers damage up to ₹{PARCEL_RULES.PROTECTION_COVER_RUPEES.toLocaleString('en-IN')}</Txt></View></Row>
          <Pressable onPress={() => d.setGoods({ protection: !g.protection })} accessibilityRole="checkbox" accessibilityState={{ checked: g.protection }}
            style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: g.protection ? c.brand : c.border, backgroundColor: g.protection ? c.brand : c.surface, alignItems: 'center', justifyContent: 'center' }}>
            {g.protection && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
          </Pressable>
        </Row>
      </Card>
      <CheckRow on={g.rulesOk} onPress={() => d.setGoods({ rulesOk: !g.rulesOk })} label="I confirm I am not sending cash, jewellery, liquids over 5 L, hazardous or illegal items" error={show('rules')} />
    </Screen>
  );
}

// ============================================================ P5 · Review & pay
export function ParcelReviewScreen({ navigation }: any) {
  const { c } = useTheme();
  const d = useParcelDraft();
  const user = useAuth((s) => s.user);
  const requireLogin = useRequireLogin();
  const create = useParcelStore((s) => s.create);
  const ok = !!d.pickup.place && !!d.drop.place && !!d.vehicle;
  useGuard(ok, navigation);
  const [couponIn, setCouponIn] = useState('');
  const [couponErr, setCouponErr] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: Api.wallet, enabled: !!user, retry: false });
  if (!ok) return <Screen title="Review & pay"><Loading /></Screen>;

  const v = vehicleOf(d.vehicle as VehicleId);
  const km = kmBetween(d.pickup.place!, d.drop.place!);
  const g = d.goods;
  const b = computeBreakup({ vehicle: v.id, km, helpers: g.helpers, protection: g.protection, coupon: d.coupon });
  const walletPaise = wallet.data?.balancePaise ?? 0;
  const pay = validatePayment(d.payMethod, d.upiId, walletPaise, b.totalPaise);

  const applyIt = () => {
    const r = applyCoupon(couponIn, b.tripPaise);
    setCouponErr(r.error);
    if (!r.error) { d.set({ coupon: r.coupon!.code }); setCouponIn(''); toast(`${r.coupon!.code} applied`, 'success'); }
  };

  const book = () => {
    setSubmitted(true);
    // re-check everything the earlier steps validated, in case the draft was changed
    const all = [validateRoute(d.pickup.place, d.drop.place).drop, ...Object.values(validateContact(d.pickup, 'Sender')),
      ...(d.iAmReceiver ? [] : Object.values(validateContact(d.drop, 'Receiver'))), d.iAmReceiver ? '' : validateReceiverMobile(d.drop.mobile, d.pickup.mobile, d.iAmReceiver),
      ...Object.values(validateGoods(g, v.id)), d.when === 'LATER' ? validateSchedule(d.date, d.slot) : '', pay.method, pay.upi].filter(Boolean) as string[];
    if (all.length) return toast(all[0], 'error');
    requireLogin(async () => {
      setBusy(true);
      try {
        if (isPrepaid(d.payMethod as any)) await new Promise((r) => setTimeout(r, 700)); // payment gateway (mock)
        const o = create({
          pickup: toPoint(d.pickup), drop: toPoint(d.iAmReceiver ? { ...d.drop, name: d.pickup.name, mobile: d.pickup.mobile } : d.drop), vehicle: v.id,
          goods: { type: g.type as any, other: g.type === 'Other' ? collapseSpaces(g.other) : undefined, weightId: g.weightId as any, valueRupees: Number(g.value),
            note: g.note.trim() || undefined, helpers: v.helpersAllowed ? g.helpers : 0, protection: g.protection },
          payMethod: d.payMethod as any, upiId: d.upiId, coupon: b.coupon, scheduledFor: d.when === 'LATER' ? dayjs(`${d.date} ${d.slot}`, 'YYYY-MM-DD HH:mm').valueOf() : undefined,
        });
        d.reset(true);
        navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'ParcelOrder', params: { id: o.id } }] });
      } catch (e: any) { toast(e?.message ?? 'Could not place the order. Try again', 'error'); } finally { setBusy(false); }
    });
  };

  const tag = (t: string) => <View key={t} style={{ backgroundColor: c.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}><Txt v="xs">{t}</Txt></View>;
  return (
    <Screen title="Review & pay" footer={<Button title={`Book ${v.short} · ${rs(b.totalPaise)}`} loading={busy} onPress={book} />}>
      <Stepper step={3} labels={PARCEL_STEPS} />
      <Card>
        <Row style={{ alignItems: 'flex-start' }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.success, marginTop: 4 }} />
          <View style={{ flex: 1 }}><Txt v="h3">{d.pickup.place!.areaName}</Txt><Txt v="xs" muted>{d.pickup.name} · {d.pickup.mobile}</Txt></View></Row>
        <Row style={{ alignItems: 'flex-start', marginTop: 8 }}><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.brand, marginTop: 4 }} />
          <View style={{ flex: 1 }}><Txt v="h3">{d.drop.house}, {d.drop.place!.areaName}</Txt><Txt v="xs" muted>{d.iAmReceiver ? d.pickup.name : d.drop.name} · {d.iAmReceiver ? d.pickup.mobile : d.drop.mobile}</Txt></View></Row>
        <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 10 }}>
          {tag(v.short)}{tag(`${g.type === 'Other' ? g.other : g.type} · ${g.weightId ? weightOf(g.weightId).label : ''}`)}
          {g.helpers > 0 && tag(`${g.helpers} helper${g.helpers > 1 ? 's' : ''}`)}{tag(`${km} km`)}
          {d.when === 'LATER' && tag(dayjs(`${d.date} ${d.slot}`).format('D MMM, hh:mm A'))}
        </Row>
      </Card>

      <Card>
        <PriceRow label={`Trip fare · ${km} km`} paise={b.tripPaise} />
        {b.helperPaise > 0 && <PriceRow label={`Loading helper × ${g.helpers}`} paise={b.helperPaise} />}
        {b.protectionPaise > 0 && <PriceRow label="Goods protection" paise={b.protectionPaise} />}
        {b.discountPaise > 0 && <PriceRow label={`Coupon ${b.coupon}`} paise={b.discountPaise} minus />}
        <PriceRow label="Total incl. GST" paise={b.totalPaise} total />
      </Card>

      {b.coupon ? (
        <Row style={{ justifyContent: 'space-between', marginVertical: 6 }}><Badge kind="success" text={`${b.coupon} applied`} /><Txt v="small" color={c.brand} onPress={() => d.set({ coupon: '' })}>Remove</Txt></Row>
      ) : (
        <Row gap={8} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><Field label="Coupon code" value={couponIn} autoCapitalize="characters" autoCorrect={false} maxLength={30}
            onChangeText={(t) => { setCouponIn(t.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase()); setCouponErr(''); }} error={couponErr} /></View>
          <Button small title="Apply" onPress={applyIt} style={{ marginTop: 14 }} />
        </Row>
      )}

      <Section title="Pay with" />
      {PAY_METHODS.map((m) => {
        const on = d.payMethod === m.id;
        const low = m.id === 'WALLET' && walletPaise < b.totalPaise;
        return (
          <Pressable key={m.id} onPress={() => d.set({ payMethod: m.id })} accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 13, borderWidth: 1.5, marginVertical: 4, borderColor: on ? c.brand : c.border, backgroundColor: c.surface }}>
            <View style={{ flex: 1 }}><Txt v="h3">{m.title}</Txt>
              <Txt v="xs" muted>{m.id === 'WALLET' ? (user ? `Balance ${rs(walletPaise)}${low ? ` · add ${rs(b.totalPaise - walletPaise)} more` : ''}` : 'Log in to use your wallet') : m.sub}</Txt></View>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: on ? 6 : 2, borderColor: on ? c.brand : c.border }} />
          </Pressable>
        );
      })}
      {submitted && !!pay.method && <Txt v="xs" color={c.danger}>{pay.method}</Txt>}
      {d.payMethod === 'UPI' && <Field label="Your UPI ID · e.g. name@okhdfc" value={d.upiId} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={100}
        onChangeText={(t) => d.set({ upiId: t.replace(/\s/g, '') })} error={submitted ? pay.upi : undefined} />}
      {(d.payMethod === 'CASH_PICKUP' || d.payMethod === 'CASH_DROP') && <Box icon="info" text={d.payMethod === 'CASH_PICKUP' ? 'Pay the driver in cash when the parcel is loaded.' : 'The receiver pays the driver in cash on delivery. Keep the exact amount ready.'} />}
      <Txt v="xs" muted style={{ marginTop: 8 }}>Free cancellation until a driver is assigned. After that ₹{PARCEL_RULES.CANCEL_FEE_AFTER_ASSIGN_PAISE / 100} is kept.</Txt>
    </Screen>
  );
}
