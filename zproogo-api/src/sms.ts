import config from './config';
import { ApiError } from './errors';

/** Sends a text message. In OTP_MODE=dev nothing is sent. */
export async function sendSms(mobile: string, text: string): Promise<void> {
  if (config.otpMode === 'dev') {
    console.log(`[dev] OTP for ${mobile} is 123456 (no SMS sent)`);
    return;
  }
  if (config.smsProvider === 'twilio') {
    const { sid, token, from } = config.twilio;
    if (!sid || !token || !from) throw new ApiError(503, 'SMS_NOT_CONFIGURED', 'SMS is not configured on the server.');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: mobile, From: from, Body: text }),
    });
    if (!res.ok) {
      console.error('Twilio error', res.status, (await res.text()).slice(0, 300));
      throw new ApiError(502, 'SMS_FAILED', 'Could not send the OTP right now. Please try again.');
    }
    return;
  }
  throw new ApiError(503, 'SMS_NOT_CONFIGURED', `Unknown SMS provider "${config.smsProvider}".`);
}
