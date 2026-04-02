import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, LogIn, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner';

const SalonChairIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 3l3 12h12c0 1-1 2-2 2H9l-3-12z" />
    <path d="M8 10h10l2 5" />
    <path d="M13 17v4" />
    <path d="M11 19h2" />
    <path d="M9 22h8" />
  </svg>
);

export const Login: React.FC = () => {
  const { signIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
  const [adminPassword, setAdminPassword] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      if (user.email === 'no1salonchair@gmail.com') {
        if (sessionStorage.getItem('admin_verified') === 'true') {
          navigate('/');
        } else {
          setShowAdminPassword(true);
        }
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    
    // Simulate a small delay for better UX
    setTimeout(() => {
      if (adminPassword === 'Jumbopack@1137#') {
        sessionStorage.setItem('admin_verified', 'true');
        toast.success('Admin access granted');
        navigate('/');
      } else {
        toast.error('Incorrect admin password');
        setIsVerifying(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20"
            >
              <Scissors className="w-10 h-10 text-white" />
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div
              className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20"
            >
              <SalonChairIcon className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent italic tracking-tighter uppercase">
            Salon Chair
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
            Premium Salon Booking Marketplace
          </p>
        </div>

        <div className="space-y-6">
          {!showAdminPassword ? (
            <button
              type="button"
              disabled={isSigningIn}
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white text-black rounded-2xl font-black text-lg hover:bg-gray-100 transition-all active:scale-95 group relative z-20 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
            >
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
              )}
              <span>{isSigningIn ? 'Opening Google...' : 'Sign in with Google'}</span>
            </button>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">Admin Verification Required</p>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter Admin Password"
                  autoFocus
                  className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-white/20"
                />
              </div>
              <button
                type="submit"
                disabled={isVerifying || !adminPassword}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-lg hover:bg-purple-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20"
              >
                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Verify & Login
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2 text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                Cancel & Sign Out
              </button>
            </form>
          )}

          <div className="text-center">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">
              {showAdminPassword ? 'Restricted Access Area' : 'Secure Authentication via Google'}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-center space-y-3">
          <p className="text-xs text-white/40 font-bold">
            By signing in, you agree to our <span className="text-purple-400 hover:text-purple-300 cursor-pointer transition-colors" onClick={() => navigate('/privacy')}>Privacy Policy</span>
          </p>
          <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">
            Need help? <span className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors" onClick={() => navigate('/contact')}>Contact Support</span>
          </p>
        </div>
      </div>
    </div>
  );
};
