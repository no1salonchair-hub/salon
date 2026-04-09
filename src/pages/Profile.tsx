import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { User, Mail, Shield, Scissors, Save, Loader2, CheckCircle, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const Profile: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

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

  const handleEnableNotifications = () => {
    const event = new CustomEvent('trigger-notification-subscribe');
    window.dispatchEvent(event);
    
    // Refresh permission status after a short delay
    setTimeout(() => {
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    }, 1000);
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
      <div
        className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8 shadow-xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Your Profile</h1>
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Manage your account settings and role.</p>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
              <input
                disabled
                type="email"
                value={profile.email}
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl opacity-50 cursor-not-allowed text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
              <Shield className="w-8 h-8 text-purple-400 mb-2" />
              <p className="text-[10px] uppercase tracking-widest font-black text-white/20 mb-1">Current Role</p>
              <p className="text-xl font-black text-purple-400 capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
              <Scissors className="w-8 h-8 text-blue-400 mb-2" />
              <p className="text-[10px] uppercase tracking-widest font-black text-white/20 mb-1">Member Since</p>
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

        {profile.role === 'salon_owner' && (
          <div className="pt-8 border-t border-white/10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-purple-400">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Booking Notifications</h3>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Receive alerts for new booking requests.</p>
              </div>
            </div>

            <div className={cn(
              "p-6 rounded-2xl border flex items-center justify-between",
              notificationPermission === 'granted' ? "bg-green-500/5 border-green-500/20" : "bg-yellow-500/5 border-yellow-500/20"
            )}>
              <div className="flex items-center gap-3">
                {notificationPermission === 'granted' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <BellOff className="w-5 h-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-bold text-white">
                    {notificationPermission === 'granted' ? 'Notifications Enabled' : 'Notifications Disabled'}
                  </p>
                  <p className="text-xs text-white/40">
                    {notificationPermission === 'granted' 
                      ? 'You will receive push notifications for new bookings.' 
                      : 'Please enable notifications to stay updated on new bookings.'}
                  </p>
                </div>
              </div>
              
              {notificationPermission !== 'granted' && (
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/20"
                >
                  Enable Now
                </button>
              )}
            </div>
          </div>
        )}

        {profile.role === 'user' && (
          <div className="pt-8 border-t border-white/10 text-center">
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs mb-4">Are you a salon owner?</p>
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
      </div>
    </div>
  );
};
