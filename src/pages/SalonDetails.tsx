import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Salon, Service, Booking } from '../types';
import { Scissors, MapPin, Star, Clock, ChevronLeft, Calendar, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { format, addHours, startOfHour } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Helmet } from 'react-helmet-async';
import { Share2 } from 'lucide-react';

export const SalonDetails: React.FC = () => {
  const { salonId } = useParams<{ salonId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  if (error) {
    throw error;
  }
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.name === service.name);
      if (exists) {
        return prev.filter(s => s.name !== service.name);
      }
      return [...prev, service];
    });
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  const isPastSlot = (time: string) => {
    const [hourStr, minuteStr] = time.split(':');
    const isPM = time.includes('PM');
    let hour = parseInt(hourStr);
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    
    const slotDate = new Date(selectedDate);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate < new Date();
  };

  useEffect(() => {
    if (!salonId) return;

    const fetchSalon = async () => {
      const path = `salons/${salonId}`;
      try {
        const docRef = doc(db, 'salons', salonId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSalon({ id: docSnap.id, ...docSnap.data() } as Salon);
        } else {
          navigate('/');
        }
      } catch (err: any) {
        console.error('SalonDetails: fetchSalon error', err);
        setError(err);
      }
      setLoading(false);
    };

    fetchSalon();
  }, [salonId, navigate]);

  const isExpired = salon?.subscriptionExpiry ? salon.subscriptionExpiry.toDate() < new Date() : false;

  const handleBooking = async () => {
    if (!profile || !salon || selectedServices.length === 0 || !selectedTime || isExpired) return;

    setBookingLoading(true);
    try {
      const [hourStr, minuteStr] = selectedTime.split(':');
      const isPM = selectedTime.includes('PM');
      let hour = parseInt(hourStr);
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;

      const bookingDate = new Date(selectedDate);
      bookingDate.setHours(hour, 0, 0, 0);

      const bookingData: Omit<Booking, 'id'> = {
        userId: profile.uid,
        salonId: salon.id,
        services: selectedServices.map(s => s.name),
        dateTime: Timestamp.fromDate(bookingDate),
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      toast.success('Booking request sent successfully!');
      navigate(`/booking/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    } finally {
      setBookingLoading(false);
    }
  };

  const shareOnWhatsApp = () => {
    if (!salon) return;
    const text = `Check out ${salon.name} on Salon Chair! Book your premium salon services here: ${window.location.href}`;
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

  if (!salon) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <Helmet>
        <title>{salon.name} | Book Online at Salon Chair</title>
        <meta name="description" content={`Book premium services at ${salon.name}. Located in ${salon.location.city}, ${salon.location.state}. Best salon experience guaranteed.`} />
        <meta property="og:title" content={`${salon.name} | Salon Chair`} />
        <meta property="og:description" content={`Book your appointment at ${salon.name} today!`} />
        <meta property="og:image" content={salon.imageUrl} />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Marketplace
        </button>
        <button
          onClick={shareOnWhatsApp}
          className="flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-500 rounded-xl font-bold hover:bg-green-600/20 transition-all border border-green-500/20"
        >
          <Share2 className="w-4 h-4" />
          Share Salon
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Salon Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-xl">
            <img
              src={salon.imageUrl}
              alt={salon.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest",
                  isExpired ? "bg-red-600 text-white" : "bg-purple-600 text-white"
                )}>
                  {isExpired ? 'Expired' : salon.status}
                </span>
                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold">4.8</span>
                </div>
              </div>
              <h1 className="text-4xl font-black mb-2 text-white">{salon.name}</h1>
              {isExpired && (
                <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-2xl mb-4">
                  <p className="text-xs font-black text-red-400 uppercase tracking-widest leading-relaxed">
                    This salon's subscription has expired and is currently not accepting new bookings.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-200">
                <MapPin className="w-5 h-5 text-purple-400" />
                <span>Premium Location</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
              <Scissors className="text-purple-500" />
              Available Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {salon.services.map((service, idx) => {
                const isSelected = selectedServices.some(s => s.name === service.name);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleService(service)}
                    className={cn(
                      "p-6 bg-white/5 border rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-xl",
                      isSelected
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    <div>
                      <h3 className="font-bold text-lg text-white">{service.name}</h3>
                      <p className="text-sm text-white/40">Premium Service</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-purple-400">₹{service.price}</p>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-2 ml-auto",
                        isSelected
                          ? "bg-purple-500 border-purple-50"
                          : "border-white/10 group-hover:border-white/20"
                      )}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <Calendar className="text-purple-500" />
              Book Appointment
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Select Date</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {[0, 1, 2, 3, 4, 5, 6].map((days) => {
                    const date = addHours(new Date(), days * 24);
                    const isSelected = format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                    return (
                      <button
                        key={days}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all border",
                          isSelected ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                        )}
                      >
                        <span className="text-[10px] uppercase font-bold">{format(date, 'EEE')}</span>
                        <span className="text-xl font-black">{format(date, 'dd')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Select Time Slot</label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => {
                    const past = isPastSlot(time);
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        disabled={past}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-3 rounded-xl text-xs font-bold transition-all border",
                          past ? "bg-white/5 border-white/5 text-white/10 cursor-not-allowed" :
                          isSelected ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20" :
                          "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Services</span>
                  <span className="font-bold text-right truncate ml-4 text-white">
                    {selectedServices.length > 0 
                      ? selectedServices.map(s => s.name).join(', ') 
                      : 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Price</span>
                  <span className="font-black text-purple-400">₹{totalPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Booking Fee</span>
                  <span className="font-bold text-green-400">FREE</span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                  <span className="font-bold text-white">Total</span>
                  <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    ₹{totalPrice}
                  </span>
                </div>
              </div>

              <button
                disabled={selectedServices.length === 0 || !selectedTime || bookingLoading || isExpired}
                onClick={handleBooking}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bookingLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isExpired ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />)}
                {bookingLoading ? 'Processing...' : (isExpired ? 'Salon Expired' : 'Confirm Booking')}
              </button>
              <p className="text-[10px] text-center text-white/40 uppercase tracking-widest font-bold">
                Secure Payment at Salon
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
