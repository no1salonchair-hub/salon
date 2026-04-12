import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, ChevronUp, Scissors, Calendar, CreditCard, Shield, Bell, User, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface FAQItemProps {
  question: string;
  answer: string;
  icon: React.ElementType;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:bg-white/5 transition-all px-4 rounded-2xl group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center text-purple-400 group-hover:bg-purple-600/20 transition-all">
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">{question}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-purple-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/20" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-18 pb-6 text-white/60 leading-relaxed text-sm">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FAQs: React.FC = () => {
  const navigate = useNavigate();
  const faqs = [
    {
      icon: Calendar,
      question: "How do I book a salon service?",
      answer: "Simply browse the marketplace on the home page, select a salon that suits your needs, choose the services you want, and pick a convenient date and time. Once you confirm, the salon owner will receive a notification of your booking."
    },
    {
      icon: Scissors,
      question: "How can I list my salon on Salon Chair?",
      answer: "Go to your Profile and click 'Switch to Salon Owner Role'. You'll then be guided through the salon setup process where you can add your salon name, location, services, and pricing. After setup, you'll need to choose a subscription plan to go live."
    },
    {
      icon: CreditCard,
      question: "What payment methods are accepted?",
      answer: "We use Razorpay for secure payments. You can pay using UPI, Credit/Debit cards, Net Banking, and popular digital wallets. Payments are processed instantly and securely."
    },
    {
      icon: Shield,
      question: "Is my data secure?",
      answer: "Yes, we take security seriously. We use Firebase for secure authentication and data storage. Your payment information is handled directly by Razorpay, ensuring industry-standard encryption and safety."
    },
    {
      icon: Bell,
      question: "How do I receive booking notifications?",
      answer: "Salon owners can enable push notifications in their Profile settings. Once enabled, you'll receive instant alerts on your device whenever a new booking is made. Make sure to allow notification permissions in your browser."
    },
    {
      icon: User,
      question: "Can a salon handle multiple bookings at the same time?",
      answer: "Yes! Salons can add multiple barbers or staff members in their 'Salon Setup'. This allows the salon to accept concurrent bookings up to the number of barbers available."
    },
    {
      icon: Scissors,
      question: "How do I select a specific barber for my appointment?",
      answer: "When booking a service, if the salon has multiple barbers listed, you will see a 'Select Barber' section after choosing your time slot. You can pick your preferred barber from the available list."
    },
    {
      icon: Clock,
      question: "What happens if all barbers are busy at my preferred time?",
      answer: "If all barbers in a salon are already booked for a specific time slot, that slot will be automatically disabled to prevent overbooking. You can choose another time or check back later."
    },
    {
      icon: Shield,
      question: "Why is my salon status 'Pending'?",
      answer: "To maintain quality, all new salons and major updates are reviewed by our admin team. Once verified, your salon status will change to 'Active' and it will appear in the marketplace search results."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-purple-600/20">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter italic">Frequently Asked Questions</h1>
        <p className="text-white/40 font-bold uppercase tracking-widest text-sm">Everything you need to know about Salon Chair</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem key={index} {...faq} />
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-16 text-center p-10 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-white/10 rounded-3xl"
      >
        <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
        <p className="text-white/40 mb-6">We're here to help you with anything you need.</p>
        <button
          onClick={() => navigate('/contact')}
          className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl"
        >
          Contact Support
        </button>
      </motion.div>
    </div>
  );
};
