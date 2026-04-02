import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { HelmetProvider } from 'react-helmet-async';

// Import all pages directly
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { SalonSetup } from './pages/SalonSetup';
import { BookingDetails } from './pages/BookingDetails';
import { AdminPanel } from './pages/AdminPanel';
import { SalonDetails } from './pages/SalonDetails';
import { Payment } from './pages/Payment';
import { Profile } from './pages/Profile';
import { Privacy } from './pages/Privacy';
import { Contact } from './pages/Contact';
import { InstallPrompt } from './components/InstallPrompt';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-gray-500 font-medium animate-pulse tracking-widest uppercase text-xs">Loading Salon Chair...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, error } = useAuth();
  const [showEmergencyButton, setShowEmergencyButton] = React.useState(false);

  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowEmergencyButton(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (error) {
    throw error;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 overflow-hidden relative">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin-slow" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Salon Chair</h2>
            <p className="text-gray-500 font-bold animate-pulse tracking-widest uppercase text-[10px]">Initializing Premium Experience...</p>
          </div>

          {showEmergencyButton && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                Taking longer than expected? This might be due to a slow connection or blocked cookies.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-white/5 active:scale-95"
              >
                Reload Application
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to /login');
    return <Navigate to="/login" />;
  }

  // Admin password check for every session
  if (user.email === 'no1salonchair@gmail.com' && sessionStorage.getItem('admin_verified') !== 'true') {
    console.log('ProtectedRoute: Admin not verified in this session, redirecting to /login');
    return <Navigate to="/login" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Layout>{children}</Layout>
    </motion.div>
  );
};

const App: React.FC = () => {
  console.log('App: Rendering');
  const [showSkip, setShowSkip] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/salon-setup" element={<ProtectedRoute><SalonSetup /></ProtectedRoute>} />
                <Route path="/salon/:salonId" element={<ProtectedRoute><SalonDetails /></ProtectedRoute>} />
                <Route path="/booking/:bookingId" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/contact" element={<Contact />} />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AnimatePresence>
          </Router>
          <Toaster position="top-center" expand={false} richColors />
          <InstallPrompt />
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
