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
          }
          
          // Listen for manual trigger
          const handleManualSubscribe = async () => {
            console.log('Manual notification subscription triggered');
            await subscribeUser(registration);
          };

          window.addEventListener('trigger-notification-subscribe', handleManualSubscribe);
          
          // Also try automatic subscription if not subscribed
          if (!subscription) {
            await subscribeUser(registration);
          }

          return () => {
            window.removeEventListener('trigger-notification-subscribe', handleManualSubscribe);
          };
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

        console.log('User is subscribed:', JSON.stringify(subscription));
        await sendSubscriptionToServer(subscription, profile.uid);
        setIsSubscribed(true);
        toast.success('Notifications enabled for new bookings!');
      } catch (error) {
        console.error('Failed to subscribe user:', error);
        toast.error('Failed to enable notifications. Please check your browser settings.');
      }
    };

    const sendSubscriptionToServer = async (subscription: PushSubscription, userId: string) => {
      try {
        console.log('Sending subscription to server for user:', userId);
        
        // Ensure subscription is a plain object
        const subscriptionData = JSON.parse(JSON.stringify(subscription));
        
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscriptionData, userId })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error details:', errorData);
          throw new Error(errorData.details || errorData.error || 'Failed to save subscription');
        }
        
        console.log('Subscription saved to server successfully');
      } catch (error: any) {
        console.error('Error sending subscription to server:', error);
        // Only show toast if it's a real error, not just a cancellation
        if (error.name !== 'AbortError') {
          toast.error(`Notification sync failed: ${error.message}`);
        }
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
