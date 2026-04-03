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
  const { user, error } = useAuth();

  if (error) {
    throw error;
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
    console.log('App: Mounted');
    const timer = setTimeout(() => setShowSkip(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

const AuthConsumer: React.FC = () => {
  const { loading, error } = useAuth();
  const [showEmergency, setShowEmergency] = React.useState(false);
  
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowEmergency(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  console.log('AuthConsumer: Rendering', { loading, hasError: !!error });

  if (error) {
    console.error('AuthConsumer: Auth error detected', error);
    throw error;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Salon Chair</h2>
        <p className="text-gray-500 text-sm animate-pulse mb-8">Initializing Application...</p>
        
        {showEmergency && (
          <div className="animate-in fade-in duration-1000">
            <p className="text-gray-500 text-xs mb-4 max-w-xs mx-auto">
              This is taking longer than expected. It might be due to a slow connection or blocked third-party cookies.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Reload App
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
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
      <Toaster position="top-center" expand={false} richColors />
      <InstallPrompt />
    </Router>
  );
};

export default App;
