import Razorpay from 'razorpay';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Vercel / Next-style API routes style; however Vercel supports Node serverless too.
  // Enforce POST only.
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.'
    });
    return;
  }

  try {
    const {
      RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET,
    } = process.env;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      res.status(500).json({
        success: false,
        error: 'Razorpay env vars missing'
      });
      return;
    }

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    // Body parsing differs across runtimes; safest is to accept req.body if present.
    const body = req.body || {};
    const amount = Number(body.amount);
    const currency = body.currency || 'INR';

    // Receipt must be <= 40 chars in Razorpay (and to avoid repo bug)
    const userReceipt = typeof body.receipt === 'string' ? body.receipt : '';
    const receiptRaw = userReceipt || `rcpt_${Date.now()}`;
    const receipt = receiptRaw.slice(0, 40);

    if (!Number.isFinite(amount) || amount < 100) {
      res.status(400).json({
        success: false,
        error: 'Invalid amount. Minimum is 100 paise.'
      });
      return;
    }

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err) {
    const message = err?.message || String(err);
    // Always return valid JSON
    res.status(500).json({
      success: false,
      error: 'Razorpay order creation failed',
      details: message,
    });
  }
}

