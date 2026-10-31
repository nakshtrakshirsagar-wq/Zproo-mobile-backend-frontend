export type OfferKind = 'flight' | 'bus' | 'train' | 'cab' | 'hotel' | 'bike' | 'parcel';

export type OfferItem = {
  kind: OfferKind;
  /** small label on top, e.g. "Flights" */
  tag: string;
  /** big headline, e.g. "₹1,500" */
  big: string;
  /** small text after the headline, e.g. "off" */
  small?: string;
  /** put `small` on its own line under `big` */
  newline?: boolean;
  desc: string;
  /** promo code chip; omit for no chip */
  code?: string;
};

/** The 7 cards from Offer_Cards.html. Pass your own `offers` prop to change the text. */
export const DEFAULT_OFFERS: OfferItem[] = [
  { kind: 'flight', tag: 'Flights', big: '₹1,500', small: 'off', desc: 'On domestic flights above ₹5,000', code: 'FLYHIGH' },
  { kind: 'bus', tag: 'Bus', big: '20%', small: 'off', desc: 'Up to ₹250 on your first bus ride', code: 'BUS20' },
  { kind: 'train', tag: 'Trains', big: 'Zero', small: 'booking fee', newline: true, desc: 'On all train tickets this week' },
  { kind: 'cab', tag: 'Cabs', big: 'Flat ₹100', small: 'off', desc: 'On your next 3 city rides', code: 'RIDE100' },
  { kind: 'hotel', tag: 'Hotels', big: 'Up to 40%', small: 'off', desc: 'Stay 2 nights, get breakfast free', code: 'STAY40' },
  { kind: 'bike', tag: 'Bike rentals', big: '₹199', small: 'per day', newline: true, desc: 'Helmets included' },
  { kind: 'parcel', tag: 'Parcels', big: '₹50', small: 'off', desc: 'On your first parcel pickup', code: 'SHIP50' },
];
