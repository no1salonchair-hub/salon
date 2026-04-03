import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if it's already captured globally
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setShowPrompt(true);
    }

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    const globalHandler = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('pwa-prompt-available', globalHandler);

    const triggerHandler = () => {
      const prompt = deferredPrompt || (window as any).deferredPrompt;
      if (prompt) {
        handleInstallClick();
      } else {
        // Check if it's iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        
        if (window.matchMedia('(display-mode: standalone)').matches) {
          toast.success('App is already installed!');
        } else if (isIOS) {
          toast.info('To install on iOS: Tap the Share button and select "Add to Home Screen".', {
            duration: 5000,
          });
        } else {
          toast.info('Installation is ready! If the prompt didn\'t appear, use your browser menu and select "Add to Home Screen".', {
            duration: 5000,
          });
        }
      }
    };

    window.addEventListener('trigger-install-prompt', triggerHandler);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('pwa-prompt-available', globalHandler);
      window.removeEventListener('trigger-install-prompt', triggerHandler);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (window as any).deferredPrompt;
    if (!prompt) return;

    // Show the install prompt
    prompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await prompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-96"
        >
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-2xl shadow-purple-600/20 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm">Install Salon Chair</h3>
                <p className="text-white/40 text-xs mt-1">
                  Add to your home screen for a faster, app-like experience.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    Install Now
                  </button>
                  <button
                    onClick={() => setShowPrompt(false)}
                    className="px-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
