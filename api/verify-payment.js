import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.'
    });
    return;
  }

  try {
    const { RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_SECRET) {
      res.status(500).json({
        success: false,
        error: 'Razorpay secret env var missing'
      });
      return;
    }

    const body = req.body || {};
    const payment_id = body.razorpay_payment_id;
    const order_id = body.razorpay_order_id;
    const signature = body.razorpay_signature;

    if (!payment_id || !order_id || !signature) {
      res.status(400).json({
        success: false,
        error: 'Missing payment verification fields'
      });
      return;
    }

    const payload = `${order_id}|${payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      res.status(400).json({
        success: false,
        error: 'Signature mismatch'
      });
      return;
    }

    // NOTE: This route verifies payment signature only.
    // Premium role update should happen client-side or via another secure API.
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      details: err?.message || String(err),
    });
  }
}

