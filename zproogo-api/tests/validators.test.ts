import test from 'node:test';
import assert from 'node:assert';
import { parseMobile, parseOtp, isEmail, collapse } from '../src/validators';
import type { ApiError } from '../src/errors';

const code = (c: string) => (e: unknown) => (e as ApiError).code === c;

test('parseMobile accepts E.164 numbers the app sends', () => {
  assert.strictEqual(parseMobile('+919876543210'), '+919876543210');
  assert.strictEqual(parseMobile(' +14155550123 '), '+14155550123');
});
test('parseMobile rejects bad numbers', () => {
  for (const bad of ['9876543210', '+0123456789', '+91 98765 43210', '', null, undefined, 12345, '+91abc']) {
    assert.throws(() => parseMobile(bad), code('INVALID_MOBILE'));
  }
});
test('parseOtp needs exactly 6 digits', () => {
  assert.strictEqual(parseOtp('123456'), '123456');
  for (const bad of ['12345', '1234567', 'abcdef', '', null]) assert.throws(() => parseOtp(bad), code('INVALID_OTP'));
});
test('isEmail / collapse', () => {
  assert.ok(isEmail('a@b.co')); assert.ok(!isEmail('nope')); assert.ok(!isEmail(5));
  assert.strictEqual(collapse('  Ravi   Kumar '), 'Ravi Kumar');
});
