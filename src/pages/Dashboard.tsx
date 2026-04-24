import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, Timestamp, getDoc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Booking, Salon, Payment, UserProfile, Favorite } from '../types';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Plus, Scissors, CreditCard, Calendar, CheckCircle, XCircle, MessageCircle, Clock, ChevronRight, Share2, Star, User, Heart, TrendingUp, Users, Award, MapPin, QrCode } from 'lucide-react';
import { PushNotificationManager } from '../components/PushNotificationManager';
import { ReviewModal } from '../components/ReviewModal';
import { QRSticker } from '../components/QRSticker';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<Salon[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'favorites' | 'insights' | 'qr_sticker'>('upcoming');

  // Separate effect to fetch user profiles whenever bookings change
  useEffect(() => {
    if (profile?.role !== 'salon_owner' || bookings.length === 0) return;

    const userIds = [...new Set(bookings.map(b => b.userId))];
    userIds.forEach(async (userId) => {
      if (!users[userId]) {
        try {
          const userSnap = await getDoc(doc(db, 'users', userId));
          if (userSnap.exists()) {
            setUsers(prev => ({ ...prev, [userId]: userSnap.data() as UserProfile }));
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      }
    });
  }, [bookings, profile?.role]);
  const [reviewBooking, setReviewBooking] = useState<{ id: string; salonId: string } | null>(null);

  if (error) {
    throw error;
  }

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
            const bookingList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
            setBookings(bookingList);
            setLoading(false);
          }, (err) => {
            handleFirestoreError(err, OperationType.LIST, 'bookings');
            setError(err);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'salons');
        setError(err);
        setLoading(false);
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
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'bookings');
        setError(err);
        setLoading(false);
      });

      // Fetch User's Favorites
      const qFavs = query(collection(db, 'favorites'), where('userId', '==', profile.uid));
      const unsubscribeFavs = onSnapshot(qFavs, async (snapshot) => {
        const favSalonIds = snapshot.docs.map(doc => (doc.data() as Favorite).salonId);
        if (favSalonIds.length > 0) {
          const salonPromises = favSalonIds.map(id => getDoc(doc(db, 'salons', id)));
          const salonSnaps = await Promise.all(salonPromises);
          const favSalons = salonSnaps
            .filter(s => s.exists())
            .map(s => ({ id: s.id, ...s.data() } as Salon));
          setFavorites(favSalons);
        } else {
          setFavorites([]);
        }
      });

      return () => {
        unsubscribeBookings?.();
        unsubscribeFavs?.();
      };
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
      console.error('Error updating booking status:', error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, path);
      } catch (e: any) {
        setError(e);
      }
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'upcoming') return b.status === 'pending' || b.status === 'accepted';
    return b.status === 'completed' || b.status === 'rejected';
  });

  const shareBookingOnWhatsApp = (booking: Booking) => {
    const text = `I just had a great experience at Salon Chair! Book your appointment here: ${window.location.origin}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

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
          <h1 className="text-3xl font-black text-white">Welcome, {profile?.name}</h1>
          <p className="text-white/60">Manage your bookings and salon status here.</p>
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
      {profile?.role === 'salon_owner' && (
        salon ? (
          <>
            <div
              className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl"
            >
            <div className="flex items-center gap-4">
              <img src={salon.imageUrl} alt={salon.name} className="w-20 h-20 rounded-2xl object-cover border border-white/10" referrerPolicy="no-referrer" loading="lazy" />
              <div>
                <h2 className="text-xl font-bold text-white">{salon.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    salon.status === 'active' && salon.subscriptionExpiry.toDate() > new Date() ? "bg-green-500/20 text-green-400" : 
                    salon.subscriptionExpiry.toDate() <= new Date() ? "bg-red-500/20 text-red-400" :
                    salon.status === 'pending' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {salon.subscriptionExpiry.toDate() <= new Date() ? 'expired' : salon.status}
                  </span>
                  <span className={cn(
                    "text-xs",
                    salon.subscriptionExpiry.toDate() <= new Date() ? "text-red-400 font-bold" : "text-white/40"
                  )}>
                    Plan: {salon.subscriptionPlan === 'yearly' ? 'Yearly Premium (12 Months)' : 'Monthly Premium (1 Month)'} • Expires: {format(salon.subscriptionExpiry.toDate(), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              {salon.status === 'pending' && (
                <button
                  onClick={() => navigate('/payment')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-600/20"
                >
                  <CreditCard className="w-5 h-5" />
                  Pay to Activate
                </button>
              )}
              {salon.subscriptionExpiry.toDate() <= new Date() && (
                <>
                  <div className="flex-1 md:flex-none p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-400 font-bold uppercase tracking-widest leading-relaxed">
                      Your subscription has expired. Please renew to make your salon visible to customers.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/payment')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-600/20"
                  >
                    <CreditCard className="w-5 h-5" />
                    Renew Subscription
                  </button>
                </>
              )}
              <button
                onClick={() => navigate('/salon-setup')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10"
              >
                <Plus className="w-5 h-5" />
                Edit Salon
              </button>
            </div>
          </div>

          {/* Notification Manager */}
          <PushNotificationManager />
        </>
      ) : (
          <div
            className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-xl"
          >
            <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-600/20">
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white">List Your Salon</h2>
            <p className="text-white/60 max-w-md mx-auto">
              You haven't listed your salon shop yet. Start listing your services and reach more customers today!
            </p>
            <button
              onClick={() => navigate('/salon-setup')}
              className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-lg hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20"
            >
              Get Started Now
            </button>
          </div>
        )
      )}

      {/* Bookings List */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-purple-500" />
            {profile?.role === 'salon_owner' ? 'Management Console' : 'Your Appointments'}
          </h2>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === 'upcoming' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white"
              )}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === 'history' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white"
              )}
            >
              History
            </button>
            {profile?.role === 'user' && (
              <button
                onClick={() => setActiveTab('favorites')}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                  activeTab === 'favorites' ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20" : "text-white/40 hover:text-white"
                )}
              >
                <Heart className="w-3 h-3" />
                Favorites
              </button>
            )}
            {profile?.role === 'salon_owner' && (
              <>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                    activeTab === 'insights' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-white/40 hover:text-white"
                  )}
                >
                  <TrendingUp className="w-3 h-3" />
                  VIP Insights
                </button>
                <button
                  onClick={() => setActiveTab('qr_sticker')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                    activeTab === 'qr_sticker' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white"
                  )}
                >
                  <QrCode className="w-3 h-3" />
                  QR Sticker
                </button>
              </>
            )}
          </div>
        </div>

        {activeTab === 'insights' && profile?.role === 'salon_owner' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Total Customers</p>
                <p className="text-3xl font-black text-white">{[...new Set(bookings.map(b => b.userId))].length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-4">
                  <Award className="w-6 h-6" />
                </div>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Repeat Rate</p>
                <p className="text-3xl font-black text-white">
                  {(() => {
                    const userCounts = bookings.reduce((acc, b) => {
                      acc[b.userId] = (acc[b.userId] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const repeatUsers = Object.values(userCounts).filter(count => count > 1).length;
                    const totalUsers = Object.keys(userCounts).length;
                    return totalUsers > 0 ? Math.round((repeatUsers / totalUsers) * 100) : 0;
                  })()}%
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400 mb-4">
                  <Star className="w-6 h-6" />
                </div>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Avg. Bookings/User</p>
                <p className="text-3xl font-black text-white">
                  {Object.keys(users).length > 0 ? (bookings.length / Object.keys(users).length).toFixed(1) : '0'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-black text-white">Top VIP Customers</h3>
                <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Based on booking frequency</span>
              </div>
              <div className="divide-y divide-white/5">
                {(() => {
                  const userCounts = bookings.reduce((acc, b) => {
                    acc[b.userId] = (acc[b.userId] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(userCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([userId, count], idx) => (
                      <div key={userId} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 font-black text-xl group-hover:text-purple-400 transition-colors">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-white text-lg">{users[userId]?.name || 'Loading...'}</p>
                            <p className="text-xs text-white/40">{users[userId]?.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-2xl font-black text-purple-400">{count}</span>
                            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Bookings</span>
                          </div>
                          {count >= 5 && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded text-[8px] font-black uppercase tracking-widest">Diamond VIP</span>
                          )}
                          {count >= 3 && count < 5 && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded text-[8px] font-black uppercase tracking-widest">Gold VIP</span>
                          )}
                        </div>
                      </div>
                    ));
                })()}
                {Object.keys(users).length === 0 && (
                  <div className="p-20 text-center">
                    <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
                    <p className="text-white/40 font-bold uppercase tracking-widest">No customer data yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'qr_sticker' && profile?.role === 'salon_owner' && salon ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <QRSticker salonId={salon.id} salonName={salon.name} />
          </div>
        ) : activeTab === 'favorites' && profile?.role === 'user' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {favorites.map((salon) => (
              <div
                key={salon.id}
                onClick={() => navigate(`/salon/${salon.id}`)}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden cursor-pointer group shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-40">
                  <img
                    src={salon.imageUrl}
                    alt={salon.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-pink-600 p-2 rounded-xl shadow-lg">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black text-white mb-1">{salon.name}</h3>
                  <p className="text-xs text-white/40 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {salon.location.city}, {salon.location.state}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/salon/${salon.id}`);
                    }}
                    className="w-full mt-4 py-3 bg-white/5 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                  >
                    Re-book Now
                  </button>
                </div>
              </div>
            ))}
            {favorites.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Heart className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white/40">No favorites yet</h3>
                <p className="text-white/20">Heart your favorite salons to see them here!</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-6 px-8 py-3 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-500 transition-all"
                >
                  Explore Salons
                </button>
              </div>
            )}
          </div>
        ) : profile?.role === 'salon_owner' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-yellow-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Pending Requests
              </h3>
              <div className="space-y-3">
                {bookings.filter(b => b.status === 'pending').map(booking => (
                  <div
                    key={booking.id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-white">{users[booking.userId]?.name || 'Loading...'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {(booking.services || ((booking as any).service ? [(booking as any).service] : [])).map((service, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-black uppercase tracking-widest">
                              {service}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                          {format(booking.dateTime.toDate(), 'MMM dd, hh:mm a')}
                          {booking.barberName && <span className="ml-2 text-blue-400">• {booking.barberName}</span>}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        {booking.dateTime.toDate() < new Date() ? (
                          <span className="px-3 py-1 bg-white/5 text-white/20 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            Expired
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  await updateBookingStatus(booking.id, 'accepted');
                                } catch (e) {
                                  console.error('Failed to accept booking:', e);
                                }
                              }}
                              disabled={salon?.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date()}
                              className={cn(
                                "p-2 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                salon?.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date() && "bg-gray-600 hover:bg-gray-600"
                              )}
                              title={salon?.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date() ? "Renew subscription to accept bookings" : "Accept Booking"}
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await updateBookingStatus(booking.id, 'rejected');
                                } catch (e) {
                                  console.error('Failed to reject booking:', e);
                                }
                              }}
                              className="p-2 bg-red-600/20 text-red-500 rounded-xl hover:bg-red-600/30 transition-all"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {bookings.filter(b => b.status === 'pending').length === 0 && (
                  <p className="text-white/20 text-sm italic">No pending requests.</p>
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
                  <div
                    key={booking.id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white mb-1">{users[booking.userId]?.name || 'Loading...'}</p>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {(booking.services || ((booking as any).service ? [(booking as any).service] : [])).map((service, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-black uppercase tracking-widest">
                              {service}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                          {format(booking.dateTime.toDate(), 'MMM dd, hh:mm a')}
                          {booking.barberName && <span className="ml-2 text-blue-400">• {booking.barberName}</span>}
                        </p>
                      </div>
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
                  </div>
                ))}
                {bookings.filter(b => b.status === 'accepted').length === 0 && (
                  <p className="text-white/20 text-sm italic">No active bookings.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-white/10 transition-all shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                      <Scissors className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(booking.services || ((booking as any).service ? [(booking as any).service] : [])).map((service, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-black uppercase tracking-widest">
                            {service}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{format(booking.dateTime.toDate(), 'MMM dd, hh:mm a')}</span>
                          {booking.barberName && <span className="ml-2 text-blue-400">• {booking.barberName}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            booking.status === 'accepted' ? "bg-green-500" :
                            booking.status === 'pending' && booking.dateTime.toDate() < new Date() ? "bg-gray-500" :
                            booking.status === 'pending' ? "bg-yellow-500" :
                            booking.status === 'completed' ? "bg-blue-500" : "bg-red-500"
                          )} />
                          <span>{booking.status === 'pending' && booking.dateTime.toDate() < new Date() ? 'expired' : booking.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {booking.status === 'completed' && !booking.isRated && (
                      <button
                        onClick={() => setReviewBooking({ id: booking.id, salonId: booking.salonId })}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-600/10 text-yellow-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-600/20 transition-all border border-yellow-500/20"
                      >
                        <Star className="w-4 h-4 fill-yellow-500" />
                        Rate Service
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <button
                        onClick={() => shareBookingOnWhatsApp(booking)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600/10 text-green-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600/20 transition-all border border-green-500/20"
                      >
                        <Share2 className="w-4 h-4" />
                        Share My Look
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/booking/${booking.id}`)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            {filteredBookings.length === 0 && (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Calendar className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white/40">No bookings in this category</h3>
                <p className="text-white/20">Your {activeTab} bookings will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {reviewBooking && (
        <ReviewModal
          bookingId={reviewBooking.id}
          salonId={reviewBooking.salonId}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => setReviewBooking(null)}
        />
      )}
    </div>
  );
};
