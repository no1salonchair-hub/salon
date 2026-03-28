import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, Mail, MapPin, Scissors } from 'lucide-react';
import { motion } from 'motion/react';

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

export const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all mb-8 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">Privacy Policy</h1>
              <p className="text-gray-500 font-medium">Last Updated: March 5, 2026</p>
            </div>
          </div>

          <p className="text-gray-400 leading-relaxed mb-12">
            At Salon Chair, accessible from <a href="https://salonchair.site" className="text-blue-400 hover:underline">https://salonchair.site</a>, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Salon Chair.
          </p>

          {/* Sections */}
          <div className="space-y-12">
            {/* Section 1 */}
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-black">1</div>
                <h2 className="text-2xl font-black">Information We Collect</h2>
              </div>
              <p className="text-gray-400">We collect personal information that you voluntarily provide to us when you register on the App or book a service.</p>
              <ul className="space-y-3 text-gray-400 ml-4">
                <li className="flex gap-2"><span className="text-white font-bold">• Personal Data:</span> Name, email address (via Google Login), and city.</li>
                <li className="flex gap-2"><span className="text-white font-bold">• Salon Data:</span> Shop name, location, and verification details for owners.</li>
                <li className="flex gap-2"><span className="text-white font-bold">• Booking Data:</span> Service type, appointment time, and salon preference.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-black">2</div>
                <h2 className="text-2xl font-black">How We Use Your Information</h2>
              </div>
              <p className="text-gray-400">We use the information we collect in various ways, including to:</p>
              <ul className="space-y-3 text-gray-400 ml-4">
                <li className="flex gap-2"><span>•</span> Provide, operate, and maintain our booking platform.</li>
                <li className="flex gap-2"><span>•</span> Notify Salon Owners of new bookings via push notifications.</li>
                <li className="flex gap-2"><span>•</span> Verify the identity of Salon Owners for the subscription service.</li>
                <li className="flex gap-2"><span>•</span> Send you emails or SMS regarding your appointments.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-black">3</div>
                <h2 className="text-2xl font-black">Google User Data</h2>
              </div>
              <ul className="space-y-3 text-gray-400 ml-4">
                <li className="flex gap-2"><span>•</span> We only access your Google Email and Profile Name to create your account.</li>
                <li className="flex gap-2"><span>•</span> We do not share your Google data with third-party advertisers or data brokers.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-black">4</div>
                <h2 className="text-2xl font-black">Data Retention and Deletion</h2>
              </div>
              <p className="text-gray-400">In accordance with Indian IT Rules 2026, we retain your data only as long as necessary.</p>
              <ul className="space-y-3 text-gray-400 ml-4">
                <li className="flex gap-2"><span>•</span> Users can request data deletion by emailing <a href="mailto:booksalonchair@gmail.com" className="text-blue-400 hover:underline">booksalonchair@gmail.com</a>.</li>
                <li className="flex gap-2"><span>•</span> Accounts inactive for more than 2 years will be automatically purged.</li>
              </ul>
            </section>
          </div>

          {/* Grievance Officer */}
          <div className="mt-16 pt-12 border-t border-white/5">
            <h2 className="text-2xl font-black mb-8">Grievance Officer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-3xl p-6 space-y-4 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="font-bold">booksalonchair@gmail.com</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-gray-400">Hyderabad, Telangana, India.</span>
                </div>
              </div>

              <div className="bg-blue-500/5 rounded-3xl p-6 flex flex-col items-center justify-center border border-blue-500/10 text-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Scissors className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xl font-black tracking-tighter uppercase italic">Salon Chair</span>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <SalonChairIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-blue-400 font-bold text-sm">Salon Chair Team</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-6 text-sm font-bold uppercase tracking-widest">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white transition-all">Home</button>
            <span className="text-gray-800">|</span>
            <span className="text-blue-400">Privacy Policy</span>
          </div>
          <p className="text-gray-600 text-xs font-medium">
            © 2026 Salon Chair Marketplace. Built for style.
          </p>
        </div>
      </div>
    </div>
  );
};

