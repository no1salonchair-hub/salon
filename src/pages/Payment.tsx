import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { CreditCard, CheckCircle, Loader2, Scissors, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Salon } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { QRCodeSVG } from 'qrcode.react';

export const Payment: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'qr' | 'success'>('info');
  const [paymentId, setPaymentId] = useState<string | null>(null);

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
        handleFirestoreError(error, OperationType.GET, 'salons');
      } finally {
        setLoading(false);
      }
    };

    fetchSalon();
  }, [profile, navigate]);

  const generateQRCode = async () => {
    if (!salon || !profile) return;
    setPaymentLoading(true);
    try {
      // Create a pending payment record first to get a unique ID
      const docRef = await addDoc(collection(db, 'payments'), {
        salonId: salon.id,
        amount: 200,
        status: 'pending',
        createdAt: Timestamp.now(),
        requestedBy: profile.uid,
        salonName: salon.name,
      });
      setPaymentId(docRef.id);
      setStep('qr');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
      toast.error('Failed to generate payment request.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setStep('success');
    toast.success('Request submitted! Our team will verify and activate your salon.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!salon) return null;

  // Dynamic payment payload for the QR code
  const qrValue = JSON.stringify({
    type: 'SALON_PAYMENT',
    salonId: salon.id,
    paymentId: paymentId,
    amount: 200,
    timestamp: Date.now(),
  });

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
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white italic">Salon Subscription</h1>
                <p className="text-white/40">₹200 / month for premium marketplace listing.</p>
              </div>
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
                  <span className="font-bold text-white">Monthly Premium</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Amount</span>
                  <span className="text-2xl font-black text-purple-400">₹200</span>
                </div>
              </div>

              <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                <p className="text-sm text-blue-400">
                  Your salon will be activated for 30 days after admin verification.
                </p>
              </div>
            </div>

            <button
              onClick={generateQRCode}
              disabled={paymentLoading}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Generating QR...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-6 h-6" />
                  Generate Payment QR
                </>
              )}
            </button>
          </div>
        )}

        {step === 'qr' && (
          <div
            key="qr"
            className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 shadow-xl backdrop-blur-2xl text-center"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white italic">Scan to Pay</h2>
              <p className="text-white/40">Scan this dynamic QR code with any UPI app to pay ₹200.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl shadow-purple-600/20">
              <QRCodeSVG 
                value={qrValue}
                size={240}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Payment ID</p>
                <p className="text-xs font-mono text-white truncate">{paymentId}</p>
              </div>

              <button
                onClick={handlePaymentComplete}
                className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-6 h-6" />
                I Have Paid
              </button>
              
              <button
                onClick={() => setStep('info')}
                className="text-white/40 text-xs font-bold hover:text-white transition-colors"
              >
                Cancel and Go Back
              </button>
            </div>
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
              <h2 className="text-3xl font-black text-white italic">Request Submitted!</h2>
              <p className="text-white/40 max-w-sm mx-auto">
                Your payment is being verified by our team. Your salon will be activated shortly.
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
