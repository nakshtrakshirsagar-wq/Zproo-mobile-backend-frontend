export type BusOfferTheme = 'sand' | 'plum' | 'navy' | 'green' | 'stone' | 'dark';

export type BusOfferItem = {
  theme: BusOfferTheme;
  /** colour of the little bus on the card */
  bus: string;
  /** small label on top, e.g. "First ride" */
  tag: string;
  /** big headline, e.g. "20%" */
  big: string;
  /** small text after the headline, e.g. "off" */
  small?: string;
  desc: string;
  /** promo code; tapping the chip copies it. Omit for no chip. */
  code?: string;
};

/** The 6 cards from Bus_Offer_Cards_Option3.2.html. Pass your own `offers` prop to change the text. */
export const DEFAULT_BUS_OFFERS: BusOfferItem[] = [
  { theme: 'sand', bus: '#fff1dc', tag: 'First ride', big: '20%', small: 'off', desc: 'Up to ₹250 on your first bus booking', code: 'BUS20' },
  { theme: 'plum', bus: '#efe6ff', tag: 'Women travellers', big: '₹150', small: 'off', desc: 'On bookings above ₹800 with women-only seats', code: 'SHEROUTE' },
  { theme: 'navy', bus: '#e3efff', tag: 'Sleeper buses', big: 'Flat 15%', small: 'off', desc: 'On overnight sleeper & Volvo routes', code: 'NIGHT15' },
  { theme: 'green', bus: '#dcfaf2', tag: 'Round trip', big: 'Extra ₹200', small: 'off', desc: 'Book onward + return together and save', code: 'ROUND200' },
  { theme: 'stone', bus: '#ffe3ea', tag: 'Students', big: '10%', small: 'off', desc: 'Show your student ID. Valid Mon–Thu', code: 'STUDY10' },
  { theme: 'dark', bus: '#f0c978', tag: 'Zero fee', big: 'No convenience', small: 'fee', desc: 'On all bus tickets this weekend' },
];
