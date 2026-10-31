/**
 * Instant form validation for cab search. Mirrors zproogo-api/src/modules/cab/rules.ts so users see
 * problems before tapping Search - the SERVER re-checks everything (distance-based rules only run there).
 */
export type TripType = 'CITY' | 'AIRPORT' | 'OUTSTATION' | 'RENTAL';
export type PlaceLite = { id: string; name: string; city: string; airport?: boolean; serviceable: boolean };

export const CAB_RULES = {
  laterMinLeadMin: { CITY: 30, AIRPORT: 30, RENTAL: 30, OUTSTATION: 120 } as Record<TripType, number>,
  maxAdvanceDays: { CITY: 7, AIRPORT: 7, RENTAL: 7, OUTSTATION: 30 } as Record<TripType, number>,
  maxRoundTripDays: 7,
};

export const RENTAL_PACKAGES = [
  { value: '1H10', label: '1 hr · 10 km' }, { value: '2H20', label: '2 hr · 20 km' }, { value: '4H40', label: '4 hr · 40 km' },
  { value: '8H80', label: '8 hr · 80 km' }, { value: '12H120', label: '12 hr · 120 km' },
];

export const TRIP_TABS: { value: TripType; label: string; hint: string }[] = [
  { value: 'CITY', label: 'City', hint: 'Point-to-point rides within the city' },
  { value: 'AIRPORT', label: 'Airport', hint: 'Fixed fares to and from the airport' },
  { value: 'OUTSTATION', label: 'Outstation', hint: 'One way or round trip to another city' },
  { value: 'RENTAL', label: 'Rental', hint: 'Car with driver by the hour' },
];

export type CabForm = {
  tripType: TripType; pickup: PlaceLite | null; drop: PlaceLite | null; when: 'NOW' | 'LATER'; pickupAt: Date | null;
  roundTrip: boolean; returnAt: Date | null; rentalPackage: string | null;
};
export type CabFormErrors = Partial<Record<'pickup' | 'drop' | 'time' | 'return' | 'package', string>>;

/** Earliest allowed scheduled pickup, rounded up to the next 15 minutes. */
export function earliestPickup(tripType: TripType, now = new Date()) {
  const t = new Date(now.getTime() + CAB_RULES.laterMinLeadMin[tripType] * 60_000);
  const m = t.getMinutes();
  t.setMinutes(Math.ceil(m / 15) * 15, 0, 0);
  return t;
}

export function validateCabForm(f: CabForm, now = new Date()): CabFormErrors {
  const e: CabFormErrors = {};
  if (!f.pickup) e.pickup = 'Choose a pickup point';
  else if (!f.pickup.serviceable) e.pickup = `Cabs are not available in ${f.pickup.city} yet`;

  if (f.tripType === 'RENTAL') {
    if (!f.rentalPackage) e.package = 'Choose a package';
  } else if (!f.drop) e.drop = 'Where to?';
  else if (f.pickup && f.drop.id === f.pickup.id) e.drop = 'Pickup and drop cannot be the same';
  else if (f.pickup && f.tripType === 'AIRPORT' && !f.pickup.airport && !f.drop.airport) e.drop = 'Pickup or drop must be an airport';
  else if (f.pickup && (f.tripType === 'CITY' || f.tripType === 'AIRPORT') && f.pickup.city !== f.drop.city) e.drop = `${f.drop.city} is another city · switch to Outstation`;
  else if (f.pickup && f.tripType === 'OUTSTATION' && f.pickup.city === f.drop.city) e.drop = 'Same city · switch to City ride';

  if (f.when === 'LATER') {
    if (!f.pickupAt) e.time = 'Choose pickup date and time';
    else {
      const lead = (f.pickupAt.getTime() - now.getTime()) / 60_000;
      const min = CAB_RULES.laterMinLeadMin[f.tripType];
      if (lead < 0) e.time = 'Pickup time is in the past';
      else if (lead < min) e.time = `Schedule at least ${min >= 60 ? `${min / 60} hours` : `${min} minutes`} ahead`;
      else if (lead > CAB_RULES.maxAdvanceDays[f.tripType] * 1440) e.time = `You can schedule up to ${CAB_RULES.maxAdvanceDays[f.tripType]} days ahead`;
    }
  }
  if (f.tripType === 'OUTSTATION' && f.roundTrip) {
    const start = f.when === 'NOW' ? now : f.pickupAt;
    if (!f.returnAt) e.return = 'Choose your return date and time';
    else if (start && f.returnAt <= start) e.return = 'Return must be after pickup';
    else if (start && f.returnAt.getTime() - start.getTime() > CAB_RULES.maxRoundTripDays * 86_400_000) e.return = `Round trips can be up to ${CAB_RULES.maxRoundTripDays} days`;
  }
  return e;
}

/** Rider / trip details on the booking screen. */
export function validateRider(r: { name: string; mobile: string; gender: string; passengers: number; luggage: number; pickupNote: string },
  car: { seats: number; bags: number; label: string }, women: boolean) {
  const e: Record<string, string> = {};
  if (!/^[A-Za-z .']{2,60}$/.test(r.name.trim())) e.name = 'Enter the rider’s name (letters only)';
  if (!/^[6-9]\d{9}$/.test(r.mobile)) e.mobile = 'Enter a valid 10-digit mobile';
  if (women && r.gender !== 'F') e.gender = 'Women safety rides are for women riders';
  if (r.passengers < 1) e.passengers = 'At least 1 passenger';
  if (r.passengers > car.seats) e.passengers = `${car.label} seats up to ${car.seats}. Go back and pick a bigger car.`;
  if (r.luggage > car.bags) e.luggage = `${car.label} fits up to ${car.bags} bags. Go back and pick a bigger car.`;
  if (/[<>]/.test(r.pickupNote)) e.pickupNote = 'Remove < and > characters';
  return e;
}
