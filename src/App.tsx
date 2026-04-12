import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { HelmetProvider } from 'react-helmet-async';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const SalonSetup = lazy(() => import('./pages/SalonSetup').then(m => ({ default: m.SalonSetup })));
const BookingDetails = lazy(() => import('./pages/BookingDetails').then(m => ({ default: m.BookingDetails })));
const AdminPanel = lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })));
const SalonDetails = lazy(() => import('./pages/SalonDetails').then(m => ({ default: m.SalonDetails })));
const Payment = lazy(() => import('./pages/Payment').then(m => ({ default: m.Payment })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const FAQs = lazy(() => import('./pages/FAQs').then(m => ({ default: m.FAQs })));

import { InstallPrompt } from './components/InstallPrompt';
import { NotificationManager } from './components/NotificationManager';

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
          <Router>
            <AuthConsumer />
          </Router>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

const AuthConsumer: React.FC = () => {
  const { loading, error } = useAuth();
  const location = useLocation();
  const [showEmergency, setShowEmergency] = React.useState(false);
  const [forceLogin, setForceLogin] = React.useState(false);

  const publicRoutes = ['/login', '/privacy', '/contact', '/faqs'];
  const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));
  
  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowEmergency(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  console.log('AuthConsumer: Rendering', { loading, hasError: !!error, forceLogin, isPublicRoute, path: location.pathname });

  if (error && !isPublicRoute) {
    console.error('AuthConsumer: Auth error detected', error);
    throw error;
  }

  if (loading && !forceLogin && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Salon Chair</h2>
        <p className="text-gray-500 text-sm animate-pulse mb-8">Initializing Application...</p>
        
        {showEmergency && (
          <div className="animate-in fade-in duration-1000 space-y-4">
            <p className="text-gray-500 text-xs mb-4 max-w-xs mx-auto leading-relaxed">
              This is taking longer than expected. It might be due to a slow connection or blocked third-party cookies (common in incognito mode).
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all w-full max-w-xs mx-auto"
              >
                Reload App
              </button>
              <button 
                onClick={() => setForceLogin(true)}
                className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all w-full max-w-xs mx-auto"
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
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
            <Route path="/faqs" element={<FAQs />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      <Toaster position="top-center" expand={false} richColors />
      <InstallPrompt />
      <NotificationManager />
    </>
  );
};

export default App;
