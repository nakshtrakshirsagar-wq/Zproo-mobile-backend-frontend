import RazorpayCheckout from 'react-native-razorpay';
import { Api } from '../../api/endpoints';

/**
 * Opens the payment for a PENDING booking.
 * mock mode (local / staging): returns 'mock' so the UI shows a "simulate success / failure" sheet.
 * razorpay mode: opens Razorpay. Whatever the SDK says, the SERVER decides the final status (webhook);
 * /payments/verify only speeds it up.
 */
export async function startPayment(bookingId: string): Promise<'mock' | 'done' | 'cancelled'> {
  const o = await Api.payOrder(bookingId);
  if (o.mode === 'mock') return 'mock';
  try {
    const r: any = await RazorpayCheckout.open({
      key: o.keyId, order_id: o.orderId, amount: o.amountPaise, currency: 'INR', name: 'Zproogo', description: `Booking ${o.bookingCode}`,
      prefill: { contact: o.prefill?.mobile, email: o.prefill?.email }, theme: { color: '#D90404' }, retry: { enabled: true, max_count: 2 },
    });
    await Api.payVerify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).catch(() => undefined);
    return 'done';
  } catch {
    return 'cancelled';
  }
}
