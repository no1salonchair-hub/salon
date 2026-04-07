import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export const NotificationManager: React.FC = () => {
  const { profile } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'salon_owner') return;

    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered with scope:', registration.scope);

          // Check if already subscribed
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            setIsSubscribed(true);
            // Update subscription on server just in case
            await sendSubscriptionToServer(subscription, profile.uid);
          } else {
            // Request permission and subscribe
            await subscribeUser(registration);
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    const subscribeUser = async (registration: ServiceWorkerRegistration) => {
      try {
        const response = await fetch('/api/notifications/vapid-key');
        if (!response.ok) throw new Error('Failed to fetch VAPID key');
        const { publicKey } = await response.json();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        console.log('User is subscribed:', subscription);
        await sendSubscriptionToServer(subscription, profile.uid);
        setIsSubscribed(true);
        toast.success('Notifications enabled for new bookings!');
      } catch (error) {
        console.error('Failed to subscribe user:', error);
      }
    };

    const sendSubscriptionToServer = async (subscription: PushSubscription, userId: string) => {
      try {
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, userId })
        });
      } catch (error) {
        console.error('Error sending subscription to server:', error);
      }
    };

    registerServiceWorker();

    // Clear app badge when app is opened
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(error => {
        console.error('Error clearing app badge:', error);
      });
    }
  }, [profile]);

  return null;
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
