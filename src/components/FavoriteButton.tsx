import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Favorite } from '../types';

interface FavoriteButtonProps {
  salonId: string;
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ salonId, className }) => {
  const { profile } = useAuth();
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !salonId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', profile.uid),
      where('salonId', '==', salonId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setFavoriteId(snapshot.docs[0].id);
      } else {
        setFavoriteId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, salonId]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) {
      toast.error('Please login to favorite salons');
      return;
    }

    try {
      if (favoriteId) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
        toast.success('Removed from favorites');
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId: profile.uid,
          salonId,
          createdAt: Timestamp.now()
        });
        toast.success('Added to favorites!');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={toggleFavorite}
      className={cn(
        "p-2 rounded-xl transition-all duration-300 group",
        favoriteId 
          ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20" 
          : "bg-black/40 backdrop-blur-md text-white/60 hover:text-white hover:bg-black/60",
        className
      )}
    >
      <Heart className={cn("w-5 h-5 transition-transform group-active:scale-125", favoriteId && "fill-white")} />
    </button>
  );
};
