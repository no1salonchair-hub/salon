import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { CheckCircle, Loader2, Scissors, ShieldCheck, AlertTriangle, Zap } from 'lucide-react';
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
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
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

  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    let interval: any;
    if (polling && qrCodeData?.id) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/payment/qr/${qrCodeData.id}`);
          const data = await response.json();
          if (data.status === 'paid') {
            setPolling(false);
            clearInterval(interval);
            
            // Save to Firestore
            await addDoc(collection(db, 'payments'), {
              salonId: salon?.id,
              amount: 200,
              status: 'success', // Mark as success since it's verified
              createdAt: Timestamp.now(),
              requestedBy: profile?.uid,
              salonName: salon?.name,
              razorpayPaymentId: data.payment.id,
              razorpayQrId: qrCodeData.id,
            });

            // Update Salon Status and Expiry
            if (salon?.id) {
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + 30); // Add 30 days
              
              await updateDoc(doc(db, 'salons', salon.id), {
                status: 'active',
                subscriptionExpiry: Timestamp.fromDate(expiryDate)
              });
            }
            
            setStep('success');
            toast.success('Payment verified! Your salon is now active and listed.');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 5000); // Poll every 5 seconds
    }
    return () => clearInterval(interval);
  }, [polling, qrCodeData, salon, profile]);

  useEffect(() => {
    if (salon && profile && step === 'info' && !qrCodeData && !paymentLoading && !qrError) {
      handleRazorpayQR().catch(err => {
        console.error('Auto QR generation failed:', err);
        setQrError(err.message || 'Failed to generate payment QR.');
      });
    }
  }, [salon, profile, step, qrCodeData, paymentLoading, qrError]);

  const handleRazorpayQR = async () => {
    if (!salon || !profile) return;
    setPaymentLoading(true);
    setQrError(null);

    try {
      const response = await fetch('/api/payment/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 200,
          name: 'Salon Chair',
          description: `Subscription for ${salon.name}`,
          salonId: salon.id,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        // If it's a short text, show it. If it's a long HTML page, show a generic error.
        const displayMessage = text.length < 500 ? text : 'Server returned an invalid response. This often happens if your Razorpay keys are incorrect or your account is not activated for UPI.';
        throw new Error(displayMessage);
      }

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.details || data.error || `Server error: ${response.status}`;
        throw new Error(errorMsg);
      }
      
      setQrCodeData(data);
      setStep('qr');
      setPolling(true);
      toast.info('QR Code generated! Please scan and pay.');
    } catch (error: any) {
      console.error('Razorpay QR Error:', error);
      const msg = error.message || 'Failed to generate payment QR.';
      setQrError(msg);
      toast.error(msg);
    } finally {
      setPaymentLoading(false);
    }
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
                <Zap className="w-6 h-6 fill-white" />
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

            <div className="flex justify-center">
              {qrError ? (
                <div className="w-full space-y-4">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                    <p className="text-sm text-red-500 font-bold">{qrError}</p>
                  </div>
                  <button
                    onClick={() => handleRazorpayQR()}
                    className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5 fill-white" />
                    Retry Generating QR Code
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center gap-3 justify-center w-full">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <p className="text-sm text-purple-400 font-bold uppercase tracking-widest">Generating Secure QR Code...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'qr' && (
          <div
            key="qr"
            className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 shadow-xl backdrop-blur-2xl text-center"
          >
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-white italic">Scan to Pay</h2>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center max-w-sm mx-auto">
                <div className="text-left">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Salon</p>
                  <p className="text-sm font-bold text-white">{salon.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Amount</p>
                  <p className="text-xl font-black text-purple-400">₹200</p>
                </div>
              </div>
              <p className="text-white/40 text-sm">Scan this dynamic QR code with any UPI app.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl shadow-purple-600/20">
              {qrCodeData?.image_url ? (
                <img 
                  src={qrCodeData.image_url} 
                  alt="Payment QR" 
                  className="w-64 h-64 mx-auto"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              )}
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="p-4 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center gap-3 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <p className="text-sm text-purple-400 font-bold">Waiting for payment confirmation...</p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">QR ID</p>
                <p className="text-xs font-mono text-white truncate">{qrCodeData?.id}</p>
              </div>

              <button
                onClick={() => {
                  setPolling(false);
                  navigate('/dashboard');
                }}
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
              <h2 className="text-3xl font-black text-white italic">Salon Activated!</h2>
              <p className="text-white/40 max-w-sm mx-auto">
                Your payment has been verified and your salon is now active in the marketplace for the next 30 days.
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
