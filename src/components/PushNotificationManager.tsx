import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || (typeof process !== 'undefined' ? process.env.VITE_VAPID_PUBLIC_KEY : undefined);

export const PushNotificationManager: React.FC = () => {
  const { profile } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    if (!profile) return;

    const checkSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking push subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [profile]);

  const subscribeToPush = async () => {
    if (!profile || !VAPID_PUBLIC_KEY) {
      toast.error('Push notification setup is incomplete. Please check VAPID keys.');
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Notification permission denied.');
        return;
      }

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send to backend
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, userId: profile.uid })
      });

      if (response.ok) {
        setIsSubscribed(true);
        toast.success('Notifications enabled! You will receive alerts for new bookings.');
      } else {
        throw new Error('Failed to save subscription on server');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable notifications.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.info('Notifications disabled.');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Failed to disable notifications.');
    } finally {
      setLoading(false);
    }
  };

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          isSubscribed ? "bg-green-600/20 text-green-500" : "bg-white/5 text-white/40"
        )}>
          {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Push Notifications</h4>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">
            {isSubscribed ? 'Alerts are active' : 'Get alerts for new bookings'}
          </p>
        </div>
      </div>
      
      <button
        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        disabled={loading}
        className={cn(
          "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
          isSubscribed 
            ? "bg-white/5 text-white/40 hover:bg-white/10" 
            : "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/20"
        )}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSubscribed ? 'Disable' : 'Enable')}
      </button>
    </div>
  );
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Utility to handle class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
