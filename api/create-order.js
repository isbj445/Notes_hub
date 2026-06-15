import Razorpay from 'razorpay';
import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    return;
  }

  return (async () => {
    try {
      const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        res.status(500).json({ success: false, error: 'Razorpay env vars missing' });
        return;
      }

      const body = req.body ?? {};
      const amount = Number(body.amount);
      const currency = body.currency || 'INR';

      const userReceipt = typeof body.receipt === 'string' ? body.receipt : '';
      const receiptRaw = userReceipt || `rcpt_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
      const receipt = receiptRaw.slice(0, 40);

      if (!Number.isFinite(amount) || amount < 100) {
        res.status(400).json({ success: false, error: 'Invalid amount. Minimum is 100 paise.' });
        return;
      }

      const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
      const order = await razorpay.orders.create({ amount, currency, receipt });

      res.status(200).json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Razorpay order creation failed',
        details: err?.message || String(err),
      });
    }
  })();
}

