import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../components/AuthContext';

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
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/');
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

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

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

          <div className="text-center">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">
              Secure Authentication via Google
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
