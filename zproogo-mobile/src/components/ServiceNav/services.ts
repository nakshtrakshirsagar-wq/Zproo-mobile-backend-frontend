import type { VoyageName } from './VoyageIcon';

/** Single list of bookable services. Use it anywhere you need a service's icon, label or route. */
export const SERVICES = [
  { key: 'BUS', label: 'Bus', icon: 'bus', route: 'BusSearch' },
  { key: 'TRAIN', label: 'Train', icon: 'train', route: 'TrainSearch' },
  { key: 'FLIGHT', label: 'Flight', icon: 'plane', route: 'FlightSearch' },
  { key: 'HOTEL', label: 'Hotel', icon: 'hotel', route: 'HotelSearch' },
  { key: 'CAB', label: 'Cab', icon: 'car', route: 'CabSearch' },
  { key: 'PARCEL', label: 'Parcel', icon: 'box', route: 'ParcelHome' },
  { key: 'BIKE', label: 'Bike', icon: 'bike', route: 'BikeHome' },
] as const satisfies readonly { key: string; label: string; icon: VoyageName; route: string }[];

export type ServiceKey = (typeof SERVICES)[number]['key'];
export const serviceIcon = (key: string): VoyageName | undefined => SERVICES.find((s) => s.key === key)?.icon;
