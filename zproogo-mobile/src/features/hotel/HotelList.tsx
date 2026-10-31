import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Button, Card, Chip, ChipGroup, ErrorView, Loading, Price, Row, Screen, Sheet, Tabs, Txt } from '../../components/ui';
import { Scene } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api, Hotel } from '../../api/endpoints';
import { dateShort, rupees } from '../../utils/format';

/** Screens 68-70 - hotel list (view more, whiteboard 27), filters sheet, list/map toggle. */
export function HotelListScreen({ navigation, route }: any) {
  const { query } = route.params;
  const [f, setF] = useState<any>({ sort: query.sort });
  const [sheet, setSheet] = useState(false);
  const q = useQuery({ queryKey: ['hotels', query, f], queryFn: () => Api.hotelSearch({ ...query, ...f, stars: f.stars?.join(',') || undefined }) });
  return (
    <Screen scroll={false} padded={false} title={`${query.city} · ${dateShort(query.checkIn)}–${dateShort(query.checkOut)}`}>
      <View style={{ paddingHorizontal: 16 }}>
        <Tabs value="LIST" onChange={(v) => v === 'MAP' && navigation.navigate('HotelMap', { hotels: q.data?.hotels ?? [], query })}
          items={[{ value: 'LIST', label: 'List', icon: 'grid' }, { value: 'MAP', label: 'Map', icon: 'map' }]} />
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Chip label="Filters" icon="filter" onPress={() => setSheet(true)} />
          <Chip label="Free cancellation" on={f.freeCancellation === 'true'} onPress={() => setF({ ...f, freeCancellation: f.freeCancellation ? undefined : 'true' })} />
          <Chip label="4★+" on={f.minRating === 4} onPress={() => setF({ ...f, minRating: f.minRating ? undefined : 4 })} />
          <Chip label="Couple friendly" on={f.coupleFriendly === 'true'} onPress={() => setF({ ...f, coupleFriendly: f.coupleFriendly ? undefined : 'true' })} />
        </Row>
      </View>
      {q.isLoading ? <Loading text="Finding stays…" /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : (
        <FlatList data={q.data!.hotels} keyExtractor={(h) => h.id} contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={<Txt v="small" muted>{q.data!.count} properties</Txt>}
          renderItem={({ item }) => <HotelCard h={item} onPress={() => navigation.navigate('HotelDetails', { id: item.id, query })} />} />
      )}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Filters">
        <Txt v="h3">Star rating</Txt>
        <ChipGroup multi value={f.stars ?? []} onChange={(stars) => setF({ ...f, stars })} options={[3, 4, 5].map((s) => ({ value: String(s), label: `${s}★` }))} />
        <Txt v="h3">Price per night</Txt>
        <ChipGroup value={String(f.maxPrice ?? '')} onChange={(v) => setF({ ...f, maxPrice: v ? Number(v) : undefined })}
          options={[{ value: '3000', label: 'Under ₹3,000' }, { value: '5000', label: 'Under ₹5,000' }, { value: '8000', label: 'Under ₹8,000' }, { value: '', label: 'Any' }]} />
        <Txt v="h3">Sort</Txt>
        <ChipGroup value={f.sort ?? ''} onChange={(sort) => setF({ ...f, sort: sort || undefined })}
          options={[{ value: 'price', label: 'Price' }, { value: 'rating', label: 'Rating' }, { value: 'distance', label: 'Distance' }]} />
        <Row style={{ marginTop: 12 }}><Button title="Reset" variant="outline" style={{ flex: 1 }} onPress={() => setF({})} /><Button title="Apply" style={{ flex: 2 }} onPress={() => setSheet(false)} /></Row>
      </Sheet>
    </Screen>
  );
}

export function HotelCard({ h, onPress }: { h: Hotel; onPress: () => void }) {
  const { c } = useTheme();
  const [more, setMore] = useState(false);
  return (
    <Card onPress={onPress} style={{ padding: 0, overflow: 'hidden' }}>
      <Row gap={0}>
        <View style={{ width: 104, alignSelf: 'stretch' }}><Scene kind={h.image === 'resort2' ? 'lake' : 'mountains'} height={120} /></View>
        <View style={{ flex: 1, padding: 10 }}>
          <Txt v="h3" numberOfLines={1}>{h.name}</Txt>
          <Txt v="xs" muted>{h.area} · {h.distanceKm} km {h.landmark}</Txt>
          <Row gap={4}><Icon name="star" size={11} color={c.warning} fill={c.warning} /><Txt v="xs" bold color={c.warning}>{h.rating}</Txt><Txt v="xs" muted>({h.reviews} reviews) · {h.stars}★</Txt></Row>
          <Row gap={4} style={{ marginTop: 4, flexWrap: 'wrap' }}>{h.freeCancellation && <Badge kind="success" text="Free cancellation" />}{h.coupleFriendly && <Badge kind="info" text="Couple friendly" />}</Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Price paise={h.pricePaise} suffix="/night" />
            <Txt v="xs" color={c.brand} onPress={() => setMore(!more)}>{more ? 'View less' : 'View more'}</Txt>
          </Row>
          {more && <Txt v="xs" muted style={{ marginTop: 4 }}>{h.amenities.join(' · ')}</Txt>}
        </View>
      </Row>
    </Card>
  );
}

/** Screen 69 - map view with price pins. Add your Google Maps key in AndroidManifest (see README). */
export function HotelMapScreen({ navigation, route }: any) {
  const { hotels, query } = route.params as { hotels: Hotel[]; query: any };
  const [sel, setSel] = useState<Hotel | undefined>(hotels[0]);
  const { c } = useTheme();
  return (
    <Screen scroll={false} padded={false} title={`Hotels in ${query.city}`}>
      <MapView style={{ flex: 1 }} initialRegion={{ latitude: hotels[0]?.lat ?? 15.55, longitude: hotels[0]?.lng ?? 73.75, latitudeDelta: 0.12, longitudeDelta: 0.12 }}>
        {hotels.map((h) => (
          <Marker key={h.id} coordinate={{ latitude: h.lat, longitude: h.lng }} onPress={() => setSel(h)}>
            <View style={{ backgroundColor: sel?.id === h.id ? '#0B1F3A' : c.brand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
              <Txt v="xs" color="#fff" bold>{rupees(h.pricePaise)}</Txt>
            </View>
          </Marker>
        ))}
      </MapView>
      {sel && <View style={{ position: 'absolute', left: 16, right: 16, bottom: 20 }}>
        <Pressable onPress={() => navigation.navigate('HotelDetails', { id: sel.id, query })}><HotelCard h={sel} onPress={() => navigation.navigate('HotelDetails', { id: sel.id, query })} /></Pressable>
      </View>}
    </Screen>
  );
}
