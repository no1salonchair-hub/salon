import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, User, LogOut, Scissors, PlusCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { cn } from '../lib/utils';

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

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Marketplace' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ to: '/admin', icon: ShieldCheck, label: 'Admin' });
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20 md:pb-0 md:pt-16">
      {/* Desktop Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-b border-white/10 hidden md:flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tighter uppercase italic text-white">
              Salon Chair
            </span>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
              <SalonChairIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm uppercase tracking-widest",
                  isActive ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white hover:bg-white/5"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <div className="h-6 w-px bg-white/10 mx-2" />
          <NavLink to="/profile" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all overflow-hidden">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-white/40" />
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            className="p-2 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-2xl border-t border-white/10 flex md:hidden items-center justify-around px-4 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all",
                isActive ? "text-purple-500" : "text-white/40"
              )
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-red-500/80"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-wider font-semibold">Logout</span>
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
        <footer className="mt-20 py-10 border-t border-white/10 text-center">
          <p className="text-white/20 text-xs uppercase tracking-widest font-bold mb-4">
            &copy; 2026 Salon Chair
          </p>
          <div className="flex items-center justify-center gap-6">
            <NavLink to="/privacy" className="text-white/40 hover:text-purple-600 text-[10px] uppercase tracking-widest transition-all">
              Privacy Policy
            </NavLink>
            <span className="text-white/10">|</span>
            <NavLink to="/contact" className="text-white/40 hover:text-purple-600 text-[10px] uppercase tracking-widest transition-all">
              Contact Us
            </NavLink>
            <span className="text-white/10">|</span>
            <span className="text-white/40 text-[10px] uppercase tracking-widest">
              Terms of Service
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
};
