import dayjs from 'dayjs';

export const rupees = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN');
export const rupeesExact = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const time = (iso: string) => dayjs(iso).format('hh:mm A');
export const time24 = (iso: string) => dayjs(iso).format('HH:mm');
export const dateShort = (iso: string) => dayjs(iso).format('ddd, D MMM');
export const dateLong = (iso: string) => dayjs(iso).format('ddd, D MMM YYYY');
export const ymd = (d: dayjs.Dayjs | Date | string) => dayjs(d).format('YYYY-MM-DD');
export const duration = (min: number) => `${Math.floor(min / 60)}h ${min % 60 ? (min % 60) + 'm' : ''}`.trim();
export const initials = (name?: string | null) => (name ?? 'G').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
export const toE164 = (tenDigits: string) => '+91' + tenDigits.replace(/\D/g, '').slice(-10);
