import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { BOTTOM_NAV_SPACE } from '../../components/BottomNav';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, ErrorView, Loading, Price, Row, Tabs, Txt } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { useAuth } from '../../store/auth';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useParcelStore } from '../parcel/parcelStore';
import { ParcelOrderCard, filterParcels } from '../parcel/ParcelOrder';

const MODE_ICON = { BUS: 'bus', TRAIN: 'train', FLIGHT: 'plane', HOTEL: 'hotel', CAB: 'car' } as const;
export const STATUS_BADGE: Record<string, [string, any]> = {
  CONFIRMED: ['Confirmed', 'success'], PENDING: ['Payment pending', 'warn'], PAID: ['Confirming', 'warn'], PARTIALLY_CANCELLED: ['Partly cancelled', 'warn'],
  CANCELLATION_PENDING: ['Cancelling', 'warn'], CANCELLED: ['Cancelled', 'danger'], REFUND_INITIATED: ['Refund initiated', 'info'], REFUNDED: ['Refunded', 'success'],
  REFUND_FAILED: ['Refund failed', 'danger'], FAILED: ['Failed', 'danger'], COMPLETED: ['Completed', 'neutral'], EXPIRED: ['Expired', 'neutral'],
};

/** My Trips (screens 06 guest / 83): upcoming, completed, cancelled. */
export function MyTripsScreen({ navigation }: any) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const requireLogin = useRequireLogin();
  const [tab, setTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [kind, setKind] = useState<'TRAVEL' | 'PARCELS'>('TRAVEL');
  const parcels = useParcelStore((s) => s.orders);
  const q = useQuery({ queryKey: ['trips', tab], queryFn: () => Api.bookings(tab), enabled: !!user && kind === 'TRAVEL' });

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: 16 }}>
        <Txt v="h1">My Trips</Txt>
        <EmptyState icon="lock" title="Log in to view your bookings" text="Your tickets, live tracking, cancellations and refunds live here once you log in." />
        <Card>{[['ticket', 'All tickets in one place'], ['navi', 'Track bus, train and flight'], ['refresh', 'Cancel and track refunds']].map(([i, t]) => (
          <Row key={t} style={{ paddingVertical: 5 }}><Icon name={i as any} size={15} color={c.brand} /><Txt v="small">{t}</Txt></Row>))}</Card>
        <Button title="Log in or sign up" onPress={() => requireLogin(() => undefined)} style={{ marginTop: 12 }} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Txt v="h1">My Trips</Txt>
        <Tabs value={kind} onChange={setKind} items={[{ value: 'TRAVEL', label: 'Travel', icon: 'ticket' }, { value: 'PARCELS', label: 'Parcels', icon: 'box' }]} />
        <Tabs value={tab} onChange={setTab} items={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      </View>
      {kind === 'PARCELS' ? (
        <FlatList data={filterParcels(parcels, tab)} keyExtractor={(o) => o.id} contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_NAV_SPACE }}
          ListEmptyComponent={<EmptyState icon="box" title="No parcels yet" text="Parcel orders you place will appear here." action="Send a parcel" onAction={() => navigation.navigate('ParcelHome')} />}
          renderItem={({ item }) => <ParcelOrderCard o={item} onPress={() => navigation.navigate('ParcelOrder', { id: item.id })} />} />
      ) : q.isLoading ? <Loading /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : (
        <FlatList data={q.data} keyExtractor={(b) => b.id} contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_NAV_SPACE }} onRefresh={q.refetch} refreshing={q.isRefetching}
          ListEmptyComponent={<EmptyState icon="ticket" title="No trips yet" text="Your upcoming trips will appear here." action="Explore now" onAction={() => navigation.navigate('Home')} />}
          renderItem={({ item: b }) => {
            const [label, kind] = STATUS_BADGE[b.status] ?? [b.status, 'neutral'];
            return (
              <Card onPress={() => navigation.navigate(b.mode === 'CAB' && b.status === 'CONFIRMED' ? 'CabRide' : 'BookingDetails', { id: b.id })} highlight={!!b.supplierAlert && !b.supplierAlert.resolved}>
                <Row>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name={MODE_ICON[b.mode as keyof typeof MODE_ICON]} color={c.brand} /></View>
                  <View style={{ flex: 1 }}><Txt v="h3">{b.title}</Txt><Txt v="xs" muted>{b.subtitle}</Txt></View>
                  <Badge text={label} kind={kind} />
                </Row>
                {b.supplierAlert && !b.supplierAlert.resolved && <Row style={{ marginTop: 8 }}><Icon name="alert" size={14} color={c.danger} /><Txt v="small" color={c.danger} style={{ flex: 1 }}>{b.supplierAlert.message} · tap to choose</Txt></Row>}
                <Row style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: c.border, justifyContent: 'space-between' }}>
                  <Txt v="xs" muted>{b.pnr ? `${b.mode === 'CAB' ? 'Ride' : 'PNR'} ${b.pnr}` : b.code}</Txt>
                  <Row gap={6}>{b.womenMode && <Badge kind="ladies" text="Women" />}{b.mode === 'CAB' && b.totalPaise === 0 ? <Badge text="Pay driver" /> : <Price paise={b.totalPaise} size={13} />}</Row>
                </Row>
              </Card>
            );
          }} />
      )}
    </SafeAreaView>
  );
}
