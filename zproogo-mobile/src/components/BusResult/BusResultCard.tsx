import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Api, BusTrip } from '../../api/endpoints';
import { Badge } from '../ui';
import { Icon } from '../Icon';
import { Chevron } from '../Chevron';
import { DashedLine } from '../DashedLine';
import { FONT, type } from '../../theme/typography';
import { duration, rupees, time24 } from '../../utils/format';
import { AmenityGrid } from './AmenityGrid';
import { RouteMap } from './RouteMap';
import { useBusUi } from './busResultTheme';

type Props = {
  trip: BusTrip;
  /** "Booking for women" mode: shows ladies-seat / safety badges and fades buses the server demoted. */
  women?: boolean;
  onSelect: (trip: BusTrip) => void;
};

/**
 * One bus in the results list ("Search results (red hero)" card): operator + rating, bus type, times with
 * duration, seats-left pill, price + Select, and two expandable panels - Amenities and View more (route map + pickup/drop).
 * Reusable anywhere a BusTrip has to be shown: <BusResultCard trip={t} onSelect={...} />
 */
function BusResultCardBase({ trip, women = false, onSelect }: Props) {
  const ui = useBusUi();
  const [amOpen, setAmOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // pickup / drop points are only fetched when "View more" is opened
  const pts = useQuery({ queryKey: ['bus-points', trip.id, women], queryFn: () => Api.busPoints(trip.id, women), enabled: moreOpen, staleTime: 5 * 60_000, retry: 1 });
  const pickup = pts.data?.boarding?.[0], drop = pts.data?.dropping?.[0];
  const pickupName = pickup?.name ?? trip.boardingPoints?.[0] ?? trip.fromCity, dropName = drop?.name ?? trip.droppingPoints?.[0] ?? trip.toCity;
  const soldOut = trip.seatsLeft <= 0;

  const toggleBtn = (label: string, open: boolean, onPress: () => void, align: 'flex-start' | 'flex-end') => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, alignSelf: align }}>
      <Text style={{ fontFamily: FONT.uiMedium, fontSize: 13, color: open ? ui.red : ui.ink }}>{label}</Text>
      <Chevron color={open ? ui.red : ui.ink} open={open} />
    </Pressable>
  );

  const pointRow = (kind: 'Pickup' | 'Drop', name: string, at: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={kind === 'Pickup'
        ? { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: ui.red, backgroundColor: ui.surface }
        : { width: 10, height: 10, borderRadius: 5, backgroundColor: ui.red }} />
      <Text style={{ ...type('label'), color: ui.muted }}>{kind}</Text>
      <Text numberOfLines={1} style={{ flex: 1, textAlign: 'right', fontFamily: FONT.uiMedium, fontSize: 13, color: ui.ink }}>{name} · {at}</Text>
    </View>
  );

  return (
    <View style={{
      borderRadius: 16, borderLeftWidth: 3, borderLeftColor: ui.red, backgroundColor: ui.surface, paddingTop: 16, paddingBottom: 14, paddingLeft: 17, paddingRight: 16, gap: 12,
      shadowColor: '#111827', shadowOpacity: ui.isDark ? 0.3 : 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 3,
      opacity: trip.demoted ? 0.55 : 1,
    }}>
      {/* operator + rating + bus type */}
      <View style={{ gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text numberOfLines={1} style={{ ...type('listTitle'), color: ui.ink, flex: 1 }}>{trip.operator}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8, backgroundColor: ui.ratingBg }}>
            <Icon name="star" size={11} color={ui.ratingFg} fill={ui.ratingFg} />
            <Text style={{ fontFamily: FONT.uiMedium, fontSize: 12, color: ui.ratingFg }}>{trip.rating.toFixed(1)}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={{ ...type('label', 13), color: ui.muted }}>{trip.busType}</Text>
      </View>

      {/* women-friendly extras (only in "Booking for women" mode) */}
      {women && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {trip.ladiesSeats > 0 ? <Badge kind="ladies" text={`${trip.ladiesSeats} ladies seats`} /> : <Badge text="No ladies seats" />}
          {trip.womenTravelling > 0 && <Badge kind="success" text={`${trip.womenTravelling} women travelling`} />}
          <Badge kind="info" text={`Safety ${trip.safetyRating}`} />
        </View>
      )}

      {/* times */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ ...type('subHeader'), color: ui.ink }}>{time24(trip.departAt)}</Text>
        <View style={{ flex: 1, height: 28, justifyContent: 'flex-start' }}>
          <View style={{ marginTop: 10 }}><DashedLine color={ui.dash} /></View>
          <Text style={{ ...type('label'), color: ui.muted, textAlign: 'center', marginTop: 2 }}>{duration(trip.durationMin)}</Text>
        </View>
        <Text style={{ ...type('subHeader'), color: ui.ink }}>{time24(trip.arriveAt)}</Text>
      </View>

      {/* seats left + price + Select */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: ui.warnBg }}>
          <Text style={{ fontFamily: FONT.uiMedium, fontSize: 12, color: ui.warnFg }}>{soldOut ? 'Sold out' : `${trip.seatsLeft} seats left`}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ ...type('subHeader'), color: ui.ink }}>{rupees(trip.farePaise)}</Text>
          <Pressable disabled={soldOut} onPress={() => onSelect(trip)} accessibilityRole="button" accessibilityLabel={`Select ${trip.operator}`}
            style={({ pressed }) => ({ height: 36, paddingHorizontal: 20, borderRadius: 999, justifyContent: 'center', backgroundColor: soldOut ? '#9CA3AF' : ui.red, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ fontFamily: FONT.uiMedium, fontSize: 14, color: '#fff' }}>Select</Text>
          </Pressable>
        </View>
      </View>

      {/* Amenities / View more toggles */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -4 }}>
        {toggleBtn('Amenities', amOpen, () => setAmOpen(!amOpen), 'flex-start')}
        {toggleBtn(moreOpen ? 'View less' : 'View more', moreOpen, () => setMoreOpen(!moreOpen), 'flex-end')}
      </View>

      {amOpen && (
        <View style={{ paddingTop: 12, gap: 12 }}>
          <DashedLine color={ui.line} />
          <AmenityGrid trip={trip} />
        </View>
      )}

      {moreOpen && (
        <View style={{ paddingTop: 12, gap: 10 }}>
          <DashedLine color={ui.line} />
          <RouteMap from={trip.fromCity} to={trip.toCity} fromQuery={`${pickupName}, ${trip.fromCity}`} toQuery={`${dropName}, ${trip.toCity}`} />
          <View style={{ gap: 8 }}>
            {pointRow('Pickup', pickupName, pickup?.time ?? time24(trip.departAt))}
            {pointRow('Drop', dropName, drop?.time ?? time24(trip.arriveAt))}
          </View>
        </View>
      )}
    </View>
  );
}

export const BusResultCard = React.memo(BusResultCardBase);
