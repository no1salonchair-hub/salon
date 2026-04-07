import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, Loader2, ShieldCheck, AlertTriangle, QrCode } from 'lucide-react';
import { Salon } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const Payment: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [step, setStep] = useState<'info' | 'success' | 'manual_upi'>('info');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [utr, setUtr] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);

  const upiId = (import.meta.env.VITE_UPI_ID || '').trim(); // Required direct UPI ID
  const isUpiValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId);

  const plans = {
    monthly: {
      id: 'monthly',
      name: 'Monthly Premium',
      amount: 200,
      duration: 30,
      description: '₹200 / month for premium marketplace listing.'
    },
    yearly: {
      id: 'yearly',
      name: 'Yearly Premium (Save 17%)',
      amount: 2000,
      duration: 365,
      description: '₹2000 / year (Get 2 months free!)'
    }
  };

  const currentPlan = plans[selectedPlan];

  useEffect(() => {
    if (!profile) return;

    const fetchSalon = async () => {
      try {
        const q = query(collection(db, 'salons'), where('ownerId', '==', profile.uid));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setSalon({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Salon);
        } else {
          navigate('/salon-setup');
        }
      } catch (error) {
        console.error('Error fetching salon:', error);
        // Don't throw here to avoid unhandled rejection, instead set error state or handle gracefully
        try {
          handleFirestoreError(error, OperationType.GET, 'salons');
        } catch (e: any) {
          setError(e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSalon().catch(err => {
      console.error('Unhandled fetchSalon error:', err);
      setError(err);
    });
  }, [profile, navigate]);

  const handleManualUpiSubmit = async () => {
    if (!utr || utr.length < 12) {
      toast.error('Please enter a valid 12-digit UTR/Transaction ID');
      return;
    }
    
    setSubmittingUtr(true);
    try {
      // For manual UPI, we record the payment and set salon to active
      // In a real app, this would be verified by an admin
      const paymentData = {
        salonId: salon?.id,
        amount: currentPlan.amount,
        planId: currentPlan.id,
        status: 'pending_verification' as const,
        createdAt: Timestamp.now(),
        requestedBy: profile?.uid,
        salonName: salon?.name,
        utr: utr,
        method: 'manual_upi'
      };
      
      console.log('Saving manual UPI payment to Firestore:', paymentData);
      await addDoc(collection(db, 'payments'), paymentData);

      if (salon?.id) {
        console.log('Activating salon:', salon.id);
        const salonRef = doc(db, 'salons', salon.id);
        const now = new Date();
        let durationDays = selectedPlan === 'yearly' ? 365 : 30;
        const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        await updateDoc(salonRef, {
          status: 'active',
          subscriptionExpiry: Timestamp.fromDate(expiry),
          subscriptionPlan: selectedPlan,
          updatedAt: Timestamp.now()
        });
      }

      setStep('success');
      toast.success('Payment submitted! Your salon is now active.');
    } catch (err: any) {
      console.error('Manual UPI error:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'payments/salons');
      } catch (e: any) {
        setError(e);
      }
    } finally {
      setSubmittingUtr(false);
    }
  };

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Salon Chair')}&am=${currentPlan.amount}&cu=INR&tn=${encodeURIComponent(`SalonSub_${salon?.id?.substring(0, 6) || 'Plan'}`)}&tr=${encodeURIComponent(`TXN${Date.now()}`)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (error) {
    throw error;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!salon) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="relative">
        {step === 'info' && (
          <div
            key="info"
            className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 shadow-xl backdrop-blur-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white italic">Salon Subscription</h1>
                <p className="text-white/40">Choose a plan for premium marketplace listing.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(plans).map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
                  className={cn(
                    "p-6 rounded-2xl border text-left transition-all space-y-2",
                    selectedPlan === plan.id
                      ? "bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-600/10"
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white">{plan.name}</h3>
                    {selectedPlan === plan.id && <CheckCircle className="w-5 h-5 text-purple-500" />}
                  </div>
                  <p className="text-2xl font-black text-white">₹{plan.amount}</p>
                  <p className="text-xs text-white/40">{plan.description}</p>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-center gap-3 animate-pulse">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <p className="text-sm font-black text-red-500 uppercase tracking-widest leading-tight">
                  Non-Refundable Payment: Once processed, this amount cannot be refunded under any circumstances.
                </p>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Salon Name</span>
                  <span className="font-bold text-white">{salon.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Plan</span>
                  <span className="font-bold text-white">{currentPlan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Amount</span>
                  <span className="text-2xl font-black text-purple-400">₹{currentPlan.amount}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                <p className="text-sm text-blue-400">
                  Your salon will be activated for {currentPlan.duration} days after payment verification.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {upiId ? (
                <button
                  onClick={() => setStep('manual_upi')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 flex items-center justify-center gap-2 group"
                >
                  <QrCode className="w-6 h-6" />
                  <span>Pay via UPI QR Code</span>
                </button>
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                  <p className="text-sm text-red-500 font-bold">UPI Payment not configured. Please contact support.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'manual_upi' && (
          <div
            key="manual_upi"
            className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 shadow-xl backdrop-blur-2xl text-center"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white italic">Direct UPI Payment</h2>
              <p className="text-white/40">Scan the QR code below using any UPI app.</p>
              {!isUpiValid && upiId && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">
                    ⚠️ UPI ID "{upiId}" appears invalid. Check Settings &gt; Secrets &gt; VITE_UPI_ID
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl shadow-purple-600/20 relative group">
              <QRCodeSVG value={upiUri} size={200} level="H" includeMargin={true} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-3xl backdrop-blur-sm">
                <p className="text-white text-xs font-bold">Scan with any UPI App</p>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div className="p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-1">UPI ID</p>
                  <p className="text-white font-mono">{upiId || 'Not Configured'}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(upiId)}
                  className="p-3 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl transition-colors text-purple-400 flex items-center gap-2"
                  title="Copy UPI ID"
                >
                  <span className="text-[10px] font-bold uppercase">Copy ID</span>
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-1">Amount</p>
                  <p className="text-white font-mono">₹{currentPlan.amount}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(currentPlan.amount.toString())}
                  className="p-3 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl transition-colors text-purple-400 flex items-center gap-2"
                  title="Copy Amount"
                >
                  <span className="text-[10px] font-bold uppercase">Copy Amount</span>
                  <CheckCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

              <div className="space-y-2">
                <label className="text-xs text-white/40 font-bold uppercase tracking-widest">Transaction ID / UTR (12 Digits)</label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').substring(0, 12))}
                  placeholder="Enter 12-digit UTR number"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={handleManualUpiSubmit}
                disabled={submittingUtr || utr.length < 12}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingUtr ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Verify & Activate
              </button>

              <button
                onClick={() => setStep('info')}
                className="w-full py-3 text-white/40 text-sm hover:text-white transition-colors"
              >
                Go Back
              </button>
            </div>
        )}

        {step === 'success' && (
          <div
            key="success"
            className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center space-y-6 shadow-xl backdrop-blur-2xl"
          >
            <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-600/20">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white italic">Salon Activated!</h2>
              <p className="text-white/40 max-w-sm mx-auto">
                Your payment has been verified and your salon is now active in the marketplace for the next {currentPlan.duration} days.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold hover:bg-white/10 transition-all border border-white/10"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
