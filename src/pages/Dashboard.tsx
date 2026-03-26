import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Booking, Salon, Payment } from '../types';
import { Calendar, Clock, MapPin, MessageCircle, CheckCircle, XCircle, Scissors, Plus, CreditCard, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    if (!profile) return;

    let unsubscribeBookings: () => void;
    let unsubscribeSalon: () => void;

    if (profile.role === 'salon_owner') {
      // Fetch Owner's Salon
      const qSalon = query(collection(db, 'salons'), where('ownerId', '==', profile.uid));
      unsubscribeSalon = onSnapshot(qSalon, (snapshot) => {
        if (!snapshot.empty) {
          const salonData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Salon;
          setSalon(salonData);

          // Fetch Bookings for this Salon
          const qBookings = query(
            collection(db, 'bookings'),
            where('salonId', '==', salonData.id),
            orderBy('createdAt', 'desc')
          );
          unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
            setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'bookings');
          });
        } else {
          setLoading(false);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'salons');
      });
    } else {
      // Fetch User's Bookings
      const qBookings = query(
        collection(db, 'bookings'),
        where('userId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
      unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
        setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      });
    }

    return () => {
      unsubscribeBookings?.();
      unsubscribeSalon?.();
    };
  }, [profile]);

  const updateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'upcoming') return b.status === 'pending' || b.status === 'accepted';
    return b.status === 'completed' || b.status === 'rejected';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Welcome, {profile?.name}</h1>
          <p className="text-gray-400">Manage your bookings and salon status here.</p>
        </div>
        {profile?.role === 'user' && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-500 transition-all"
          >
            <Plus className="w-5 h-5" />
            Book New Service
          </button>
        )}
      </div>

      {/* Salon Status (Owner Only) */}
      {profile?.role === 'salon_owner' && salon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <img src={salon.imageUrl} alt={salon.name} className="w-20 h-20 rounded-2xl object-cover border border-white/10" referrerPolicy="no-referrer" />
            <div>
              <h2 className="text-xl font-bold">{salon.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  salon.status === 'active' ? "bg-green-500/20 text-green-400" : 
                  salon.status === 'pending' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                )}>
                  {salon.status}
                </span>
                <span className="text-xs text-gray-500">
                  Expires: {format(salon.subscriptionExpiry.toDate(), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {salon.status !== 'active' && (
              <button
                onClick={() => navigate('/payment')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                <CreditCard className="w-5 h-5" />
                Renew Subscription
              </button>
            )}
            <button
              onClick={() => navigate('/salon-setup')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
            >
              Edit Salon
            </button>
          </div>
        </motion.div>
      )}

      {/* Bookings List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-purple-500" />
            {profile?.role === 'salon_owner' ? 'Booking Management' : 'Your Appointments'}
          </h2>
          {profile?.role === 'user' && (
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'upcoming' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-gray-500 hover:text-gray-300"
                )}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  activeTab === 'history' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-gray-500 hover:text-gray-300"
                )}
              >
                History
              </button>
            </div>
          )}
        </div>

        {profile?.role === 'salon_owner' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-yellow-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Pending Requests
              </h3>
              <div className="space-y-3">
                {bookings.filter(b => b.status === 'pending').map(booking => (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-lg">{booking.service}</h4>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                          {format(booking.dateTime.toDate(), 'MMM dd, hh:mm a')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'accepted')}
                          className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-all"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'rejected')}
                          className="p-2 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600/30 transition-all"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {bookings.filter(b => b.status === 'pending').length === 0 && (
                  <p className="text-gray-600 text-sm italic">No pending requests.</p>
                )}
              </div>
            </div>

            {/* Accepted Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-green-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Accepted Bookings
              </h3>
              <div className="space-y-3">
                {bookings.filter(b => b.status === 'accepted').map(booking => (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-black text-lg">{booking.service}</h4>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                        {format(booking.dateTime.toDate(), 'MMM dd, hh:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/booking/${booking.id}`)}
                        className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-all"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                        className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {bookings.filter(b => b.status === 'accepted').length === 0 && (
                  <p className="text-gray-600 text-sm italic">No active bookings.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredBookings.map((booking) => (
                <motion.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-white/[0.07] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400">
                      <Scissors className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black">{booking.service}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(booking.dateTime.toDate(), 'MMM dd, hh:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            booking.status === 'accepted' ? "bg-green-500" :
                            booking.status === 'pending' ? "bg-yellow-500" :
                            booking.status === 'completed' ? "bg-blue-500" : "bg-red-500"
                          )} />
                          <span>{booking.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/booking/${booking.id}`)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredBookings.length === 0 && (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400">No bookings in this category</h3>
                <p className="text-gray-500">Your {activeTab} bookings will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
