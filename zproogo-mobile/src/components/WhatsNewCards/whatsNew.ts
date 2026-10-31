export type WhatsNewItem = {
  /** gradient start colour (top-left) */
  from: string;
  /** gradient end colour (bottom-right) */
  to: string;
  /** accent colour: tag text, arrow, and the soft card shadow (CSS --c / --sh) */
  accent: string;
  /** shadow colour (CSS --sh); defaults to `accent` */
  shadow?: string;
  emoji: string;
  /** small white pill on top, e.g. "NEW" */
  tag: string;
  title: string;
  text: string;
};

/** The 5 cards from What_s_New_Auto-scrolling_Cards.html. Pass your own `items` prop to change them. */
export const DEFAULT_WHATS_NEW: WhatsNewItem[] = [
  { from: '#d84e55', to: '#ff8a5c', accent: '#d84e55', emoji: '🚌', tag: 'NEW', title: 'Live bus tracking', text: 'See where your bus is, in real time.' },
  { from: '#3b6ef5', to: '#6fa8ff', accent: '#3b6ef5', emoji: '💺', tag: 'NEW', title: 'Smarter seat pick', text: 'Window or aisle, at a glance.' },
  { from: '#119d6b', to: '#4fd1a1', accent: '#119d6b', emoji: '🛡️', tag: 'SAFETY', title: 'Share your trip', text: 'Family sees your live journey.' },
  { from: '#7a4cf0', to: '#b58bff', accent: '#7a4cf0', emoji: '⚡', tag: 'NEW', title: 'Instant refunds', text: 'Money back in seconds.' },
  { from: '#e08a00', to: '#ffc247', accent: '#d98200', shadow: '#e08a00', emoji: '👩', tag: 'NEW', title: 'Women-first seats', text: 'Sit next to women travellers.' },
];
