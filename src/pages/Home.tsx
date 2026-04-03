import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Salon } from '../types';
import { MapPin, Search, Star, Scissors, Clock, ChevronRight } from 'lucide-react';
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
  const [error, setError] = useState<Error | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceRange, setDistanceRange] = useState(5); // Default to 5km
  const navigate = useNavigate();

  if (error) {
    throw error;
  }

  useEffect(() => {
    console.log('Home: useEffect triggered');
    
    // Get user location with timeout
    if (navigator.geolocation) {
      console.log('Home: Geolocation is supported');
      const geoTimeout = setTimeout(() => {
        console.warn('Home: Geolocation request timed out');
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Home: Geolocation success', position.coords);
          clearTimeout(geoTimeout);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Home: Geolocation error', error);
          clearTimeout(geoTimeout);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    } else {
      console.warn('Home: Geolocation is not supported');
    }

    // Fetch active salons with a limit for faster initial load
    const q = query(
      collection(db, 'salons'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salonData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Salon[];
      setSalons(salonData);
      setLoading(false);
    }, (err) => {
      console.error('Home: onSnapshot error', err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredSalons = React.useMemo(() => {
    const now = new Date();
    return salons.filter((salon) => {
      // Filter out expired salons
      if (salon.subscriptionExpiry) {
        const expiryDate = salon.subscriptionExpiry.toDate();
        if (expiryDate < now) return false;
      }

      const matchesSearch = (salon.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!userLocation || !salon.location) return matchesSearch;
      
      try {
        const distance = getDistance(
          userLocation.lat,
          userLocation.lng,
          salon.location.lat,
          salon.location.lng
        );
        return matchesSearch && distance <= distanceRange; // Use dynamic distance range
      } catch (e) {
        console.error('Error calculating distance:', e);
        return matchesSearch;
      }
    });
  }, [salons, searchQuery, userLocation, distanceRange]);

  console.log('Home: Rendering', { loading, salonsCount: salons.length, filteredCount: filteredSalons.length, hasLocation: !!userLocation });

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <section className="relative h-[300px] rounded-3xl overflow-hidden group bg-zinc-900 border border-white/5 shadow-2xl">
        <img
          src="/hero.webp"
          alt="Salon Hero"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="eager"
          fetchPriority="high"
          referrerPolicy="no-referrer"
          onError={(e) => {
            console.warn('Custom hero image (/hero.webp) not found, using fallback.');
            const target = e.target as HTMLImageElement;
            target.src = "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1920";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8">
          <h1
            className="text-4xl md:text-5xl font-black mb-4 text-white"
          >
            Find Your Perfect Style
          </h1>
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search salons, services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-white/40 shadow-2xl"
              />
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent('trigger-install-prompt');
                window.dispatchEvent(event);
              }}
              className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 md:w-auto"
            >
              <Scissors className="w-5 h-5" />
              Install App
            </button>
          </div>
        </div>
      </section>

      {/* Salon Grid */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <MapPin className="text-purple-500" />
            Nearby Salons
            <span className="text-sm font-normal text-white/40 ml-2">(Within {distanceRange}km)</span>
          </h2>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl min-w-[280px]">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>Range</span>
                <span className="text-purple-400">{distanceRange} KM</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={distanceRange}
                onChange={(e) => setDistanceRange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[400px] bg-white/5 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : filteredSalons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSalons.map((salon) => (
              <div
                key={salon.id}
                onClick={() => navigate(`/salon/${salon.id}`)}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden cursor-pointer group shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-48">
                  <img
                    src={salon.imageUrl}
                    alt={salon.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 shadow-xl">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-bold text-white">4.8</span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-black mb-1 text-white">{salon.name}</h3>
                      <div className="flex items-center gap-1 text-white/40 text-xs font-bold uppercase tracking-widest">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {userLocation && salon.location && typeof salon.location.lat === 'number' && typeof salon.location.lng === 'number'
                            ? (() => {
                                try {
                                  const dist = getDistance(userLocation.lat, userLocation.lng, salon.location.lat, salon.location.lng);
                                  return isNaN(dist) ? 'Nearby' : `${dist.toFixed(1)} km away`;
                                } catch (e) {
                                  return 'Nearby';
                                }
                              })()
                            : 'Nearby'}
                        </span>
                      </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(salon.services || []).slice(0, 3).map((service, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white/10 text-white/60 rounded-lg text-[10px] font-bold uppercase tracking-tighter">
                        {service.name}
                      </span>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Starts from</p>
                      <p className="text-xl font-black text-purple-400">
                        ₹{salon.services && salon.services.length > 0 
                          ? Math.min(...salon.services.map(s => s.price || 0)) 
                          : '0'}
                      </p>
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
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <Scissors className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white/40">No salons found within {distanceRange}km</h3>
            <p className="text-white/20">Try increasing the distance range or searching for a different name.</p>
          </div>
        )}
      </section>
    </div>
  );
};
