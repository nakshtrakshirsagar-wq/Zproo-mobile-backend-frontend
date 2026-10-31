import type { IdTypeCode } from '../../utils/validation';

export type Gender = 'M' | 'F' | 'O';
export type PassengerInput = { seatId: string; name: string; age: string; gender: Gender | '' };

/** Everything the form edits. The parent owns it (useState) and passes it back in. */
export type PassengerFormValue = {
  pax: PassengerInput[];
  mobile: string;
  email: string;
  /** Optional travel-insurance add-on (billed per seat). */
  insurance: boolean;
  /** Emergency contact (always offered; switched on by default in "Booking for women" mode). */
  addEmergency: boolean;
  emergency: { name: string; mobile: string; relation: string };
  /** ID proof of the first passenger - only for operators that need it (ETS). */
  idType: IdTypeCode | '';
  idNumber: string;
};

/** Field key -> message. Keys: n0 a0 g0 (name / age / gender of passenger 0), mobile, email, idNumber, ecName, ecMobile. */
export type PassengerErrors = Record<string, string>;

/** Route header on the boarding pass. */
export type PassTrip = { from: string; to: string; fromTime?: string; toTime?: string; date?: string; durationMin?: number };
