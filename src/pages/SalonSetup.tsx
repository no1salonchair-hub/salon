import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Scissors, Plus, Trash2, MapPin, Image as ImageIcon, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Service, Salon } from '../types';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const SalonSetup: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [salonName, setSalonName] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (profile?.role === 'salon_owner') {
      // Check if salon already exists
      const checkSalon = async () => {
        try {
          const q = query(collection(db, 'salons'), where('ownerId', '==', profile.uid));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            navigate('/dashboard');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'salons');
        }
      };
      checkSalon();
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error('Error getting location:', error)
      );
    }
  }, [profile, navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Browser-side image compression
    const compressedFile = await compressImage(file);
    setImage(compressedFile);
    setImagePreview(URL.createObjectURL(compressedFile));
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], 'salon_front.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(newFile);
              }
            },
            'image/jpeg',
            0.7 // Compression quality
          );
        };
      };
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !image || !location || services.length === 0) return;

    setLoading(true);
    try {
      // 1. Upload Image
      const storageRef = ref(storage, `salons/${profile.uid}/front.jpg`);
      await uploadBytes(storageRef, image);
      const imageUrl = await getDownloadURL(storageRef);

      // 2. Create Salon
      const salonData: Omit<Salon, 'id'> = {
        ownerId: profile.uid,
        name: salonName,
        services,
        imageUrl,
        location,
        status: 'pending',
        subscriptionExpiry: Timestamp.now(), // Will be updated by admin
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'salons'), salonData);
      
      // 3. Update User Role (if not already)
      if (profile.role !== 'salon_owner') {
        await updateProfile({ role: 'salon_owner' });
      }

      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'salons');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Setup Your Salon</h1>
            <p className="text-gray-400">Join the marketplace and start receiving bookings.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-gray-500">Salon Name</label>
            <input
              required
              type="text"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="Enter your salon name"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-gray-500">Front Image</label>
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
                    <Plus className="w-8 h-8" />
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-gray-600 mb-2" />
                  <span className="text-gray-500">Click to upload salon image</span>
                  <span className="text-xs text-gray-600 mt-1">JPG, max 100KB (auto-compressed)</span>
                </>
              )}
            </div>
            <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          {/* Services */}
          <div className="space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-gray-500">Services & Pricing</label>
            <div className="flex gap-4">
              <input
                type="text"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Service name (e.g. Haircut)"
                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="number"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="Price (₹)"
                className="w-32 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={addService}
                className="p-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-500 transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {services.map((service, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5"
                  >
                    <span className="font-bold">{service.name}</span>
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Location */}
          <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4">
            <MapPin className="w-8 h-8 text-blue-400" />
            <div>
              <h4 className="font-bold text-blue-400">Location Detected</h4>
              <p className="text-sm text-blue-300/60">
                {location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'Detecting your location...'}
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            disabled={loading || !image || !location || services.length === 0}
            className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            {loading ? 'Setting up your salon...' : 'Complete Setup'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
