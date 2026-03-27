import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { SalonSetup } from './pages/SalonSetup';
import { BookingDetails } from './pages/BookingDetails';
import { AdminPanel } from './pages/AdminPanel';
import { SalonDetails } from './pages/SalonDetails';
import { Payment } from './pages/Payment';
import { Profile } from './pages/Profile';
import { Toaster } from 'sonner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, error } = useAuth();

  if (error) {
    throw error;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium animate-pulse">Initializing Salon Chair...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
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

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
        <Toaster position="top-center" theme="dark" richColors closeButton />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
