import { api, newIdemKey } from './client';
import type { User } from '../store/auth';
import { Config } from '../config';
import { isMockTrip, mockBusPoints, mockBusSearch, mockBusSeats, mockHold } from '../mock/busMock';

/** Typed wrappers for every backend endpoint used by the app (see zproogo-api README for the full reference). */
const d = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export type BusTrip = {
  id: string; operator: string; busType: string; ac: boolean; sleeper: boolean; fromCity: string; toCity: string;
  departAt: string; arriveAt: string; durationMin: number; farePaise: number; seatsLeft: number; rating: number; ratingCount: number;
  ladiesSeats: number; womenTravelling: number; safetyRating: number; amenities: string[]; liveTracking: boolean; cctv: boolean; demoted?: boolean;
  /** Optional extras used by the results filters. When the API does not send them the matching filter simply has nothing to match. */
  busMake?: string; boardingPoints?: string[]; droppingPoints?: string[]; freeCancellation?: boolean; hasDeal?: boolean;
};
export type IdType = 'PAN' | 'AADHAAR' | 'PASSPORT' | 'DRIVING_LICENCE' | 'VOTER_ID';
export type BlockBody = {
  pax: { seatId: string; name: string; age: number; gender: 'M' | 'F' | 'O'; idType?: IdType; idNumber?: string }[];
  contact: { mobile: string; email: string }; emergencyMobile?: string; address?: string;
};
export type BlockResult = { holdId: string; expiresAt: string; basePaise: number; taxPaise: number; previousTotalPaise: number; totalPaise: number; fareChanged: boolean; blocked: boolean };
export type BusSeat = { id: string; deck: 'LOWER' | 'UPPER'; row: number; col: number; sleeper: boolean; status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
  ladiesOnly: boolean; farePaise: number; neighbourGender?: string; hint: 'LADIES' | 'RECOMMENDED' | 'CAUTION' | null };
export type Point = { id: string; name: string; address: string; time: string; wellLit?: boolean; safest?: boolean };
export type Hotel = { id: string; name: string; area: string; city: string; distanceKm: number; landmark: string; stars: number; rating: number;
  reviews: number; pricePaise: number; image: string; freeCancellation: boolean; coupleFriendly: boolean; amenities: string[]; lat: number; lng: number };
export type Room = { rateKey: string; name: string; description: string; mealPlan: string; refundable: boolean; freeCancelUntil?: string; pricePaise: number; available: number; image: string };
export type Fare = { key: string; name: string; pricePaise: number; taxPaise: number; cabinBagKg: number; checkinBagKg: number; changeFeePaise: number;
  cancelFeePaise: number; refundable: boolean; seatIncluded: boolean; mealIncluded: boolean };
export type Flight = { id: string; airline: string; airlineCode: string; flightNo: string; from: string; to: string; departAt: string; arriveAt: string;
  durationMin: number; stops: number; via?: string; terminalFrom: string; terminalTo: string; international: boolean; fares: Fare[] };
export type Train = { number: string; name: string; from: string; to: string; fromName: string; toName: string; departAt: string; arriveAt: string;
  durationMin: number; runningDays: string; classes: { code: string; farePaise: number; status: 'AVL' | 'RAC' | 'WL' | 'REGRET'; count: number; chancePct?: number }[] };
export type Breakup = { basePaise: number; taxPaise: number; addOns: { code: string; label: string; paise: number }[]; addOnsPaise: number; convPaise: number;
  convGstPaise: number; coupon: string | null; discountPaise: number; totalPaise: number; walletPaise: number; payablePaise: number; savedPaise: number };
export type Booking = { id: string; code: string; mode: string; status: string; supplierPnr: string | null; totalPaise: number; breakup: Breakup & { holdExpiresAt: string };
  details: any; contact: any; travelDate: string; womenMode: boolean; payOption: string; supplierAlert: any; rating: number | null;
  items: { id: string; kind: string; ref: string; label: string; paxName: string | null; paxGender: string | null; paxAge: number | null; pricePaise: number; status: string }[];
  refunds: any[]; events: any[]; cancellable: boolean; journeyStarted: boolean };

/** Ticket as the bus operator has it (ETS Get Ticket by Block Key). Amounts in paise. */
export type OperatorTicket = {
  blockKey: string; status: 'BOOKED' | 'BLOCKED' | 'CANCELLED' | 'TRAVELLED' | 'UNKNOWN'; pnr: string; ticketNo: string; operator: string; busType: string;
  vehicleNo: string; conductorPhone: string; fromCity: string; toCity: string; doj: string;
  boarding: { name: string; time: string; address: string; landmark: string; phone: string };
  dropping: { name: string; time: string; address: string; landmark: string; phone: string };
  passengers: { name: string; seatNo: string; age: number; gender: string; farePaise: number }[];
  totalFarePaise: number; cancellationPolicy: string; message: string; fetchedAt: string;
  ticketStatus?: string; etsNumber?: string; departureTime?: string; tripCode?: string; bookingDate?: string; cancelDate?: string;
  refundPaise?: number; paidPaise?: number; actualPaise?: number; discountPaise?: number; taxPaise?: number;
};

// cab
export type CabTripType = 'CITY' | 'AIRPORT' | 'OUTSTATION' | 'RENTAL';
export type CabCategory = 'AUTO' | 'MINI' | 'SEDAN' | 'SUV' | 'LUX';
export type LatLng = { lat: number; lng: number };
export type CabPlace = LatLng & { id: string; name: string; area: string; city: string; airport?: boolean; serviceable: boolean };
export type CabTripReq = { tripType: CabTripType; pickupId: string; dropId?: string | null; when: 'NOW' | 'LATER'; pickupAt?: string | null;
  roundTrip?: boolean; returnAt?: string | null; rentalPackage?: string | null; women?: boolean };
export type CabOption = { category: CabCategory; label: string; examples: string; seats: number; bags: number; available: boolean; unavailableReason?: string;
  etaMin: number | null; womenDriver: boolean; farePaise: number; basePaise: number; taxPaise: number; surge: number; lines: { code: string; label: string; paise: number }[];
  rules: { extraKmPaise: number; extraMinPaise: number; waitPerMinPaise: number; freeWaitMin: number; includedKm?: number; includedHours?: number; chargeableKm?: number; days?: number } };
export type CabEstimate = { trip: { title: string; tripType: CabTripType; tripLabel: string; pickup: CabPlace; drop: CabPlace | null; pickupAt: string; now: boolean;
  roundTrip: boolean; returnAt: string | null; rentalPackage: string | null; women: boolean };
  route: { distanceKm: number; durationMin: number; path: LatLng[] } | null; options: CabOption[]; notices: string[]; fareLockMin: number };
export type CabDriver = { name: string; gender: string; phone: string; rating: number; trips: number; vehicleNo: string; vehicleModel: string; vehicleColor: string; verified: boolean };
export type CabRide = { bookingId: string; code: string; rideId: string | null; status: string; stage: string; stageLabel: string; message: string | null;
  etaMin: number | null; position: LatLng | null; driver: CabDriver | null; otp: string | null; waitingMin: number; freeWaitMin: number; distanceKm: number | null;
  times: { assignedAt: string | null; arrivedAt: string | null; startedAt: string | null; completedAt: string | null };
  trip: { title: string; tripType: CabTripType; tripLabel: string; categoryLabel: string; examples: string; pickup: CabPlace; drop: CabPlace | null; pickupAt: string; now: boolean;
    rentalLabel: string | null; roundTrip: boolean; returnAt: string | null; distanceKm: number | null; durationMin: number | null; women: boolean };
  payOption: string; paidPaise: number; amountDuePaise: number; canCancel: boolean; cancelFeePaise: number | null; cancelNote: string | null; rated: boolean };

type Tokens = { accessToken: string; refreshToken: string; expiresInSec: number; user: User };

/** Bus data source (see Config.BUS_DATA): sample data in 'mock' mode, or when the server is unreachable in 'fallback' mode. */
const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));
async function busData<T>(real: () => Promise<T>, mock: () => T, opts: { forceMock?: boolean; useMockIf?: (r: T) => boolean } = {}): Promise<T> {
  if (opts.forceMock || Config.BUS_DATA === 'mock') { await wait(); return mock(); }
  if (Config.BUS_DATA === 'api') return real();
  try {
    const r = await real();
    return opts.useMockIf?.(r) ? mock() : r;
  } catch (e: any) {
    if (e?.code === 'NETWORK' || (e?.status ?? 0) >= 500) return mock();
    throw e;
  }
}

export const Api = {
  // auth
  sendOtp: (mobile: string) => d(api.post<{ expiresInSec: number; resendInSec: number }>('/auth/otp/send', { mobile })),
  verifyOtp: (mobile: string, otp: string) => d(api.post<Tokens & { isNew?: boolean; linked?: boolean; user: User }>('/auth/otp/verify', { mobile, otp })),
  google: (idToken: string) => d(api.post<Tokens & { needsMobile: boolean }>('/auth/google', { idToken })),
  logout: () => d(api.post('/auth/logout')),
  mergeGuest: () => d(api.post<{ holdsMerged: number; searchesMerged: number; savedTravellers: number }>('/auth/merge-guest')),

  // config, offers, profile
  appConfig: () => d(api.get<any>('/app-config')),
  offers: () => d(api.get<{ code: string; title: string; description: string; modes: string[]; gradient: string | null }[]>('/offers')),
  recentSearches: () => d(api.get<{ mode: string; label: string; query: any }[]>('/recent-searches')),
  registerDevice: (fcmToken?: string) => d(api.post('/devices', { fcmToken, appVersion: '1.0.0', platform: 'android' })),
  me: () => d(api.get<User>('/me')),
  updateMe: (b: Partial<User>) => d(api.patch<User>('/me', b)),
  deleteMe: () => d(api.delete('/me')),
  linkIrctc: (username: string) => d(api.post('/me/irctc', { username })),
  travellers: () => d(api.get<any[]>('/me/travellers')),
  addTraveller: (b: any) => d(api.post('/me/travellers', b)),
  deleteTraveller: (id: string) => d(api.delete('/me/travellers/' + id)),
  contacts: () => d(api.get<any[]>('/me/emergency-contacts')),
  addContact: (b: any) => d(api.post('/me/emergency-contacts', b)),
  deleteContact: (id: string) => d(api.delete('/me/emergency-contacts/' + id)),

  // bus
  busSearch: (q: { from: string; to: string; date: string; women?: boolean; sort?: string }) =>
    busData(() => d(api.get<{ count: number; trips: BusTrip[]; nearbyDates: string[] }>('/bus/search', { params: { ...q, women: q.women ? 'true' : undefined } })),
      () => mockBusSearch(q), { useMockIf: (r) => !r.trips?.length }),
  busStations: () => d(api.get<{ supplier: string; count: number; stations: { id: string; name: string }[] }>('/bus/stations')),
  busSeats: (tripId: string, women: boolean) =>
    busData(() => d(api.get<{ decks: string[]; seats: BusSeat[]; maxSeats: number }>(`/bus/trips/${encodeURIComponent(tripId)}/seats`, { params: { women } })),
      () => mockBusSeats(tripId), { forceMock: isMockTrip(tripId) }),
  busPoints: (tripId: string, women: boolean) =>
    busData(() => d(api.get<{ boarding: Point[]; dropping: Point[] }>(`/bus/trips/${encodeURIComponent(tripId)}/points`, { params: { women } })),
      () => mockBusPoints(tripId, women), { forceMock: isMockTrip(tripId) }),
  busTrack: (bookingId: string) => d(api.get<any>('/bus/track/' + bookingId)),

  // hotel
  hotelSearch: (q: any) => d(api.get<{ count: number; hotels: Hotel[] }>('/hotel/search', { params: q })),
  hotelTop: (city: string) => d(api.get<Hotel[]>('/hotel/top', { params: { city } })),
  hotel: (id: string) => d(api.get<any>('/hotel/' + encodeURIComponent(id))),
  hotelRooms: (id: string, q: any) => d(api.get<Room[]>(`/hotel/${encodeURIComponent(id)}/rooms`, { params: q })),

  // flight
  airports: () => d(api.get<{ code: string; city: string; country: string }[]>('/flight/airports')),
  flightSearch: (b: any) => d(api.post<{ outbound: Flight[]; inbound: Flight[]; calendar: { date: string; minPaise: number }[]; international: boolean }>('/flight/search', b)),
  reprice: (fareKey: string) => d(api.post<{ pricePaise: number; changed: boolean; previousPaise: number }>('/flight/reprice', { fareKey })),
  seatMap: (fareKey: string) => d(api.post<{ seats: { id: string; row: number; col: string; status: string; pricePaise: number; exit: boolean }[] }>('/flight/seat-map', { fareKey })),
  entryRules: (b: any) => d(api.post<any>('/flight/entry-rules', b)),
  flightStatus: (bookingId: string) => d(api.get<any>('/flight/status/' + bookingId)),

  // train
  trainSearch: (q: any) => d(api.get<{ trains: Train[]; tatkal?: { open: boolean; opensAt: string } }>('/train/search', { params: q })),
  pnr: (pnr: string) => d(api.get<any>('/train/pnr/' + pnr)),

  // cab
  cabPlaces: (q: string, city?: string) => d(api.get<CabPlace[]>('/cab/places', { params: { q, city } })),
  cabNearest: (lat: number, lng: number) => d(api.get<CabPlace>('/cab/places/nearest', { params: { lat, lng } })),
  cabEstimate: (b: CabTripReq) => d(api.post<CabEstimate>('/cab/estimate', b)),
  cabRide: (bookingId: string) => d(api.get<CabRide>('/cab/rides/' + bookingId)),

  // holds, checkout, bookings
  hold: (b: any) => (b?.mode === 'BUS' && isMockTrip(String(b.tripId)))
    ? wait(300).then(() => mockHold(b))
    : d(api.post<{ holdId: string; mode: any; expiresAt: string; basePaise: number; taxPaise: number; summary: any; supplier?: string; needsBlock?: boolean }>('/holds', b)),
  /** BUS (ETS BlockTicket): reserve the seats for 10 minutes once passenger details are known. */
  blockHold: (holdId: string, b: BlockBody) => d(api.post<BlockResult>(`/holds/${holdId}/block`, b)),
  releaseHold: (id: string) => d(api.delete('/holds/' + id)),
  quote: (holdId: string, b: any) => d(api.post<Breakup & { expiresAt: string; paxCount: number }>(`/holds/${holdId}/quote`, b)),
  createBooking: (b: any) => d(api.post<Booking>('/bookings', b, { headers: { 'Idempotency-Key': newIdemKey() } })),
  bookings: (tab: string) => d(api.get<any[]>('/bookings', { params: { tab } })),
  booking: (id: string) => d(api.get<Booking>('/bookings/' + id)),
  operatorTicket: (id: string, refresh = false) => d(api.get<{ ticket: OperatorTicket; cached: boolean }>(`/bookings/${id}/supplier-ticket`, { params: refresh ? { refresh: 'true' } : undefined })),
  rate: (id: string, b: any) => d(api.post<{ pointsEarned: number; points: number }>(`/bookings/${id}/rating`, b)),
  supplierChoice: (id: string, choice: 'REFUND' | 'CREDIT') => d(api.post<Booking>(`/bookings/${id}/supplier-choice`, { choice })),
  payOrder: (bookingId: string) => d(api.post<{ orderId: string; amountPaise: number; keyId: string; mode: 'mock' | 'razorpay'; prefill: any; bookingCode: string }>(
    '/payments/order', { bookingId }, { headers: { 'Idempotency-Key': 'pay-' + bookingId } })),
  payVerify: (b: { orderId: string; paymentId: string; signature: string }) => d(api.post<{ status: string }>('/payments/verify', b)),
  payMock: (bookingId: string, outcome: 'success' | 'failure') => d(api.post<{ status: string }>('/payments/mock/complete', { bookingId, outcome })),

  // cancellation, refunds, wallet
  cancelQuote: (bookingId: string, itemIds?: string[]) => d(api.post<any>('/cancellations/quote', { bookingId, itemIds })),
  cancel: (b: any) => d(api.post<any>('/cancellations', b, { headers: { 'Idempotency-Key': newIdemKey() } })),
  refunds: () => d(api.get<any[]>('/refunds')),
  refund: (id: string) => d(api.get<any>('/refunds/' + id)),
  refundPayout: (id: string, b: any) => d(api.post<any>(`/refunds/${id}/payout`, b)),
  wallet: () => d(api.get<{ balancePaise: number; points: number; entries: { id: string; amountPaise: number; type: string; note: string; at: string }[] }>('/wallet')),

  // safety & support
  sos: (bookingId: string, lat: number, lng: number) => d(api.post<{ sent: boolean; notified: number; link: string }>('/safety/sos', { bookingId, lat, lng })),
  share: (bookingId: string, lat?: number, lng?: number) => d(api.post<{ link: string }>('/safety/share', { bookingId, lat, lng })),
  location: (bookingId: string, lat: number, lng: number) => d(api.post('/safety/location', { bookingId, lat, lng })),
  tickets: () => d(api.get<any[]>('/support/tickets')),
  raiseTicket: (b: any) => d(api.post('/support/tickets', b)),
  faqs: () => d(api.get<{ q: string; a: string }[]>('/support/faqs')),
};
