import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Api } from '../../api/endpoints';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Chip, Row, Txt } from '../ui';
import { CalendarSheet, PickerSheet, SearchCard } from '../widgets';
import { usePrefs } from '../../store/prefs';
import { CITIES } from '../../utils/places';
import { validateBusSearch } from '../../utils/validation';
import { dateShort, ymd } from '../../utils/format';
import { WomenToggle } from './WomenToggle';

export type BusQuery = { from: string; to: string; date: string; women: boolean };

export type BusSearchCardProps = {
  /** Called with { from, to, date, women } when the user taps Search. */
  onSearch: (q: BusQuery) => void;
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialWomen?: boolean;
  /** Hide the "Booking for women" bar (e.g. on a screen that must not offer it). */
  hideWomen?: boolean;
  /** Override the search button label. */
  buttonTitle?: string;
};

/**
 * Reusable bus search section: From / To (with animated swap) / Date (+ Today, Tomorrow) /
 * Booking for women / Search button, including the city + calendar pickers and validation.
 * Used on Home and on the Bus screen; drop it into any other screen the same way:
 *   <BusSearchCard onSearch={(q) => navigation.navigate('BusResults', q)} />
 */
export function BusSearchCard({ onSearch, initialFrom, initialTo, initialDate, initialWomen, hideWomen, buttonTitle }: BusSearchCardProps) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const [from, setFrom] = useState(initialFrom ?? (prefs.city || 'Pune'));
  const [to, setTo] = useState(initialTo ?? 'Mumbai');
  const [date, setDate] = useState(initialDate ?? ymd(new Date()));
  const [women, setWomen] = useState(hideWomen ? false : (initialWomen ?? prefs.womenMode));
  const [pick, setPick] = useState<'from' | 'to' | 'date' | null>(null);
  // City list comes from the supplier (ETS getStations); the static list is only a fallback if it is empty or fails.
  const stationsQ = useQuery({ queryKey: ['bus-stations'], queryFn: Api.busStations, staleTime: 6 * 3600_000, retry: 1 });
  const cities = stationsQ.data?.stations.length ? stationsQ.data.stations.map((s) => s.name) : CITIES;
  const errs = validateBusSearch({ from, to, date });
  const firstErr = errs.from || errs.to || errs.date;
  const setWomenMode = (v: boolean) => { setWomen(v); prefs.set({ womenMode: v }); };
  const today = ymd(new Date()), tomorrow = ymd(dayjs().add(1, 'day'));
  return (
    <>
      <SearchCard
        onSwap={() => { setFrom(to); setTo(from); }}
        rows={[
          { icon: 'bus', label: 'From', value: from, onPress: () => setPick('from') },
          { icon: 'bus', label: 'To', value: to, onPress: () => setPick('to') },
          {
            icon: 'cal', label: 'Date of journey', value: dateShort(date), onPress: () => setPick('date'), chevron: true,
            // quick buttons live inside the date box; tapping the box itself opens the calendar
            right: (
              <Row gap={6}>
                <Chip label="Today" on={date === today} onPress={() => setDate(today)} />
                <Chip label="Tomorrow" on={date === tomorrow} onPress={() => setDate(tomorrow)} />
              </Row>
            ),
          },
        ]}
        footer={hideWomen ? undefined : <WomenToggle value={women} onChange={setWomenMode} />}
      />
      <Button title={buttonTitle ?? (women ? 'Search women-friendly buses' : 'Search buses')} icon="search" disabled={!!firstErr}
        onPress={() => onSearch({ from, to, date, women })} />
      {(stationsQ.isError || (stationsQ.isSuccess && !stationsQ.data.stations.length)) && <Txt v="xs" muted center>Live city list unavailable, showing popular cities. Type to search.</Txt>}
      {!!firstErr && <Txt v="small" color={c.danger} center>{firstErr}</Txt>}
      <PickerSheet visible={pick === 'from' || pick === 'to'} onClose={() => setPick(null)} title={pick === 'from' ? 'Leaving from' : 'Going to'}
        items={cities} label={(x) => x} onPick={(x) => (pick === 'from' ? setFrom(x) : setTo(x))} />
      <CalendarSheet visible={pick === 'date'} onClose={() => setPick(null)} value={date} onPick={setDate} />
    </>
  );
}
