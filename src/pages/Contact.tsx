import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, MapPin, Send, MessageSquare, Clock, Globe } from 'lucide-react';
import { toast } from 'sonner';

export const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get('name');
    const email = formData.get('email');
    const subject = formData.get('subject');
    const message = formData.get('message');

    const mailtoUrl = `mailto:booksalonchair@gmail.com?subject=${encodeURIComponent(`[Contact Form] ${subject}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
    
    // Simulate API call delay for UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    window.location.href = mailtoUrl;
    
    toast.success('Opening your email client to send the message...');
    setIsSubmitting(false);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      value: "booksalonchair@gmail.com",
      description: "Our support team usually responds within 24 hours.",
      link: "mailto:booksalonchair@gmail.com"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      value: "Hyderabad, Telangana, India",
      description: "Our main office and support center.",
      link: "https://maps.google.com"
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-all mb-8 group font-bold"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left Side: Info */}
          <div
            className="space-y-12"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 bg-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-purple-600/20">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter uppercase italic text-white">Get in Touch</h1>
              <p className="text-white/60 text-lg max-w-md">
                Have questions about Salon Chair? We're here to help you find the perfect style or grow your salon business.
              </p>
            </div>

            <div className="space-y-8">
              {contactInfo.map((info, idx) => (
                <a
                  key={idx}
                  href={info.link}
                  className="flex items-start gap-6 p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all group shadow-sm hover:shadow-md backdrop-blur-xl"
                >
                  <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-purple-500/20">
                    <info.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1 text-white">{info.title}</h3>
                    <p className="text-white font-medium mb-1">{info.value}</p>
                    <p className="text-white/40 text-sm">{info.description}</p>
                  </div>
                </a>
              ))}
            </div>

            <div className="pt-8 flex items-center gap-6 text-white/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Global Reach</span>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div
            className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-xl backdrop-blur-2xl"
          >
            <h2 className="text-2xl font-black mb-8 text-white italic">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Full Name</label>
                  <input
                    required
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Email Address</label>
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Subject</label>
                <select 
                  name="subject"
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white appearance-none cursor-pointer"
                >
                  <option className="bg-[#1a1a1a]">General Inquiry</option>
                  <option className="bg-[#1a1a1a]">Salon Partnership</option>
                  <option className="bg-[#1a1a1a]">Technical Support</option>
                  <option className="bg-[#1a1a1a]">Booking Issue</option>
                  <option className="bg-[#1a1a1a]">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Message</label>
                <textarea
                  required
                  name="message"
                  rows={5}
                  placeholder="How can we help you?"
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder:text-white/20 resize-none"
                ></textarea>
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-purple-600/20"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
