import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { EmptyState, ErrorView, Loading, Section } from '../../components/ui';
import { DateStrip } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { BusResultCard, useBusUi } from '../../components/BusResult';
import {
  activeFilterCount, applyFilters, buildFilterMeta, BusFilterBar, BusFilters, BusFilterSheet, BusSortSheet, makeEmptyFilters, SORT_OPTIONS, sortTrips, SortKey,
} from '../../components/BusFilters';
import { Api, BusTrip } from '../../api/endpoints';
import { dateShort, ymd } from '../../utils/format';
import { type } from '../../theme/typography';

const toggleIn = (a: string[], k: string) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]);

/**
 * Bus search results (opened with the Search button). Header with route, Sort + Filter bar, list of BusResultCards.
 * Filter opens as a bottom sheet; the Sort sheet re-orders the list. Everything is applied on the phone to the
 * buses returned by the search, so it is instant.
 */
export function BusResultsScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const ui = useBusUi();
  const { from, to, women } = route.params as { from: string; to: string; date: string; women: boolean };
  const [date, setDate] = useState<string>(route.params.date);
  const [filters, setFilters] = useState<BusFilters>(makeEmptyFilters);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);

  const q = useQuery({ queryKey: ['bus', from, to, date, women], queryFn: () => Api.busSearch({ from, to, date, women }) });
  const all = useMemo<BusTrip[]>(() => q.data?.trips ?? [], [q.data]);
  const meta = useMemo(() => buildFilterMeta(all), [all]);
  const trips = useMemo(() => sortTrips(applyFilters(all, filters), sort), [all, filters, sort]);
  const active = activeFilterCount(filters, meta);

  const quick = useCallback((chip: 'ac' | 'sleeper' | 'seater' | 'night') => setFilters((f) => {
    if (chip === 'ac') return { ...f, acTypes: toggleIn(f.acTypes, 'ac') };
    if (chip === 'sleeper') return { ...f, seatTypes: toggleIn(f.seatTypes, 'Sleeper') };
    if (chip === 'seater') return { ...f, seatTypes: toggleIn(f.seatTypes, 'Seater') };
    return { ...f, depSlots: toggleIn(f.depSlots, 'night') };
  }), []);
  const onSelect = useCallback((trip: BusTrip) => navigation.navigate('SeatLayout', { trip, women }), [navigation, women]);

  // 5-day strip around the searched date, used when there are no buses at all
  const nearby = q.data?.nearbyDates?.length ? q.data.nearbyDates : Array.from({ length: 5 }, (_, i) => ymd(dayjs(route.params.date).add(i - 2, 'day'))).filter((d) => !dayjs(d).isBefore(dayjs(), 'day'));
  const sortLabel = sort === 'recommended' ? 'Sort' : SORT_OPTIONS.find((o) => o.key === sort)?.label.split(':')[0];

  const empty = q.isLoading ? null : !all.length ? (
    <View>
      <EmptyState icon="bus" title="No buses on this route" text={`We couldn't find buses from ${from} to ${to} on ${dateShort(date)}. Try a nearby date.`} />
      {!!nearby.length && <><Section title="Nearby dates" /><DateStrip dates={nearby} value={date} onPick={setDate} /></>}
    </View>
  ) : (
    <EmptyState icon="filter" title="No buses match your filters" text="Try removing a filter or two to see more buses." action="Clear all filters" onAction={() => setFilters(makeEmptyFilters())} />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ui.page }} edges={['top']}>
      {/* header: back + route + date / count */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 20, paddingTop: 12 }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} color={ui.ink} />
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} style={{ ...type('header', 24), color: ui.ink, lineHeight: 28, letterSpacing: -0.2 }}>{from} → {to}</Text>
          <Text style={{ ...type('label', 13), color: ui.muted }}>{dateShort(date)}{q.data ? ` · ${trips.length} ${trips.length === 1 ? 'bus' : 'buses'}` : ''}</Text>
        </View>
      </View>

      <BusFilterBar filters={filters} activeCount={active} sortLabel={sortLabel} onOpenFilter={() => setSheet('filter')} onOpenSort={() => setSheet('sort')} onQuick={quick} />

      {q.isLoading ? <Loading text="Finding buses…" /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30, gap: 14 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={empty}
          renderItem={({ item }) => <BusResultCard trip={item} women={!!women} onSelect={onSelect} />}
        />
      )}

      <BusFilterSheet visible={sheet === 'filter'} trips={all} meta={meta} applied={filters} onApply={setFilters} onClose={() => setSheet(null)} />
      <BusSortSheet visible={sheet === 'sort'} value={sort} onPick={setSort} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}
