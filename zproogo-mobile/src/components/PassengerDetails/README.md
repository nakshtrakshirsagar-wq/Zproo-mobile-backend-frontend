# PassengerDetails

"Boarding pass" design of `passenger-details-designs-mobile.html`: gradient route header, one block per passenger
(seat badge + name / age / gender), dashed tear line, and a stub with ticket contact, optional ID proof, emergency contact, insurance and total.

```tsx
const [form, setForm] = useState<PassengerFormValue>(...);
const errors = validatePassengerForm(form, { ladiesSeatIds, needsId });

<PassengerDetails trip={{ from, to, fromTime, toTime, date, durationMin }} value={form} onChange={setForm}
  errors={errors} submitted={submitted} ladiesSeatIds={ladiesSeatIds} needsId={needsId} totalPaise={total} registerField={registerField} />
```

- Controlled: the parent keeps the form state; `validatePassengerForm` (pure, unit-tested) returns `{ n0, a0, g0, mobile, email, idNumber, ecName, ecMobile }`.
- An error shows after a field was left (blur) or for all fields once `submitted` is true; typing is sanitised (letters only in names, digits only in age / mobile).
- Rules: name letters only 2-60, age 1-110, gender required (Female on a ladies seat, no "Other" when ID proof is needed), no duplicate passengers,
  10-digit Indian mobile starting 6-9, valid email, ID number format (PAN / Aadhaar / ...), emergency contact different from the booker.
- Used by `features/bus/BusPassengers.tsx`.
