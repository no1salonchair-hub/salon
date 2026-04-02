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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse tracking-widest uppercase text-xs">Loading Salon Chair...</p>
        {showEmergencyButton && (
          <div className="text-center animate-in fade-in duration-700">
            <p className="text-gray-500 text-sm mb-4 max-w-xs mx-auto px-4">
              Still loading? This might be due to blocked third-party cookies or a slow connection.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-white/10"
            >
              Reload Application
            </button>
          </div>
        )}
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
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
