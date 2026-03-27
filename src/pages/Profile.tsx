import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { User, Mail, Shield, Scissors, Save, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const Profile: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);

  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToOwner = async () => {
    setIsUpdatingRole(true);
    try {
      await updateProfile({ role: 'salon_owner' });
      toast.success('Role updated to Salon Owner!');
    } catch (error) {
      console.error('Error switching role:', error);
      toast.error('Failed to switch role. Please try again.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Your Profile</h1>
            <p className="text-gray-400">Manage your account settings and role.</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                disabled
                type="email"
                value={profile.email}
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl opacity-50 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
              <Shield className="w-8 h-8 text-purple-400 mb-2" />
              <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-1">Current Role</p>
              <p className="text-xl font-black text-purple-400 capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
            <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <Scissors className="w-8 h-8 text-blue-400 mb-2" />
              <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-1">Member Since</p>
              <p className="text-xl font-black text-blue-400">
                {profile.createdAt.toDate().getFullYear()}
              </p>
            </div>
          </div>

          <button
            disabled={loading || !name.trim() || name === profile.name}
            className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            {loading ? 'Saving Changes...' : 'Update Profile'}
          </button>
        </form>

        {profile.role === 'user' && (
          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-gray-400 mb-4">Are you a salon owner?</p>
            <button
              disabled={isUpdatingRole}
              onClick={handleSwitchToOwner}
              className="px-8 py-3 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
            >
              {isUpdatingRole && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUpdatingRole ? 'Switching...' : 'Switch to Salon Owner Role'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
