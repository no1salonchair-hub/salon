import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const PushNotificationManager: React.FC = () => {
  const { profile } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vapidKey, setVapidKey] = useState<string | null>(
    import.meta.env.VITE_VAPID_PUBLIC_KEY || (typeof process !== 'undefined' ? process.env.VITE_VAPID_PUBLIC_KEY : null)
  );
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    if (!profile) return;

    const init = async () => {
      // 1. Fetch VAPID key from server ALWAYS to ensure consistency
      try {
        const res = await fetch('/api/notifications/vapid-key');
        if (res.ok) {
          const data = await res.json();
          setVapidKey(data.publicKey);
          console.log('Push: Fetched VAPID key from server');
        } else {
          console.error('Push: Failed to fetch VAPID key from server', res.status);
        }
      } catch (err) {
        console.error('Push: Network error fetching VAPID key:', err);
      }

      // 2. Check subscription
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push: Browser does not support push notifications');
        setLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        console.log('Push: Initial subscription state:', !!subscription);
      } catch (error) {
        console.error('Push: Error checking subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [profile]);

  const subscribeToPush = async () => {
    if (!profile || !vapidKey) {
      toast.error('Push notification setup is incomplete. Please check VAPID keys.');
      console.error('Missing profile or VAPID key:', { profile: !!profile, vapidKey: !!vapidKey });
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
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      console.log('Push: Subscription successful, saving to Firestore...');

      // Save to Firestore directly
      const subscriptionData = JSON.parse(JSON.stringify(subscription));
      
      await setDoc(doc(db, 'push_subscriptions', profile.uid), {
        subscription: subscriptionData,
        updatedAt: serverTimestamp()
      });

      setIsSubscribed(true);
      toast.success('Notifications enabled! You will receive alerts for new bookings.');
    } catch (error: any) {
      console.error('Push: Error subscribing:', error);
      toast.error(`Failed to enable notifications: ${error.message}`);
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
        // Also remove from Firestore
        try {
          await deleteDoc(doc(db, 'push_subscriptions', profile.uid));
        } catch (err) {
          console.error('Push: Error removing subscription from Firestore:', err);
        }
        setIsSubscribed(false);
        toast.info('Notifications disabled.');
      }
    } catch (error) {
      console.error('Push: Error unsubscribing:', error);
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
