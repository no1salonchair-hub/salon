import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { CreditCard, QrCode, CheckCircle, Loader2, Scissors, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Salon } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const Payment: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'qr' | 'success'>('info');

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

  const handlePaymentSubmit = async () => {
    if (!salon) return;

    setPaymentLoading(true);
    try {
      await addDoc(collection(db, 'payments'), {
        salonId: salon.id,
        amount: 200,
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      setStep('success');
      toast.success('Payment request submitted! Admin will verify shortly.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
      toast.error('Failed to submit payment request.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!salon) return null;

  // Generate dynamic UPI QR URL (Hidden UPI ID: citimobilesknr-1@oksbi)
  const upiId = "citimobilesknr-1@oksbi";
  const upiUrl = `upi://pay?pa=${upiId}&pn=SalonChair&am=200&cu=INR&tn=Subscription_${salon.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black">Salon Subscription</h1>
                <p className="text-gray-400">₹200 / month for premium marketplace listing.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Salon Name</span>
                  <span className="font-bold">{salon.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Plan</span>
                  <span className="font-bold">Monthly Premium</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-2xl font-black text-purple-400">₹200</span>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                <p className="text-sm text-blue-300/80">
                  Your salon will be activated for 30 days after admin verification.
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep('qr')}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 hover:opacity-90 transition-opacity"
            >
              Proceed to Payment
            </button>
          </motion.div>
        )}

        {step === 'qr' && (
          <motion.div
            key="qr"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Scan to Pay</h2>
              <p className="text-gray-400">Scan this QR code using any UPI app (GPay, PhonePe, etc.)</p>
            </div>

            <div className="relative w-64 h-64 mx-auto bg-white p-4 rounded-3xl shadow-2xl shadow-purple-600/10">
              <img src={qrUrl} alt="UPI QR Code" className="w-full h-full" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 border-4 border-purple-600/20 rounded-3xl pointer-events-none" />
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 text-left">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <p className="text-xs text-yellow-400/80">
                After successful payment, click the button below. Admin will verify your transaction within 24 hours.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('info')}
                className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-bold hover:bg-white/10 transition-all"
              >
                Back
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={paymentLoading}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-green-600/20 hover:bg-green-500 transition-all flex items-center justify-center gap-2"
              >
                {paymentLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                I Have Paid
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center space-y-6"
          >
            <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-600/20">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black">Payment Submitted!</h2>
              <p className="text-gray-400 max-w-sm mx-auto">
                Your payment is being verified by our team. Your salon will be activated shortly.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all"
            >
              Return to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
