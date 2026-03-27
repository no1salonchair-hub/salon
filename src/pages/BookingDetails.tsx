import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, addDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Booking, Salon, Message } from '../types';
import { Send, Scissors, Calendar, Clock, MapPin, MessageCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const BookingDetails: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bookingId || !profile) return;

    // Fetch Booking
    const unsubscribeBooking = onSnapshot(doc(db, 'bookings', bookingId), async (snapshot) => {
      if (snapshot.exists()) {
        const bookingData = { id: snapshot.id, ...snapshot.data() } as Booking;
        setBooking(bookingData);

        // Fetch Salon
        try {
          const salonDoc = await getDoc(doc(db, 'salons', bookingData.salonId));
          if (salonDoc.exists()) {
            setSalon({ id: salonDoc.id, ...salonDoc.data() } as Salon);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `salons/${bookingData.salonId}`);
        }

        // Fetch Messages
        const qMessages = query(
          collection(db, 'bookings', bookingId, 'messages'),
          orderBy('timestamp', 'asc')
        );
        const unsubscribeMessages = onSnapshot(qMessages, (msgSnapshot) => {
          setMessages(msgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[]);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `bookings/${bookingId}/messages`);
        });

        return () => unsubscribeMessages();
      } else {
        setLoading(false);
        navigate('/dashboard');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `bookings/${bookingId}`);
    });

    return () => unsubscribeBooking();
  }, [bookingId, profile, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !bookingId || !profile) return;

    const path = `bookings/${bookingId}/messages`;
    try {
      await addDoc(collection(db, 'bookings', bookingId, 'messages'), {
        bookingId,
        senderId: profile.uid,
        text: newMessage.trim(),
        timestamp: Timestamp.now(),
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking || !salon) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Info */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-400">
                <Scissors className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold">{booking.service}</h2>
              <span className={cn(
                "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2",
                booking.status === 'accepted' ? "bg-green-500/20 text-green-400" : 
                booking.status === 'pending' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
              )}>
                {booking.status}
              </span>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3 text-gray-400">
                <Calendar className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold">Date</p>
                  <p className="text-white font-medium">{format(booking.dateTime.toDate(), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Clock className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold">Time</p>
                  <p className="text-white font-medium">{format(booking.dateTime.toDate(), 'hh:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <MapPin className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold">Salon</p>
                  <p className="text-white font-medium">{salon.name}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Chat System */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col h-[600px] overflow-hidden"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Chat Support</h3>
                  <p className="text-xs text-gray-500">Real-time chat with {profile?.role === 'user' ? 'Salon Owner' : 'Customer'}</p>
                </div>
              </div>
            </div>

            {booking.status === 'accepted' ? (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        msg.senderId === profile?.uid ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "px-5 py-3 rounded-2xl text-sm font-medium shadow-xl",
                          msg.senderId === profile?.uid
                            ? "bg-purple-600 text-white rounded-tr-none"
                            : "bg-zinc-900 text-white rounded-tl-none border border-white/5"
                        )}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-gray-600 mt-1 px-1 font-bold uppercase tracking-widest">
                        {format(msg.timestamp.toDate(), 'hh:mm a')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-black/60 border-t border-white/10">
                  <form onSubmit={sendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-gray-600"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-14 h-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center hover:bg-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-purple-600/20"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-400">Chat Locked</h4>
                <p className="text-gray-500 mt-2">
                  Chat is only enabled after the booking has been accepted by the salon owner.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
