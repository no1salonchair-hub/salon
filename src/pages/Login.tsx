import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Scissors, 
  LogIn, 
  Loader2, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Coins, 
  CheckCircle2, 
  Calendar, 
  PhoneOff, 
  ChevronRight, 
  MapPin, 
  Star, 
  User, 
  ArrowRight,
  Shield,
  Smartphone,
  Check,
  CheckCircle,
  ThumbsUp,
  Award,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Interactive Product Demo state
  const [demoTab, setDemoTab] = useState<'calendar' | 'profile' | 'dashboard' | 'booking'>('calendar');
  const demoSectionRef = useRef<HTMLDivElement>(null);

  // Calendar demo mock variables
  const [selectedStaff, setSelectedStaff] = useState<'all' | 'rahul' | 'sanjay'>('all');
  
  // Client booking flow mock variables
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.email === 'no1salonchair@gmail.com') {
        if (sessionStorage.getItem('admin_verified') === 'true') {
          navigate('/');
        } else {
          setShowAdminPassword(true);
        }
      } else {
        const redirect = sessionStorage.getItem('redirect_post_login') || '/';
        sessionStorage.removeItem('redirect_post_login');
        navigate(redirect);
      }
    }
  }, [user, navigate]);

  const handleSignIn = async (origin?: string) => {
    setIsSigningIn(true);
    if (origin === 'register') {
      sessionStorage.setItem('redirect_post_login', '/salon-setup');
    }
    try {
      await signIn();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    
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

  const scrollToDemo = () => {
    demoSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden relative selection:bg-purple-600/30 selection:text-purple-300">
      
      {/* 1. Urgency Founding Offer Banner */}
      <div className="w-full bg-gradient-to-r from-purple-800 via-purple-600 to-indigo-700 py-3 px-4 text-center text-xs sm:text-sm font-black uppercase tracking-wider relative z-50 flex items-center justify-center gap-2 shadow-lg">
        <span className="inline-flex items-center justify-center bg-white/20 px-2 py-0.5 rounded-full text-[10px] animate-pulse">EXCLUSIVE</span>
        <span>🎉 First 50 salons/City get 3 months free. No credit card required.</span>
      </div>

      {/* Background Ambitions Glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[600px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-[50%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/15 blur-[150px] rounded-full pointer-events-none" />

      {/* Top Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5 relative z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-1.5 font-sans">
            <span className="text-lg font-black tracking-tighter uppercase italic text-white">
              Salon Chair
            </span>
            <div className="w-8 h-8 hidden sm:flex bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl items-center justify-center">
              <SalonChairIcon className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={scrollToDemo}
            className="text-xs uppercase tracking-widest font-bold text-white/60 hover:text-white transition-colors py-2 px-3 hover:bg-white/5 rounded-xl hidden md:inline-block"
          >
            Explore Product
          </button>
          <button
            onClick={() => handleSignIn()}
            disabled={isSigningIn}
            className="flex items-center gap-2 py-2 px-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all"
          >
            {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5 text-purple-400" />}
            <span>Sign In</span>
          </button>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-bold text-purple-400 uppercase tracking-widest mb-8 animate-bounce">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The Next-Gen Salon Supercharger</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-sans font-black tracking-tight leading-[1.05] max-w-4xl text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-200">
          The Best Chair is <br />
          <span className="italic bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-400">
            Waiting...
          </span>
        </h1>

        <p className="text-white/60 text-lg sm:text-xl font-medium max-w-2xl mt-6 leading-relaxed">
          Create your salon profile, accept appointments online, and manage bookings from one dashboard. Keep your chairs filled 24/7.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10 w-full sm:w-auto">
          <button
            onClick={() => handleSignIn('register')}
            disabled={isSigningIn}
            className="px-8 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 border border-purple-500/30 transform active:scale-95 duration-150"
          >
            {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-green-300" />}
            Register Your Salon Free
          </button>

          <button
            onClick={scrollToDemo}
            className="px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-2 backdrop-blur-sm"
          >
            View Demo & Interactive Preview
            <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>
        </div>

        {/* Risk Reliever */}
        <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest mt-4">
          ✨ 1-Minute Google Setup • Free trial • Cancel anytime
        </p>

        {/* 3. Trust Section */}
        <div className="mt-20 w-full max-w-4xl border border-white/10 rounded-[3rem] p-8 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-xl relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-900/30 px-4 py-1.5 rounded-full border border-purple-500/30 text-[10px] font-black uppercase tracking-widest text-purple-300">
            Engineered For Excellence
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-1 md:flex-1">
              <p className="text-white/40 text-xs font-black uppercase tracking-widest">Aesthetic Verticals</p>
              <h3 className="text-lg font-black text-neutral-300">
                Designed for barbershops, beauty parlours, salons, and spas.
              </h3>
            </div>
            
            <div className="w-full md:w-px h-px md:h-12 bg-white/10" />

            <div className="space-y-1 md:flex-1 md:pl-6">
              <p className="text-purple-400 text-xs font-black uppercase tracking-widest">Proven Launch Traction</p>
              <h3 className="text-lg font-black text-white">
                Trusted by 25+ Hyderabad salons.
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Explain Benefits (using high-impact cards) */}
      <section className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-sans font-black tracking-tight">
            Stop Losing Clients <span className="text-purple-400 italic">To Busy Phones</span>
          </h2>
          <p className="text-white/40 text-sm tracking-widest font-bold uppercase mt-3">
            Why leading modern salon owners choose our virtual chair platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Benefit 1 */}
          <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 rounded-3xl p-8 hover:border-purple-500/40 transition-all hover:-translate-y-1 duration-300 group">
            <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold mb-2">More Bookings</h4>
            <p className="text-white/60 text-sm leading-relaxed">
              Accept appointments 24/7. Let clients schedule haircuts or stylings while you sleep, directly on your online slot page.
            </p>
          </div>

          {/* Benefit 2 */}
          <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 rounded-3xl p-8 hover:border-purple-500/40 transition-all hover:-translate-y-1 duration-300 group">
            <div className="w-12 h-12 bg-fuchsia-600/20 rounded-2xl flex items-center justify-center text-fuchsia-400 mb-6 group-hover:scale-110 transition-transform">
              <PhoneOff className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold mb-2">Less Missed Calls</h4>
            <p className="text-white/60 text-sm leading-relaxed">
              Customers book online. No more cutting hair while holding a phone or ignoring your next loyal walk-in client.
            </p>
          </div>

          {/* Benefit 3 */}
          <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 rounded-3xl p-8 hover:border-purple-500/40 transition-all hover:-translate-y-1 duration-300 group">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold mb-2">Save Time</h4>
            <p className="text-white/60 text-sm leading-relaxed">
              Manage appointments from one dashboard. Drag, reorder, check stylist calendar slots, or verify billing in three taps.
            </p>
          </div>

          {/* Benefit 4 */}
          <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 rounded-3xl p-8 hover:border-purple-500/40 transition-all hover:-translate-y-1 duration-300 group">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold mb-2">Grow Revenue</h4>
            <p className="text-white/60 text-sm leading-relaxed">
              Keep customers coming back. Direct checkout, SMS/push booking confirmations, and digital stickers make booking addictive.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Interactive Demo Tour Section */}
      <section 
        ref={demoSectionRef}
        className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5 relative z-10"
      >
        <div className="text-center mb-16">
          <div className="bg-purple-600/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full inline-block mb-3">
            Interactive Product Demo
          </div>
          <h2 className="text-3xl sm:text-5xl font-sans font-black tracking-tight">
            See the Software <span className="text-purple-400 italic">In Action</span>
          </h2>
          <p className="text-white/50 text-sm mt-3 max-w-xl mx-auto leading-relaxed">
            Salon owners prefer viewing our software before registering. Click the tabs below to explore our clean client and merchant screens.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setDemoTab('calendar')}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all ${
              demoTab === 'calendar' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Booking Calendar
          </button>
          
          <button
            onClick={() => setDemoTab('profile')}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all ${
              demoTab === 'profile' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Salon Customer Profile
          </button>

          <button
            onClick={() => setDemoTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all ${
              demoTab === 'dashboard' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Owner Analytics Dashboard
          </button>

          <button
            onClick={() => setDemoTab('booking')}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all ${
              demoTab === 'booking' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Client Frictionless Booking Page
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="bg-[#0c1222] border border-white/10 rounded-[2.5rem] p-4 sm:p-8 min-h-[450px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
          
          {/* Subtle frame indicators */}
          <div className="absolute top-4 left-6 flex items-center gap-1.5 text-white/10">
            <div className="w-3 h-3 bg-red-500/20 rounded-full" />
            <div className="w-3 h-3 bg-yellow-500/20 rounded-full" />
            <div className="w-3 h-3 bg-green-500/20 rounded-full" />
            <span className="text-[10px] uppercase font-black tracking-widest pl-2">App Screenshot Preview</span>
          </div>

          <div className="pt-8 w-full">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: BOOKING CALENDAR */}
              {demoTab === 'calendar' && (
                <motion.div
                  key="calendar-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Calendar className="text-purple-400 w-5 h-5" />
                        Today's Chair Schedule
                      </h3>
                      <p className="text-xs text-white/40">Manage Stylists and upcoming customer queues in real-time</p>
                    </div>
                    {/* Stylist Filters */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedStaff('all')}
                        className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black transition-all ${selectedStaff === 'all' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/35' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                      >
                        All Staff
                      </button>
                      <button 
                        onClick={() => setSelectedStaff('rahul')}
                        className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black transition-all ${selectedStaff === 'rahul' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/35' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                      >
                        Rahul (Chair 1)
                      </button>
                      <button 
                        onClick={() => setSelectedStaff('sanjay')}
                        className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-black transition-all ${selectedStaff === 'sanjay' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/35' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                      >
                        Sanjay (Chair 2)
                      </button>
                    </div>
                  </div>

                  {/* Calendar Matrix Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Column 09:00 AM */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[140px] relative">
                      <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">09:00 AM</span>
                      {(selectedStaff === 'all' || selectedStaff === 'rahul') && (
                        <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-2.5 text-left mt-2 shadow-lg">
                          <p className="text-xs font-bold text-purple-300">Harish Kumar</p>
                          <p className="text-[10px] text-white/50 font-medium">Haircut + Styling</p>
                          <span className="inline-block mt-2 text-[9px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Confirmed</span>
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-white/25 text-right mt-2 block">Chair 1</span>
                    </div>

                    {/* Column 10:30 AM */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[140px]">
                      <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">10:30 AM</span>
                      {(selectedStaff === 'all' || selectedStaff === 'sanjay') && (
                        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-2.5 text-left mt-2 shadow-lg">
                          <p className="text-xs font-bold text-blue-300">Priya Sharma</p>
                          <p className="text-[10px] text-white/50 font-medium">Hair Spa & Blow Dry</p>
                          <span className="inline-block mt-2 text-[9px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">In Progress</span>
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-white/25 text-right mt-2 block">Chair 2</span>
                    </div>

                    {/* Column 01:00 PM */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[140px]">
                      <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">01:00 PM</span>
                      {(selectedStaff === 'all' || selectedStaff === 'rahul') && (
                        <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-2.5 text-left mt-2 shadow-lg">
                          <p className="text-xs font-bold text-purple-300">Vikram Reddy</p>
                          <p className="text-[10px] text-white/50 font-medium">Trim & Hot Towel Shave</p>
                          <span className="inline-block mt-2 text-[9px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Confirmed</span>
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-white/25 text-right mt-2 block font-mono">Chair 1</span>
                    </div>

                    {/* Column 04:30 PM */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between min-h-[140px] opacity-75">
                      <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">04:30 PM</span>
                      <div className="border border-dashed border-white/10 rounded-xl p-4 text-center mt-2 flex flex-col items-center justify-center flex-1">
                        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">Chair Empty</span>
                        <p className="text-[10px] text-white/20">Accepting Bookings</p>
                      </div>
                      <span className="text-[10px] font-bold text-white/25 text-right mt-2 block">Available</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: SALON CLIENT PROFILE */}
              {demoTab === 'profile' && (
                <motion.div
                  key="profile-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-purple-600/10">
                        💈
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-white">Classic Trim & Styles</h3>
                        <div className="flex items-center gap-1 mt-1 text-xs">
                          <div className="flex items-center text-yellow-400">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400" />)}
                          </div>
                          <span className="font-bold text-neutral-300">4.9</span>
                          <span className="text-white/40 font-medium">(145 visits)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 py-1.5 px-3 rounded-lg border border-white/10">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs text-white/60">Banjara Hills, Hyderabad</span>
                    </div>
                  </div>

                  {/* Service Cards Grid */}
                  <div className="space-y-2.5">
                    <p className="text-left text-xs uppercase tracking-widest font-black text-white/40">Popular Services Setup</p>
                    
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-colors">
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-white">Classic Beard Styling & Trimming</h4>
                        <p className="text-xs text-white/40">Includes essential beard bath, steam, and premium grooming oil</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <span className="text-sm font-black text-purple-400">₹180</span>
                        <button className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-500">Book</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-colors">
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-white">Executive Organic Facial Glow</h4>
                        <p className="text-xs text-white/40">Luxury massage with mud pack, skin tightening, and cold mist</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <span className="text-sm font-black text-purple-400">₹850</span>
                        <button className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-500">Book</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: OWNER ANALYTICS DASHBOARD */}
              {demoTab === 'dashboard' && (
                <motion.div
                  key="dashboard-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="text-left">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                      <TrendingUp className="text-emerald-400 w-5 h-5" />
                      Performance Indicators
                    </h3>
                    <p className="text-xs text-white/40">Real-time stats from the owner management console</p>
                  </div>

                  {/* Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left flex justify-between items-center relative">
                      <div>
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Today's Revenue</span>
                        <h4 className="text-2xl font-black text-white mt-1">₹8,450</h4>
                        <span className="text-[10px] text-emerald-400 font-bold block mt-2">▲ +18.4% today</span>
                      </div>
                      <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-400">
                        <Coins className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left flex justify-between items-center relative">
                      <div>
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Appointments Saved</span>
                        <h4 className="text-2xl font-black text-white mt-1">45 bookings</h4>
                        <span className="text-[10px] text-purple-400 font-bold block mt-2">Zero lost phone-calls</span>
                      </div>
                      <div className="bg-purple-500/10 p-3 rounded-2xl text-purple-400">
                        <Check className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left flex justify-between items-center relative">
                      <div>
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Customer Returning</span>
                        <h4 className="text-2xl font-black text-white mt-1">78.2%</h4>
                        <span className="text-[10px] text-blue-400 font-bold block mt-2">▲ 250+ active profiles</span>
                      </div>
                      <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400">
                        <User className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: FRICTIONLESS CUSTOMER BOOKING PAGE */}
              {demoTab === 'booking' && (
                <motion.div
                  key="booking-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 text-left"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-purple-400" />
                        Client Booking Simulator
                      </h3>
                      <p className="text-xs text-white/40">Try clicking the steps to see the gorgeous checkout flow</p>
                    </div>
                    {/* Simulator Restart */}
                    <button 
                      onClick={() => {
                        setBookingStep(1);
                        setSelectedService(null);
                        setSelectedStylist(null);
                        setSelectedTimeSlot(null);
                      }}
                      className="text-[9px] uppercase tracking-widest font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/20"
                    >
                      Reset Simulator
                    </button>
                  </div>

                  {/* Booking Step Track */}
                  <div className="flex items-center justify-center gap-3 max-w-sm mx-auto mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${bookingStep >= 1 ? 'bg-purple-600 text-white border-purple-600' : 'bg-transparent text-white/40 border-white/10'}`}>1</div>
                    <div className={`h-0.5 flex-1 ${bookingStep >= 2 ? 'bg-purple-600' : 'bg-white/10'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${bookingStep >= 2 ? 'bg-purple-600 text-white border-purple-600' : 'bg-transparent text-white/40 border-white/10'}`}>2</div>
                    <div className={`h-0.5 flex-1 ${bookingStep >= 3 ? 'bg-purple-600' : 'bg-white/10'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${bookingStep >= 3 ? 'bg-purple-600 text-white border-purple-600' : 'bg-transparent text-white/40 border-white/10'}`}>3</div>
                  </div>

                  {/* Flow Content Switcher */}
                  {bookingStep === 1 && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs uppercase font-extrabold text-white/40 mb-1">Step 1: Select Service Choice</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div 
                          onClick={() => { setSelectedService('haircut'); setBookingStep(2); }}
                          className={`p-4 border rounded-2xl cursor-pointer hover:border-purple-500/80 transition-all flex items-center justify-between ${selectedService === 'haircut' ? 'bg-purple-500/10 border-purple-500' : 'bg-white/5 border-white/10'}`}
                        >
                          <div>
                            <h4 className="text-sm font-bold text-white">Classic Men Haircut</h4>
                            <span className="text-xs text-white/40">Includes relaxing shampoo rinse</span>
                          </div>
                          <span className="text-sm font-black text-purple-400">₹200</span>
                        </div>
                        
                        <div 
                          onClick={() => { setSelectedService('facial'); setBookingStep(2); }}
                          className={`p-4 border rounded-2xl cursor-pointer hover:border-purple-500/80 transition-all flex items-center justify-between ${selectedService === 'facial' ? 'bg-purple-500/10 border-purple-500' : 'bg-white/5 border-white/10'}`}
                        >
                          <div>
                            <h4 className="text-sm font-bold text-white">Signature Hair Color</h4>
                            <span className="text-xs text-white/40">Aesthetic highlights, non-ammonia</span>
                          </div>
                          <span className="text-sm font-black text-purple-400">₹999</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {bookingStep === 2 && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs uppercase font-extrabold text-white/40">Step 2: Assign High-Rated Stylist</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div 
                          onClick={() => { setSelectedStylist('Karthik'); setBookingStep(3); }}
                          className={`p-4 border rounded-2xl cursor-pointer hover:border-purple-500/80 transition-all flex items-center gap-3 ${selectedStylist === 'Karthik' ? 'bg-purple-500/10 border-purple-500' : 'bg-white/5 border-white/10'}`}
                        >
                          <div className="w-10 h-10 bg-purple-500/30 rounded-xl flex items-center justify-center font-black">K</div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Karthik (Senior)</h4>
                            <span className="text-xs text-yellow-400">⭐⭐⭐⭐⭐ 5.0 Rating</span>
                          </div>
                        </div>

                        <div 
                          onClick={() => { setSelectedStylist('Pavan'); setBookingStep(3); }}
                          className={`p-4 border rounded-2xl cursor-pointer hover:border-purple-500/80 transition-all flex items-center gap-3 ${selectedStylist === 'Pavan' ? 'bg-purple-500/10 border-purple-500' : 'bg-white/5 border-white/10'}`}
                        >
                          <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center font-black">P</div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Pavan (Master Stylist)</h4>
                            <span className="text-xs text-yellow-400">⭐⭐⭐⭐⭐ 4.9 Rating</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {bookingStep === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <p className="text-xs uppercase font-extrabold text-white/40">Step 3: Select Available Time Block</p>
                      <div className="flex flex-wrap gap-2">
                        {['10:00 AM', '11:15 AM', '01:30 PM', '04:00 PM', '06:15 PM'].map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTimeSlot(slot)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${selectedTimeSlot === slot ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>

                      {/* Display success trigger */}
                      {selectedTimeSlot && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <div>
                            <p className="text-xs font-bold uppercase">Ready to Book!</p>
                            <p className="text-[11px] text-white/60">Booking is confirmed instantly. Stylist notified of slot on calendar!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <div className="mt-8 border-t border-white/5 pt-4 text-center">
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">
              Interactive Web App Demo • High Fidelity Sandbox rendering
            </p>
          </div>
        </div>
      </section>

      {/* 6. Call to Action / Footer closure */}
      <section className="bg-gradient-to-t from-purple-950/20 to-transparent py-20 border-t border-white/5 relative z-10 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl sm:text-5xl font-sans font-black tracking-tight mb-6">
            Get Started <span className="text-purple-400 italic">In Under 5 Minutes</span>
          </h2>
          <p className="text-white/60 text-base max-w-xl mx-auto mb-10 leading-relaxed">
            Configure your active chairs, upload custom styling prices, and let Hyderabad clients find and book you in high real-time quality.
          </p>

          <button
            onClick={() => handleSignIn('register')}
            disabled={isSigningIn}
            className="px-10 py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-2xl shadow-purple-600/30 w-full sm:w-auto inline-flex items-center justify-center gap-3 transform active:scale-95 duration-150"
          >
            {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5 text-purple-200" />}
            Register Your Salon Free Now
          </button>

          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-4">
            💸 First 50 slots get 3 months free — No card details required
          </p>
        </div>
      </section>

      {/* Custom Admin Overlays/Modals */}
      <AnimatePresence>
        {showAdminPassword && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent italic tracking-tight uppercase">
                  Admin Verification
                </h3>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                  Restricted Operator Panel Access
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3 mb-2 text-left">
                  <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <p className="text-[11px] text-purple-300 font-bold leading-normal">
                    This account is registered under the master administrator email. Password verification required to enter layout.
                  </p>
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

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    type="submit"
                    disabled={isVerifying || !adminPassword}
                    className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-purple-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20"
                  >
                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    Verify Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowAdminPassword(false);
                    }}
                    className="w-full py-2.5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Disconnect Admin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Landing Footer */}
      <footer className="py-12 border-t border-white/5 bg-black/40 text-center relative z-10">
        <p className="text-white/20 text-[11px] uppercase tracking-widest font-black mb-4">
          &copy; 2026 Salon Chair Technologies Pvt Ltd. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <span className="text-white/40 text-[10px] hover:text-purple-600 cursor-pointer uppercase font-black tracking-wider transition-colors" onClick={() => navigate('/privacy')}>
            Privacy Policy
          </span>
          <span className="text-white/10">|</span>
          <span className="text-white/40 text-[10px] hover:text-purple-600 cursor-pointer uppercase font-black tracking-wider transition-colors" onClick={() => navigate('/contact')}>
            Contact Support
          </span>
          <span className="text-white/10">|</span>
          <span className="text-white/40 text-[10px] hover:text-purple-600 cursor-pointer uppercase font-black tracking-wider transition-colors" onClick={() => navigate('/faqs')}>
            Product FAQs
          </span>
        </div>
      </footer>

    </div>
  );
};
