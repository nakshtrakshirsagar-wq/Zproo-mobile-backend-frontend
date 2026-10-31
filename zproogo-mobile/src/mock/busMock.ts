import dayjs from 'dayjs';
import type { BusSeat, BusTrip, Point } from '../api/endpoints';

/**
 * Front-end sample data for the bus flow (search results, seat map, boarding / dropping points).
 * Everything is generated from the search (from / to / date) so the same search always shows the same buses.
 * Switch it on / off with Config.BUS_DATA ('mock' | 'fallback' | 'api') in src/config.ts.
 */
export const MOCK_PREFIX = 'mock-';
export const isMockTrip = (id: string) => id.startsWith(MOCK_PREFIX);

type Kind = 'SLEEPER' | 'SEATER' | 'MIXED';
type Op = { name: string; type: string; kind: Kind; ac: boolean; baseRupees: number; rating: number; ratingCount: number; dep: [number, number]; amenities: string[]; make?: string };

const OPS: Op[] = [
  { name: 'Neeta Travels', type: 'Volvo B11R Multi-Axle AC Sleeper (2+1)', kind: 'SLEEPER', ac: true, baseRupees: 1099, rating: 4.6, ratingCount: 2140, dep: [21, 30], amenities: ['WiFi', 'Charging point', 'Water bottle', 'Blanket', 'Reading light'], make: 'Volvo' },
  { name: 'VRL Travels', type: 'AC Sleeper (2+1)', kind: 'SLEEPER', ac: true, baseRupees: 949, rating: 4.4, ratingCount: 3890, dep: [22, 15], amenities: ['Charging point', 'Water bottle', 'Blanket'] },
  { name: 'Purple Travels', type: 'Mercedes Benz AC Seater (2+2)', kind: 'SEATER', ac: true, baseRupees: 799, rating: 4.3, ratingCount: 1260, dep: [7, 0], amenities: ['WiFi', 'Charging point', 'Water bottle', 'Snacks'], make: 'Mercedes' },
  { name: 'Shivneri (MSRTC)', type: 'AC Seater (2+2)', kind: 'SEATER', ac: true, baseRupees: 549, rating: 4.1, ratingCount: 5210, dep: [6, 15], amenities: ['Charging point', 'Water bottle'] },
  { name: 'Orange Tours', type: 'Scania Multi-Axle AC Sleeper (2+1)', kind: 'SLEEPER', ac: true, baseRupees: 1249, rating: 4.7, ratingCount: 980, dep: [23, 30], amenities: ['WiFi', 'Charging point', 'Water bottle', 'Blanket', 'Reading light', 'Movie'], make: 'Scania' },
  { name: 'Kallada Travels', type: 'Non-AC Sleeper (2+1)', kind: 'SLEEPER', ac: false, baseRupees: 699, rating: 3.9, ratingCount: 1750, dep: [20, 45], amenities: ['Charging point', 'Water bottle'] },
  { name: 'SRS Travels', type: 'Bharat Benz AC Seater / Sleeper (2+2)', kind: 'MIXED', ac: true, baseRupees: 899, rating: 4.2, ratingCount: 2330, dep: [21, 0], amenities: ['WiFi', 'Charging point', 'Blanket'], make: 'Bharat Benz' },
  { name: 'Jabbar Travels', type: 'Non-AC Seater (2+2)', kind: 'SEATER', ac: false, baseRupees: 399, rating: 3.7, ratingCount: 640, dep: [5, 30], amenities: ['Water bottle'] },
  { name: 'IntrCity SmartBus', type: 'AC Seater (2+2)', kind: 'SEATER', ac: true, baseRupees: 749, rating: 4.5, ratingCount: 4120, dep: [13, 15], amenities: ['WiFi', 'Charging point', 'Water bottle', 'Snacks'] },
  { name: 'Raj National Express', type: 'Volvo AC Seater (2+2)', kind: 'SEATER', ac: true, baseRupees: 849, rating: 4.0, ratingCount: 870, dep: [16, 45], amenities: ['Charging point', 'Water bottle', 'Movie'], make: 'Volvo' },
  { name: 'Paulo Travels', type: 'AC Sleeper (2+1)', kind: 'SLEEPER', ac: true, baseRupees: 999, rating: 4.4, ratingCount: 1510, dep: [22, 45], amenities: ['WiFi', 'Charging point', 'Blanket', 'Reading light'] },
  { name: 'Hans Travels', type: 'Non-AC Seater / Sleeper (2+2)', kind: 'MIXED', ac: false, baseRupees: 599, rating: 3.8, ratingCount: 420, dep: [19, 30], amenities: ['Water bottle', 'Charging point'] },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** Small deterministic random generator (mulberry32). */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Remembers the searched trips so seats / points can show the real city names and times. */
const TRIPS = new Map<string, BusTrip>();
const makeId = (i: number, from: string, to: string, date: string) => `${MOCK_PREFIX}${i}-${slug(from)}-${slug(to)}-${date}`;
const opIndex = (tripId: string) => Math.min(OPS.length - 1, Math.max(0, parseInt(tripId.slice(MOCK_PREFIX.length), 10) || 0));
const parts = (tripId: string) => tripId.slice(MOCK_PREFIX.length).split('-');

// ------------------------------------------------------------------ seats
function deckSeats(tripId: string, deck: 'LOWER' | 'UPPER', sleeper: boolean, fareRupees: number): BusSeat[] {
  const rand = rng(hash(tripId + deck));
  const out: BusSeat[] = [];
  const price = Math.round(fareRupees * (sleeper && deck === 'UPPER' ? 0.9 : 1) * 100);
  if (!sleeper) {
    // 10 rows x [D C | aisle | B A]
    const L: Record<number, string> = { 0: 'D', 1: 'C', 3: 'B', 4: 'A' };
    for (let r = 1; r <= 10; r++) [0, 1, 3, 4].forEach((c) => {
      const id = `${r}${L[c]}`;
      const ladies = r <= 2 && c >= 3 ? rand() < 0.75 : r === 4 && c === 4;
      out.push({ id, deck, row: r, col: c, sleeper: false, status: rand() < 0.28 ? 'BOOKED' : 'AVAILABLE', ladiesOnly: ladies, farePaise: price, hint: ladies ? 'LADIES' : null });
    });
  } else {
    // 5 rows x [C B | aisle | A]
    const L: Record<number, string> = { 0: 'C', 1: 'B', 3: 'A' };
    const pre = deck === 'LOWER' ? 'L' : 'U';
    for (let r = 1; r <= 5; r++) [0, 1, 3].forEach((c) => {
      const id = `${pre}${r}${L[c]}`;
      const ladies = (r === 1 && c === 0) || (r === 5 && c === 3) || (r === 2 && c === 0 && deck === 'UPPER');
      out.push({ id, deck, row: r, col: c, sleeper: true, status: rand() < 0.3 ? 'BOOKED' : 'AVAILABLE', ladiesOnly: ladies, farePaise: price, hint: ladies ? 'LADIES' : null });
    });
  }
  return out;
}

export function mockSeatsFor(tripId: string): BusSeat[] {
  const op = OPS[opIndex(tripId)];
  const fare = op.baseRupees + (hash(tripId) % 5) * 20;
  if (op.kind === 'SEATER') return deckSeats(tripId, 'LOWER', false, fare);
  if (op.kind === 'SLEEPER') return [...deckSeats(tripId, 'LOWER', true, fare), ...deckSeats(tripId, 'UPPER', true, fare)];
  return [...deckSeats(tripId, 'LOWER', false, fare), ...deckSeats(tripId, 'UPPER', true, fare)];
}

export function mockBusSeats(tripId: string) {
  const seats = mockSeatsFor(tripId);
  const decks = [...new Set(seats.map((s) => s.deck))];
  return { decks, seats, maxSeats: 6 };
}

// ------------------------------------------------------------------ search
export function mockBusSearch(q: { from: string; to: string; date: string; women?: boolean }) {
  const route = hash(slug(q.from) + slug(q.to));
  const baseDur = 240 + (route % 420); // 4h - 11h
  const trips: BusTrip[] = OPS.map((op, i) => {
    const id = makeId(i, q.from, q.to, q.date);
    const seats = mockSeatsFor(id);
    const free = seats.filter((s) => s.status === 'AVAILABLE');
    const rand = rng(hash(id));
    const departAt = dayjs(q.date).hour(op.dep[0]).minute(op.dep[1]).second(0);
    const durationMin = Math.round((baseDur + (op.ac ? -15 : 25) + Math.floor(rand() * 40)) / 5) * 5;
    return {
      id, operator: op.name, busType: op.type, ac: op.ac, sleeper: op.kind !== 'SEATER', fromCity: q.from, toCity: q.to,
      departAt: departAt.format('YYYY-MM-DDTHH:mm:ss'), arriveAt: departAt.add(durationMin, 'minute').format('YYYY-MM-DDTHH:mm:ss'), durationMin,
      farePaise: free.length ? Math.min(...free.map((s) => s.farePaise)) : 0,
      seatsLeft: free.length, rating: op.rating, ratingCount: op.ratingCount,
      ladiesSeats: free.filter((s) => s.ladiesOnly).length, womenTravelling: Math.floor(rand() * 9), safetyRating: Math.round((3.8 + rand() * 1.2) * 10) / 10,
      amenities: op.amenities, liveTracking: op.ac || rand() > 0.5, cctv: op.ac, demoted: false,
      busMake: op.make, boardingPoints: boardingNames(q.from).slice(0, 3), droppingPoints: droppingNames(q.to).slice(0, 3),
      freeCancellation: i % 3 !== 2, hasDeal: i % 4 === 0,
    };
  }).filter((t) => t.seatsLeft > 0);
  trips.forEach((t) => TRIPS.set(t.id, t));
  return { count: trips.length, trips, nearbyDates: [] as string[] };
}

// ------------------------------------------------------------------ boarding / dropping
const boardingNames = (city: string) => [`${city} Central Bus Stand`, `${city} Railway Station`, `${city} Highway Junction`, `${city} City Mall Gate`, `${city} Metro Stop`];
const droppingNames = (city: string) => [`${city} Main Bus Stand`, `${city} Railway Station`, `${city} Airport Road`, `${city} Market Circle`, `${city} Ring Road Bypass`];

export function mockBusPoints(tripId: string, women: boolean) {
  const cached = TRIPS.get(tripId);
  const p = parts(tripId);
  const date = p.slice(3).join('-') || dayjs().format('YYYY-MM-DD');
  const op = OPS[opIndex(tripId)];
  const dep = cached ? dayjs(cached.departAt) : dayjs(date).hour(op.dep[0]).minute(op.dep[1]).second(0);
  const arr = cached ? dayjs(cached.arriveAt) : dep.add(300, 'minute');
  const f = cached?.fromCity ?? p[1] ?? 'City', t = cached?.toCity ?? p[2] ?? 'City';
  const boarding: Point[] = boardingNames(f).slice(0, 4).map((name, i) => ({
    id: `B${i + 1}`, name, address: i === 0 ? `Near the main entrance, ${f}` : `Pickup point ${i + 1}, ${f}`,
    time: dep.subtract(40 - i * 10, 'minute').format('YYYY-MM-DDTHH:mm:ss'), wellLit: i < 3, safest: i === 0,
  }));
  const dropping: Point[] = droppingNames(t).slice(0, 4).map((name, i) => ({
    id: `D${i + 1}`, name, address: `Drop point ${i + 1}, ${t}`, time: arr.subtract(30 - i * 12, 'minute').format('YYYY-MM-DDTHH:mm:ss'),
  }));
  if (women) boarding.sort((a, b) => Number(!!b.safest) - Number(!!a.safest) || Number(!!b.wellLit) - Number(!!a.wellLit));
  return { boarding, dropping };
}

// ------------------------------------------------------------------ seat hold (so Boarding -> Passengers works without a server)
export function mockHold(b: { tripId: string; seatIds: string[] }) {
  const seats = mockSeatsFor(b.tripId).filter((s) => b.seatIds.includes(s.id));
  const base = seats.reduce((a, s) => a + s.farePaise, 0);
  return {
    holdId: `${MOCK_PREFIX}hold-${Date.now()}`, mode: 'BUS' as const, expiresAt: dayjs().add(10, 'minute').toISOString(), basePaise: base, taxPaise: Math.round(base * 0.05),
    summary: { seats: b.seatIds, ladiesSeats: seats.filter((s) => s.ladiesOnly).map((s) => s.id) }, supplier: 'mock', needsBlock: false,
  };
}
