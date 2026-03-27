import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Salon, Payment, UserProfile } from '../types';
import { ShieldCheck, CheckCircle, XCircle, Trash2, Eye, EyeOff, Scissors, MapPin, CreditCard, Loader2, AlertTriangle, Mail, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays } from 'date-fns';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const unsubscribeSalons = onSnapshot(
      query(collection(db, 'salons'), orderBy('createdAt', 'desc')),
      async (snapshot) => {
        const salonList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Salon[];
        setSalons(salonList);

        // Fetch user profiles for salon owners
        const ownerIds = [...new Set(salonList.map(s => s.ownerId))];
        const newUsers = { ...users };
        let updated = false;

        for (const ownerId of ownerIds) {
          if (!newUsers[ownerId]) {
            try {
              const userSnap = await getDoc(doc(db, 'users', ownerId));
              if (userSnap.exists()) {
                newUsers[ownerId] = userSnap.data() as UserProfile;
                updated = true;
              }
            } catch (error) {
              console.error('Error fetching owner profile:', error);
            }
          }
        }

        if (updated) {
          setUsers(newUsers);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'salons');
      }
    );

    const unsubscribePayments = onSnapshot(
      query(collection(db, 'payments'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[]);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payments');
      }
    );

    return () => {
      unsubscribeSalons();
      unsubscribePayments();
    };
  }, [profile]);

  const approveSalon = async (salonId: string) => {
    const path = `salons/${salonId}`;
    try {
      await updateDoc(doc(db, 'salons', salonId), {
        status: 'active',
        subscriptionExpiry: Timestamp.fromDate(addDays(new Date(), 30)),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const toggleSalonVisibility = async (salonId: string, currentStatus: Salon['status']) => {
    const path = `salons/${salonId}`;
    try {
      const newStatus = currentStatus === 'active' ? 'hidden' : 'active';
      await updateDoc(doc(db, 'salons', salonId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteSalon = async (salonId: string) => {
    if (!window.confirm('Are you sure you want to delete this salon?')) return;
    const path = `salons/${salonId}`;
    try {
      await deleteDoc(doc(db, 'salons', salonId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const approvePayment = async (paymentId: string, salonId: string) => {
    const path = `payments/${paymentId}`;
    try {
      await updateDoc(doc(db, 'payments', paymentId), { status: 'success' });
      await approveSalon(salonId);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldCheck className="w-20 h-20 text-red-500 mb-4" />
        <h1 className="text-3xl font-black text-white">Access Denied</h1>
        <p className="text-gray-400 mt-2">Only administrators can access this panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Admin Control Panel</h1>
          <p className="text-gray-400">Manage salons, verify payments, and oversee the marketplace.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-1">Total Salons</p>
          <h3 className="text-4xl font-black">{salons.length}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-1">Pending Approvals</p>
          <h3 className="text-4xl font-black text-yellow-500">
            {salons.filter(s => s.status === 'pending').length}
          </h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-1">Total Payments</p>
          <h3 className="text-4xl font-black text-green-500">{payments.length}</h3>
        </div>
      </div>

      {/* Pending Payments */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="text-green-500" />
          Pending Payments
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {payments.filter(p => p.status === 'pending').map(payment => (
            <div key={payment.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center text-green-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold">₹{payment.amount} Payment</h3>
                  <p className="text-xs text-gray-400">Salon ID: {payment.salonId}</p>
                  <p className="text-xs text-gray-500">{format(payment.createdAt.toDate(), 'MMM dd, hh:mm a')}</p>
                </div>
              </div>
              <button
                onClick={() => approvePayment(payment.id, payment.salonId)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-all"
              >
                Verify & Activate
              </button>
            </div>
          ))}
          {payments.filter(p => p.status === 'pending').length === 0 && (
            <p className="text-gray-500 text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
              No pending payments to verify.
            </p>
          )}
        </div>
      </section>

      {/* Salon Management */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Scissors className="text-purple-500" />
          Salon Management
        </h2>
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Salon</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Owner</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {salons.map(salon => (
                <tr key={salon.id} className="hover:bg-white/[0.02] transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={salon.imageUrl} alt={salon.name} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <span className="font-bold">{salon.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      salon.status === 'active' ? "bg-green-500/20 text-green-400" : 
                      salon.status === 'pending' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                    )}>
                      {salon.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Mail className="w-3 h-3 text-purple-500" />
                        {users[salon.ownerId]?.email || 'Loading...'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                        <User className="w-3 h-3 text-purple-500" />
                        {users[salon.ownerId]?.role || 'Loading...'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {salon.status === 'pending' && (
                        <button
                          onClick={() => approveSalon(salon.id)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleSalonVisibility(salon.id, salon.status)}
                        className="p-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all border border-white/10"
                        title={salon.status === 'active' ? 'Hide' : 'Show'}
                      >
                        {salon.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteSalon(salon.id)}
                        className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600/20 transition-all border border-red-500/20"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {salons.length === 0 && (
            <div className="p-10 text-center text-gray-500 italic">No salons found.</div>
          )}
        </div>
      </section>
    </div>
  );
};
