import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { Scissors, Plus, Trash2, MapPin, Image as ImageIcon, Loader2, Save, Shield, Clock, Star } from 'lucide-react';
import { Service, Salon, Barber } from '../types';
import { INDIAN_STATES, STATE_CITIES } from '../constants/india-locations';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { compressImage } from '../lib/image-utils';
import { User, Info } from 'lucide-react';
import { moderateSalonImage } from '../services/moderationService';

export const SalonSetup: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [salonName, setSalonName] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [newBarberName, setNewBarberName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<'pending' | 'authorized_by_ai' | 'rejected_by_ai'>('pending');
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; state?: string; city?: string; address?: string } | null>(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [address, setAddress] = useState('');
  const [salonStatus, setSalonStatus] = useState<'pending' | 'active' | 'hidden' | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'monthly' | 'yearly'>('monthly');

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await response.json();
      if (data && data.address) {
        const state = data.address.state || '';
        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
        const road = data.address.road || '';
        const neighborhood = data.address.neighborhood || data.address.suburb || '';
        const fullAddress = [road, neighborhood].filter(Boolean).join(', ');

        // Try to match state with our list
        const matchedState = INDIAN_STATES.find(s => s.toLowerCase() === state.toLowerCase()) || '';
        
        return {
          state: matchedState,
          city: city,
          address: fullAddress
        };
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
    }
    return null;
  };

  useEffect(() => {
    console.log('SalonSetup: useEffect triggered', { hasProfile: !!profile, role: profile?.role });
    const checkSalon = async () => {
      if (!profile) return;
      
      try {
        console.log('SalonSetup: Checking for existing salon');
        const q = query(collection(db, 'salons'), where('ownerId', '==', profile.uid));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          console.log('SalonSetup: Existing salon found');
          const salonData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Salon;
          setSalonName(salonData.name);
          setServices(salonData.services);
          setBarbers(salonData.barbers || []);
          setImagePreview(salonData.imageUrl);
          setImageStatus(salonData.imageStatus || 'pending');
          setAdminAuthorized(salonData.adminAuthorized || false);
          setLocation(salonData.location);
          setSelectedState(salonData.location.state || '');
          setSelectedCity(salonData.location.city || '');
          setAddress(salonData.location.address || '');
          setSalonStatus(salonData.status);
          if (salonData.subscriptionPlan) {
            setSubscriptionPlan(salonData.subscriptionPlan);
          }
        }
      } catch (error) {
        console.error('SalonSetup: Error checking salon', error);
        try {
          handleFirestoreError(error, OperationType.GET, 'salons');
        } catch (e: any) {
          throw e;
        }
      }
    };

    if (profile?.role === 'salon_owner') {
      checkSalon().catch(err => {
        console.error('Unhandled checkSalon error:', err);
      });
    }

    if (navigator.geolocation && !location) {
      console.log('SalonSetup: Geolocation is supported and location is null');
      setIsDetectingLocation(true);
      const geoTimeout = setTimeout(() => {
        setIsDetectingLocation(false);
        console.warn('SalonSetup: Geolocation request timed out');
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('SalonSetup: Geolocation success', position.coords);
          clearTimeout(geoTimeout);
          const { latitude, longitude } = position.coords;
          const geoData = await reverseGeocode(latitude, longitude);
          
          setLocation({
            lat: latitude,
            lng: longitude,
            ...geoData
          });

          if (geoData) {
            if (geoData.state) setSelectedState(geoData.state);
            if (geoData.city) setSelectedCity(geoData.city);
            if (geoData.address) setAddress(geoData.address);
          }
          setIsDetectingLocation(false);
        },
        (error) => {
          console.error('SalonSetup: Geolocation error', error);
          clearTimeout(geoTimeout);
          setIsDetectingLocation(false);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    }
  }, [profile, navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
      setImage(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
      // Reset status when new image is selected
      setImageStatus('pending');
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to process image');
    }
  };

  const addService = () => {
    if (!newServiceName || !newServicePrice) return;
    setServices([...services, { name: newServiceName, price: parseFloat(newServicePrice) }]);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const removeService = (idx: number) => {
    setServices(services.filter((_, i) => i !== idx));
  };

  const addBarber = () => {
    if (!newBarberName) return;
    setBarbers([...barbers, { id: Math.random().toString(36).substr(2, 9), name: newBarberName }]);
    setNewBarberName('');
  };

  const removeBarber = (id: string) => {
    setBarbers(barbers.filter(b => b.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!image && !imagePreview) {
      toast.error('Please upload a salon image');
      return;
    }
    if (!location) {
      toast.error('Location access is required to list your salon');
      return;
    }
    if (services.length === 0) {
      toast.error('Please add at least one service');
      return;
    }

    setLoading(true);
    console.log('Starting salon setup/update process...');
    const toastId = toast.loading('Processing your salon details...');
    
    try {
      let imageUrl = imagePreview || '';
      let currentImageStatus = imageStatus;
      
      if (image) {
        console.log('New image selected, moderating with AI...');
        toast.loading('Analyzing image with AI...', { id: toastId });
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(image);
        });
        
        const moderation = await moderateSalonImage(base64);
        console.log('Moderation result:', moderation);
        
        if (!moderation.isSafe) {
          toast.error('Image rejected: ' + moderation.reason, { id: toastId });
          setLoading(false);
          return;
        }
        
        imageUrl = base64;
        currentImageStatus = moderation.isValid ? 'authorized_by_ai' : 'rejected_by_ai';
        
        if (!moderation.isValid) {
          toast.warning('Image might not be a salon. Admin will review.', { duration: 5000 });
        }
      }
      
      toast.loading(profile.role === 'salon_owner' ? 'Saving changes...' : 'Creating salon profile...', { id: toastId });

      // Check if salon already exists
      const q = query(collection(db, 'salons'), where('ownerId', '==', profile.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Update existing salon
        const salonId = snapshot.docs[0].id;
        const updates: Partial<Salon> = {
          name: salonName,
          services,
          barbers,
          imageUrl,
          location: {
            ...location,
            state: selectedState,
            city: selectedCity,
            address: address,
          },
          status: 'pending', // Reset to pending on update
          imageStatus: currentImageStatus,
          subscriptionPlan,
        };
        await updateDoc(doc(db, 'salons', salonId), updates);
      } else {
        // Create new salon
        const subscriptionExpiry = new Date();
        if (subscriptionPlan === 'monthly') {
          subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);
        } else {
          subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 365);
        }

        const salonData: Omit<Salon, 'id'> = {
          ownerId: profile.uid,
          name: salonName,
          services,
          barbers,
          imageUrl,
          location: {
            ...location!,
            state: selectedState,
            city: selectedCity,
            address: address,
          },
          status: 'pending',
          imageStatus: currentImageStatus,
          adminAuthorized: false,
          subscriptionPlan,
          subscriptionExpiry: Timestamp.fromDate(subscriptionExpiry),
          createdAt: Timestamp.now(),
        };
        await addDoc(collection(db, 'salons'), salonData);
      }
      
      toast.success('Salon details saved! Authorization may take up to 24 hours.', { id: toastId, duration: 6000 });
      
      if (profile.role !== 'salon_owner') {
        await updateProfile({ role: 'salon_owner' });
      }
      navigate('/payment');
    } catch (error) {
      console.error('Error during salon setup/update:', error);
      toast.error('Failed to save salon details.', { id: toastId });
      handleFirestoreError(error, profile.role === 'salon_owner' ? OperationType.UPDATE : OperationType.CREATE, 'salons');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Setup Your Salon</h1>
            <p className="text-white/60">Join the marketplace and start receiving bookings.</p>
          </div>
        </div>

        <div className="mb-8 p-6 bg-blue-600/10 border border-blue-600/20 rounded-3xl flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-1">Authorization Notice</h4>
            <p className="text-blue-400/60 text-sm leading-relaxed">
              To ensure quality and safety, all salon listings and images are moderated. 
              <strong> It may take up to 24 hours for your salon to be authorized and visible in the marketplace.</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-white/40">Salon Name</label>
            <input
              required
              type="text"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="Enter your salon name"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-white/20"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-white/40">Front Image</label>
            <div
              onClick={() => document.getElementById('image-upload')?.click()}
              className={cn(
                "relative h-48 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all overflow-hidden",
                imagePreview && "border-none"
              )}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-white/20 mb-2" />
                  <span className="text-white/40">Click to upload salon image</span>
                  <span className="text-xs text-white/20 mt-1">JPG, max 100KB (auto-compressed)</span>
                </>
              )}
            </div>
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            
            {imageStatus === 'authorized_by_ai' && (
              <p className="text-green-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Shield className="w-3 h-3" /> AI Authorized
              </p>
            )}
            {imageStatus === 'rejected_by_ai' && (
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> AI Flagged for Review
              </p>
            )}
          </div>

          {/* Services */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-white/40">Services & Pricing</label>
            <div className="flex gap-4">
              <input
                type="text"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Service name (e.g. Haircut)"
                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder:text-white/20"
              />
              <input
                type="number"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="Price (₹)"
                className="w-32 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={addService}
                className="p-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

              <div className="space-y-2">
                {services.map((service, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10"
                  >
                    <span className="font-bold text-white">{service.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-purple-400 font-black">₹{service.price}</span>
                      <button
                        type="button"
                        onClick={() => removeService(idx)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          </div>

          {/* Barbers */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-white/40">Barbers / Staff</label>
            <div className="flex gap-4">
              <input
                type="text"
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                placeholder="Barber name"
                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={addBarber}
                className="p-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-white">{barber.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBarber(barber.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {barbers.length === 0 && (
                <p className="text-xs text-white/20 italic p-2">No barbers added yet. You can still accept multiple bookings manually.</p>
              )}
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-6">
            <label className="block text-sm font-bold uppercase tracking-widest text-gray-400">Location Details</label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">State</label>
                <select
                  required
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedCity(''); // Reset city when state changes
                  }}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none text-white"
                >
                  <option value="" disabled className="bg-black">Select State</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state} className="bg-black">{state}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">City / District</label>
                <select
                  required
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none disabled:opacity-50 text-white"
                  disabled={!selectedState}
                >
                  <option value="" disabled className="bg-black">Select City</option>
                  {selectedState && STATE_CITIES[selectedState]?.map(city => (
                    <option key={city} value={city} className="bg-black">{city}</option>
                  ))}
                  <option value="Other" className="bg-black">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Address / Area Name</label>
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter specific address or area name"
                rows={2}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none text-white placeholder:text-white/20"
              />
            </div>
          </div>

          {/* Location Auto-detection */}
          <div className={cn(
            "p-6 rounded-2xl flex items-center gap-4 border transition-all",
            location ? "bg-blue-500/10 border-blue-500/20" : "bg-yellow-500/10 border-yellow-500/20"
          )}>
            {isDetectingLocation ? (
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            ) : (
              <MapPin className={cn("w-8 h-8", location ? "text-blue-400" : "text-yellow-400")} />
            )}
            <div>
              <h4 className={cn("font-bold", location ? "text-blue-400" : "text-yellow-400")}>
                {isDetectingLocation ? 'Detecting Location...' : location ? 'Location Detected' : 'Location Required'}
              </h4>
              <p className={cn("text-sm", location ? "text-blue-400/60" : "text-yellow-400/60")}>
                {isDetectingLocation 
                  ? 'Fetching your coordinates and address...'
                  : location 
                    ? `Lat: ${typeof location.lat === 'number' ? location.lat.toFixed(4) : 'N/A'}, Lng: ${typeof location.lng === 'number' ? location.lng.toFixed(4) : 'N/A'}` 
                    : 'Please allow location access in your browser to proceed.'}
              </p>
            </div>
          </div>
          
          {/* Subscription Plans */}
          <div className="space-y-6">
            <label className="block text-sm font-bold uppercase tracking-widest text-white/40">Choose Subscription Plan</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setSubscriptionPlan('monthly')}
                className={cn(
                  "p-6 rounded-3xl border-2 cursor-pointer transition-all",
                  subscriptionPlan === 'monthly' 
                    ? "bg-purple-600/20 border-purple-600 shadow-lg shadow-purple-600/10" 
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  {subscriptionPlan === 'monthly' && (
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-white mb-1">Monthly</h3>
                <p className="text-purple-400 font-black text-2xl mb-2">₹200</p>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Standard monthly plan</p>
              </div>

              <div 
                onClick={() => setSubscriptionPlan('yearly')}
                className={cn(
                  "p-6 rounded-3xl border-2 cursor-pointer transition-all relative overflow-hidden",
                  subscriptionPlan === 'yearly' 
                    ? "bg-blue-600/20 border-blue-600 shadow-lg shadow-blue-600/10" 
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                  Best Value
                </div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                    <Star className="w-5 h-5" />
                  </div>
                  {subscriptionPlan === 'yearly' && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-white mb-1">Yearly</h3>
                <p className="text-blue-400 font-black text-2xl mb-2">₹2000</p>
                <div className="space-y-1">
                  <p className="text-green-400 text-xs font-black uppercase tracking-widest">2 Months Free!</p>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Annual savings plan</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-4">
            {!image && !imagePreview && <p className="text-red-400 text-xs text-center font-bold uppercase tracking-tighter">Please upload a salon image</p>}
            {services.length === 0 && <p className="text-red-400 text-xs text-center font-bold uppercase tracking-tighter">Please add at least one service</p>}
            {!location && <p className="text-red-400 text-xs text-center font-bold uppercase tracking-tighter">Location access is required to list your salon</p>}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              {loading 
                ? (profile.role === 'salon_owner' ? 'Updating salon...' : 'Setting up salon...') 
                : (profile.role === 'salon_owner' && salonStatus === 'active' ? 'Save Changes' : 'Save & Pay Now')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
