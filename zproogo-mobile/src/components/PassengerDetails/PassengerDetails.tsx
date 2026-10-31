import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { useBusUi } from '../BusResult/busResultTheme';
import { DashedLine } from '../DashedLine';
import { Icon } from '../Icon';
import { type } from '../../theme/typography';
import { duration, rupees } from '../../utils/format';
import { ID_TYPES, LIMITS, cleanAge, cleanEmail, cleanIdNumber, cleanMobile, cleanName } from '../../utils/validation';
import { INSURANCE_PER_SEAT_PAISE } from './passengerValidation';
import type { Gender, PassengerErrors, PassengerFormValue, PassTrip } from './types';

const PRIMARY = '#E11D2E', PRIMARY_DARK = '#B9111F', DANGER = '#D92D20', SUCCESS = '#16A34A';
const GENDERS: { v: Gender; label: string }[] = [{ v: 'M', label: 'Male' }, { v: 'F', label: 'Female' }, { v: 'O', label: 'Other' }];

export type PassengerDetailsProps = {
  trip?: PassTrip;
  value: PassengerFormValue;
  onChange: (v: PassengerFormValue) => void;
  /** All current errors (from validatePassengerForm). Shown for a field once it was left, or for every field when `submitted`. */
  errors: PassengerErrors;
  submitted?: boolean;
  /** Seats reserved for women: gender is locked to Female. */
  ladiesSeatIds?: string[];
  /** Operator needs ID proof of the first passenger (hides "Other" too). */
  needsId?: boolean;
  /** Women mode: emergency contact block is shown open. */
  womenMode?: boolean;
  /** Fare shown on the stub (already includes tax and insurance). */
  totalPaise: number;
  /** Gives the screen the native view of each field (key "n0", "a0", "g0", "mobile", ...) so it can scroll to the first error. */
  registerField?: (key: string, node: View | null) => void;
};

// ------------------------------------------------------------------ one underlined field (the "ul" input of the design)
type UlProps = { label: string; error?: string; fieldKey: string; onRegister?: (k: string, node: View | null) => void } & Pick<TextInputProps,
  'value' | 'onChangeText' | 'onBlur' | 'placeholder' | 'keyboardType' | 'maxLength' | 'autoCapitalize' | 'autoCorrect' | 'autoComplete' | 'textContentType' | 'returnKeyType' | 'onSubmitEditing'>;

const UlField = React.forwardRef<TextInput, UlProps>(function UlField({ label, error, fieldKey, onRegister, ...p }, ref) {
  const ui = useBusUi();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 14 }} ref={(r) => onRegister?.(fieldKey, r)} collapsable={false}>
      <Text style={{ ...type('label', 12), lineHeight: 17, color: ui.muted, marginBottom: 2 }}>{label}</Text>
      <TextInput
        ref={ref} {...p} placeholderTextColor="#B9BEC7" accessibilityLabel={label} accessibilityHint={error}
        onFocus={() => setFocus(true)} onBlur={(e) => { setFocus(false); p.onBlur?.(e); }}
        style={{ ...type('input'), color: ui.ink, paddingTop: 8, paddingBottom: 10, paddingHorizontal: 0, borderBottomWidth: 2, borderBottomColor: error ? DANGER : focus ? PRIMARY : '#D5D8DE' }} />
      {!!error && <Text accessibilityLiveRegion="polite" style={{ ...type('label', 12), lineHeight: 17, color: DANGER, marginTop: 5 }}>{error}</Text>}
    </View>
  );
});

// ------------------------------------------------------------------ gender segmented control
function GenderSeg({ value, onChange, error, locked, hideOther, onRegister }: { value: Gender | ''; onChange: (g: Gender) => void; error?: string; locked?: boolean; hideOther?: boolean; onRegister?: (n: View | null) => void }) {
  const ui = useBusUi();
  const opts = hideOther ? GENDERS.filter((g) => g.v !== 'O') : GENDERS;
  return (
    <View style={{ marginBottom: 14 }} ref={onRegister} collapsable={false}>
      <Text style={{ ...type('label', 12), lineHeight: 17, color: ui.muted, marginBottom: 6 }}>Gender</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 12, backgroundColor: ui.isDark ? ui.chipBg : '#ECEEF1',
        borderWidth: error ? 1.5 : 0, borderColor: DANGER }}>
        {opts.map((g) => {
          const on = value === g.v, off = !!locked && !on;
          return (
            <Pressable key={g.v} disabled={!!locked} onPress={() => onChange(g.v)} accessibilityRole="radio" accessibilityState={{ selected: on, disabled: off }}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', opacity: off ? 0.4 : 1,
                backgroundColor: on ? (ui.isDark ? ui.surface : '#fff') : 'transparent', elevation: on ? 2 : 0 }}>
              <Text style={{ ...type('listTitle', 14), color: on ? (ui.isDark ? '#FF8A8F' : PRIMARY_DARK) : ui.muted }}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {locked && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}><Icon name="lock" size={12} color={ui.muted} /><Text style={{ ...type('label', 12), color: ui.muted }}>Locked for a ladies seat</Text></View>}
      {!!error && <Text accessibilityLiveRegion="polite" style={{ ...type('label', 12), lineHeight: 17, color: DANGER, marginTop: 5 }}>{error}</Text>}
    </View>
  );
}

const BusGlyph = () => (
  <Svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3.5} y={3.5} width={17} height={14} rx={3.2} /><Path d="M3.5 11h17M12 3.5V11M6.5 17.5v2.2M17.5 17.5v2.2" />
    <Circle cx={8} cy={14.2} r={0.6} fill="#fff" /><Circle cx={16} cy={14.2} r={0.6} fill="#fff" />
  </Svg>
);

// ------------------------------------------------------------------ the component
/**
 * Passenger details as a boarding pass ("Boarding pass" design): route header, one block per passenger (seat badge + name / age / gender),
 * and a tear-off stub for the ticket contact, optional ID proof / emergency contact / insurance, and the total.
 * Controlled: the parent keeps `value`, computes `errors` with validatePassengerForm() and passes them back.
 */
export function PassengerDetails({ trip, value, onChange, errors, submitted = false, ladiesSeatIds = [], needsId = false, womenMode = false, totalPaise, registerField }: PassengerDetailsProps) {
  const ui = useBusUi();
  const { c } = useTheme();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, TextInput | null>>({});
  const touch = useCallback((k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true })), []);
  const err = (k: string) => (submitted || touched[k] ? errors[k] : undefined);
  const set = (p: Partial<PassengerFormValue>) => onChange({ ...value, ...p });
  const setPax = (i: number, p: Partial<PassengerFormValue['pax'][number]>) => onChange({ ...value, pax: value.pax.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const focus = (k: string) => () => refs.current[k]?.focus();
  const stubBg = ui.isDark ? ui.chipBg : '#FAFAFA';
  const pageBg = ui.isDark ? c.bg : '#F5F6F8';
  const n = value.pax.length;

  return (
    <View style={{ backgroundColor: ui.surface, borderRadius: 22, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 13, shadowOffset: { width: 0, height: 8 } }}>
      {/* route header */}
      {trip && (
        <LinearGradient colors={[PRIMARY, '#F0525F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ ...type('subHeader', 19), color: '#fff', lineHeight: 24 }}>{trip.from}</Text>
            <Text style={{ ...type('label', 12), color: 'rgba(255,255,255,0.92)', lineHeight: 17 }}>{[trip.fromTime, trip.date].filter(Boolean).join(' · ')}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <BusGlyph />
            {!!trip.durationMin && <Text style={{ ...type('label', 12), color: 'rgba(255,255,255,0.95)' }}>{duration(trip.durationMin)}</Text>}
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text numberOfLines={1} style={{ ...type('subHeader', 19), color: '#fff', lineHeight: 24 }}>{trip.to}</Text>
            <Text style={{ ...type('label', 12), color: 'rgba(255,255,255,0.92)', lineHeight: 17 }}>{trip.toTime ?? ''}</Text>
          </View>
        </LinearGradient>
      )}

      {/* passengers */}
      {value.pax.map((p, i) => {
        const ladies = ladiesSeatIds.includes(p.seatId);
        return (
          <View key={p.seatId}>
            <View style={{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View accessibilityLabel={`Seat ${p.seatId}`} style={{ height: 48, minWidth: 60, paddingHorizontal: 10, borderRadius: 12, backgroundColor: ui.isDark ? 'rgba(225,29,46,0.2)' : '#FDECEE', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ ...type('label', 12), lineHeight: 15, color: ui.isDark ? '#FF8A8F' : PRIMARY_DARK }}>Seat</Text>
                  <Text style={{ ...type('subHeader', 18), color: ui.isDark ? '#FF8A8F' : PRIMARY_DARK, lineHeight: 22 }}>{p.seatId}</Text>
                </View>
                <Text style={{ ...type('subHeader', 18), color: ui.ink, flex: 1 }}>Passenger {i + 1}</Text>
                {ladies && <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, backgroundColor: ui.isDark ? 'rgba(236,72,153,0.2)' : '#FDF2F8' }}><Text style={{ ...type('label', 12), color: '#EC4899' }}>Ladies seat</Text></View>}
              </View>
              <UlField ref={(r) => { refs.current['n' + i] = r; }} fieldKey={'n' + i} onRegister={registerField} label="Passenger name" placeholder="As on ID proof" value={p.name}
                onChangeText={(t) => setPax(i, { name: cleanName(t) })} onBlur={() => touch('n' + i)} error={err('n' + i)} maxLength={LIMITS.NAME_MAX}
                autoCapitalize="words" autoCorrect={false} autoComplete="name" returnKeyType="next" onSubmitEditing={focus('a' + i)} />
              <UlField ref={(r) => { refs.current['a' + i] = r; }} fieldKey={'a' + i} onRegister={registerField} label="Age" placeholder="e.g. 28" value={p.age}
                onChangeText={(t) => setPax(i, { age: cleanAge(t) })} onBlur={() => touch('a' + i)} error={err('a' + i)} keyboardType="number-pad" maxLength={3} />
              <GenderSeg value={ladies ? 'F' : p.gender} locked={ladies} hideOther={needsId} error={err('g' + i)} onRegister={(r) => registerField?.('g' + i, r)} onChange={(g) => { setPax(i, { gender: g }); touch('g' + i); }} />
            </View>
            <View style={{ marginHorizontal: 0 }}><DashedLine color="#D5D8DE" dash={6} gap={5} thickness={1.5} /></View>
          </View>
        );
      })}

      {/* tear-off stub */}
      <View style={{ backgroundColor: stubBg, padding: 18 }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: -12, left: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: pageBg }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: -12, right: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: pageBg }} />
        <Text accessibilityRole="header" style={{ ...type('subHeader', 18), color: ui.ink, marginBottom: 10 }}>Contact for ticket</Text>
        <UlField ref={(r) => { refs.current.mobile = r; }} fieldKey="mobile" onRegister={registerField} label="Mobile number" placeholder="10 digit number" value={value.mobile}
          onChangeText={(t) => set({ mobile: cleanMobile(t) })} onBlur={() => touch('mobile')} error={err('mobile')} keyboardType="number-pad" maxLength={LIMITS.MOBILE_LEN} autoComplete="tel" textContentType="telephoneNumber" />
        <UlField ref={(r) => { refs.current.email = r; }} fieldKey="email" onRegister={registerField} label="Email ID" placeholder="name@example.com" value={value.email}
          onChangeText={(t) => set({ email: cleanEmail(t) })} onBlur={() => touch('email')} error={err('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" maxLength={LIMITS.EMAIL_MAX} />

        {needsId && (
          <View style={{ marginBottom: 4 }}>
            <Text style={{ ...type('subHeader', 18), color: ui.ink, marginTop: 6, marginBottom: 8 }}>ID proof · Passenger 1</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {ID_TYPES.map((t) => {
                const on = value.idType === t.value;
                return (
                  <Pressable key={t.value} onPress={() => set({ idType: t.value })} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1.5, borderColor: on ? PRIMARY : ui.line, backgroundColor: on ? (ui.isDark ? 'rgba(225,29,46,0.2)' : '#FDECEE') : ui.surface }}>
                    <Text style={{ ...type('listTitle', 14), color: on ? (ui.isDark ? '#FF8A8F' : PRIMARY_DARK) : ui.muted }}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <UlField ref={(r) => { refs.current.idNumber = r; }} fieldKey="idNumber" onRegister={registerField} label="ID number" placeholder={value.idType === 'PAN' ? 'ABCDE1234F' : value.idType === 'AADHAAR' ? '12 digit number' : 'ID number'} value={value.idNumber}
              onChangeText={(t) => set({ idNumber: cleanIdNumber(t) })} onBlur={() => touch('idNumber')} error={err('idNumber')} autoCapitalize="characters" autoCorrect={false} maxLength={20} />
            <Text style={{ ...type('label', 12), color: ui.muted, marginTop: -6, marginBottom: 10 }}>Needed by the bus operator. It is sent securely to reserve your seats and is not stored by Zproogo.</Text>
          </View>
        )}

        {/* emergency contact */}
        <Switch label="Emergency contact" sub={womenMode ? 'They get your live location if you press SOS' : 'Optional · they get your live location if you press SOS'} on={value.addEmergency} onToggle={() => set({ addEmergency: !value.addEmergency })} />
        {value.addEmergency && (
          <View style={{ marginTop: 14 }}>
            <UlField ref={(r) => { refs.current.ecName = r; }} fieldKey="ecName" onRegister={registerField} label="Contact name" placeholder="Full name" value={value.emergency.name}
              onChangeText={(t) => set({ emergency: { ...value.emergency, name: cleanName(t) } })} onBlur={() => touch('ecName')} error={err('ecName')} autoCapitalize="words" autoCorrect={false} maxLength={LIMITS.NAME_MAX} />
            <UlField ref={(r) => { refs.current.ecMobile = r; }} fieldKey="ecMobile" onRegister={registerField} label="Contact mobile" placeholder="10 digit number" value={value.emergency.mobile}
              onChangeText={(t) => set({ emergency: { ...value.emergency, mobile: cleanMobile(t) } })} onBlur={() => touch('ecMobile')} error={err('ecMobile')} keyboardType="number-pad" maxLength={LIMITS.MOBILE_LEN} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['Mother', 'Father', 'Sister', 'Friend', 'Partner'].map((r) => {
                const on = value.emergency.relation === r;
                return (
                  <Pressable key={r} onPress={() => set({ emergency: { ...value.emergency, relation: r } })} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    style={{ paddingVertical: 7, paddingHorizontal: 13, borderRadius: 9999, borderWidth: 1.5, borderColor: on ? PRIMARY : ui.line, backgroundColor: on ? (ui.isDark ? 'rgba(225,29,46,0.2)' : '#FDECEE') : ui.surface }}>
                    <Text style={{ ...type('listTitle', 14), color: on ? (ui.isDark ? '#FF8A8F' : PRIMARY_DARK) : ui.muted }}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ marginTop: 14 }}>
          <Switch label={`Travel insurance · ${rupees(INSURANCE_PER_SEAT_PAISE)}/seat`} sub="Trip cancellation and baggage cover" on={value.insurance} onToggle={() => set({ insurance: !value.insurance })} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: ui.line }}>
          <Text style={{ ...type('listTitle', 14), color: ui.ink }}>Total · {n} {n === 1 ? 'seat' : 'seats'}</Text>
          <Text style={{ ...type('subHeader', 18), color: ui.ink }}>{rupees(totalPaise)}</Text>
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ toggle row (48x28 switch of the design)
function Switch({ label, sub, on, onToggle }: { label: string; sub: string; on: boolean; onToggle: () => void }) {
  const ui = useBusUi();
  return (
    <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...type('listTitle', 14), color: ui.ink, lineHeight: 20 }}>{label}</Text>
        <Text style={{ ...type('label', 13), color: ui.muted, lineHeight: 18 }}>{sub}</Text>
      </View>
      <View style={{ width: 48, height: 28, borderRadius: 9999, backgroundColor: on ? SUCCESS : '#CFD3D9', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', elevation: 2 }} />
      </View>
    </Pressable>
  );
}
