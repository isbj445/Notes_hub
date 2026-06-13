import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Crown, Check, Zap, Shield, Loader2, ArrowRight } from 'lucide-react';

export const PremiumPage = () => {
  const { user, profile, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleUpgrade = async () => {
    if (!user) {
      alert('Please login to upgrade');
      return;
    }

    setLoading(true);

    try {
      // Load Razorpay checkout.js
      await new Promise<void>((resolve, reject) => {
        if (document.querySelector('script[data-razorpay-checkout="true"]')) return resolve();

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
        script.setAttribute('data-razorpay-checkout', 'true');
        document.body.appendChild(script);
      });

      // STEP 1: Create Razorpay order
      const amountPaise = plan === 'yearly' ? 99900 : 9900; // keep existing UI prices

      console.log('PremiumPage: creating Razorpay order...');
      const createOrderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `receipt_${user.id}_${Date.now()}`
        })
      });

      const createOrderText = await createOrderRes.text();
      const createOrderData = createOrderText ? JSON.parse(createOrderText) : {};
      console.log('PremiumPage: /api/create-order response', { ok: createOrderRes.ok, status: createOrderRes.status, createOrderData });

      if (!createOrderRes.ok || !createOrderData?.success) {
        throw new Error(createOrderData?.error ?? 'Failed to create Razorpay order');
      }

      const { order_id } = createOrderData as { order_id: string };

      // STEP 2: Open Razorpay modal
      const razorpayOptions: any = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amountPaise,
        currency: 'INR',
        name: 'SmartNote',
        description: plan === 'yearly' ? 'Yearly Premium' : 'Monthly Premium',
        order_id,
          prefill: {
            name: (user as any)?.name ?? undefined,
            email: user?.email ?? undefined
          },
        theme: {
          color: '#f59e0b'
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData?.success) {
              throw new Error(verifyData?.error ?? 'Payment verification failed');
            }

            // Mark user as premium only after signature verification succeeds
            const { error } = await supabase
              .from('users')
              .update({ role: 'premium' })
              .eq('id', user.id);

            if (error) throw error;

            alert('Payment Successful! You are now a Premium member.');
            window.location.reload();
          } catch (e: any) {
            console.error('Post-payment error:', e);
            alert(e?.message ?? 'Payment failed verification');
          } finally {
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(razorpayOptions);

      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment.failed:', response);
        alert(response?.error?.description ?? 'Payment failed');
        setLoading(false);
      });

      // Detect modal dismiss/cancel
      rzp.on('modal.dismiss', function () {
        setLoading(false);
      });

      rzp.open();
    } catch (error: any) {
      console.error('Payment Error:', error);
      alert(error?.message ?? 'Failed to upgrade to premium');
      setLoading(false);
    }
  };

  const features = [
    "Unlimited downloads of all notes",
    "Access to exclusive Premium notes",
    "Ad-free browsing experience",
    "Priority support from top contributors",
    "Early access to new features",
    "Premium badge on your profile"
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-6"
        >
          <Crown className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </motion.div>
        <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
          Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500">Premium</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Join thousands of students who are excelling with unlimited access to the best study materials.
        </p>

        {/* Plan Toggle */}
        <div className="flex items-center justify-center space-x-4">
          <span className={`text-sm font-bold ${plan === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setPlan(plan === 'monthly' ? 'yearly' : 'monthly')}
            className="relative inline-flex h-8 w-16 items-center rounded-full bg-indigo-600 transition-colors focus:outline-none"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                plan === 'yearly' ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-bold ${plan === 'yearly' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            Yearly <span className="ml-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Save 15%</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <Zap className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white">Instant Access</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Download any note immediately after payment.</p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400 mb-4" />
              <h3 className="font-bold text-gray-900 dark:text-white">Secure Payment</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Processed securely via Razorpay encryption.</p>
            </div>
          </div>

          <div className="space-y-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-[40px] blur-2xl opacity-20 animate-pulse" />
          <div className="relative bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-2xl p-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan === 'yearly' ? 'Yearly Access' : 'Monthly Access'}</h3>
                <p className="text-gray-500 dark:text-gray-400">{plan === 'yearly' ? 'Billed annually' : 'Billed monthly'}</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-gray-900 dark:text-white">₹{plan === 'yearly' ? '999' : '99'}</span>
                <p className="text-sm text-gray-400 dark:text-gray-500 line-through">₹{plan === 'yearly' ? '1188' : '199'}</p>
              </div>
            </div>

            <div className="space-y-6">
              {profile?.role === 'premium' ? (
                <div className="w-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 py-6 rounded-2xl font-bold text-center flex items-center justify-center space-x-2">
                  <Check className="h-6 w-6" />
                  <span>Premium Active</span>
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 text-white py-6 rounded-2xl font-bold text-xl hover:shadow-xl hover:shadow-amber-200 dark:hover:shadow-none transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <span>Upgrade Now</span>
                      <ArrowRight className="h-6 w-6" />
                    </>
                  )}
                </button>
              )}
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Secure checkout powered by Razorpay. No recurring charges.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
