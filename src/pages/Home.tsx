import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Salon } from '../types';
import { MapPin, Search, Star, Scissors, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

// Haversine formula to calculate distance in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const Home: React.FC = () => {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }

    // Fetch active salons
    const q = query(
      collection(db, 'salons'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salonData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Salon[];
      setSalons(salonData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'salons');
    });

    return () => unsubscribe();
  }, []);

  const filteredSalons = salons.filter((salon) => {
    const matchesSearch = salon.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!userLocation) return matchesSearch;
    
    const distance = getDistance(
      userLocation.lat,
      userLocation.lng,
      salon.location.lat,
      salon.location.lng
    );
    return matchesSearch && distance <= 1; // 1 KM radius
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <section className="relative h-[300px] rounded-3xl overflow-hidden group">
        <img
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1920"
          alt="Salon Hero"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black mb-4"
          >
            Find Your Perfect Style
          </motion.h1>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search salons, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-gray-400"
            />
          </div>
        </div>
      </section>

      {/* Salon Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="text-purple-500" />
            Nearby Salons
            <span className="text-sm font-normal text-gray-500 ml-2">(Within 1km)</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[400px] bg-white/5 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : filteredSalons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredSalons.map((salon) => (
                <motion.div
                  key={salon.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -5 }}
                  onClick={() => navigate(`/salon/${salon.id}`)}
                  className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden cursor-pointer group"
                >
                  <div className="relative h-48">
                    <img
                      src={salon.imageUrl}
                      alt={salon.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold">4.8</span>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-black mb-1">{salon.name}</h3>
                      <div className="flex items-center gap-1 text-gray-500 text-xs font-bold uppercase tracking-widest">
                        <MapPin className="w-3 h-3" />
                        <span>{userLocation ? `${getDistance(userLocation.lat, userLocation.lng, salon.location.lat, salon.location.lng).toFixed(1)} km away` : 'Nearby'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {salon.services.slice(0, 3).map((service, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white/5 text-gray-400 rounded-lg text-[10px] font-bold uppercase tracking-tighter">
                          {service.name}
                        </span>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Starts from</p>
                        <p className="text-xl font-black text-purple-400">₹{Math.min(...salon.services.map(s => s.price))}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/salon/${salon.id}`);
                        }}
                        className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <Scissors className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No salons found nearby</h3>
            <p className="text-gray-500">Try searching for a different name or check back later.</p>
          </div>
        )}
      </section>
    </div>
  );
};
