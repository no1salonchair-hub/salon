import React, { useState } from 'react';
import { Star, X, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, Timestamp, getDoc, runTransaction } from 'firebase/firestore';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface ReviewModalProps {
  bookingId: string;
  salonId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ bookingId, salonId, onClose, onSuccess }) => {
  const { profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || rating === 0) return;

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Create Review
        const reviewRef = doc(collection(db, 'reviews'));
        transaction.set(reviewRef, {
          salonId,
          userId: profile.uid,
          userName: profile.name,
          rating,
          comment,
          createdAt: Timestamp.now(),
        });

        // 2. Update Booking
        const bookingRef = doc(db, 'bookings', bookingId);
        transaction.update(bookingRef, { isRated: true });

        // 3. Update Salon Rating
        const salonRef = doc(db, 'salons', salonId);
        const salonDoc = await transaction.get(salonRef);
        
        if (salonDoc.exists()) {
          const data = salonDoc.data();
          const currentRating = data.averageRating || 0;
          const currentCount = data.reviewCount || 0;
          
          const newCount = currentCount + 1;
          const newRating = ((currentRating * currentCount) + rating) / newCount;
          
          transaction.update(salonRef, {
            averageRating: Number(newRating.toFixed(1)),
            reviewCount: newCount
          });
        }
      });

      toast.success('Thank you for your review!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'reviews');
      } catch (e) {
        console.error('Firestore error reported:', e);
      }
      toast.error('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white">Rate Service</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <X className="w-6 h-6 text-white/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-10 h-10 transition-colors",
                      (hover || rating) >= star ? "fill-yellow-400 text-yellow-400" : "text-white/10"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">
              {rating === 0 ? 'Select a rating' : `${rating} Star${rating > 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Your Review</label>
            <textarea
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={4}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none text-white placeholder:text-white/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading || rating === 0}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};
