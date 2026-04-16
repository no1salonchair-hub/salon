import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Salon, Payment, UserProfile, ContactMessage } from '../types';
import { ShieldCheck, CheckCircle, XCircle, Trash2, Eye, EyeOff, Scissors, MapPin, CreditCard, Loader2, AlertTriangle, Mail, User, Users, Calendar, TrendingUp, DollarSign, MessageSquare } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'owners' | 'users' | 'payments' | 'messages'>('overview');
  const [salonToDelete, setSalonToDelete] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{paymentId: string, salonId: string, salonName: string} | null>(null);
  const [selectedSalonForDetails, setSelectedSalonForDetails] = useState<Salon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalIncome = payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);

  const dayWiseIncome = React.useMemo(() => {
    const daily: Record<string, number> = {};
    payments
      .filter(p => p.status === 'success')
      .forEach(p => {
        const date = format(p.createdAt.toDate(), 'MMM dd');
        daily[date] = (daily[date] || 0) + p.amount;
      });
    
    return Object.entries(daily)
      .map(([date, amount]) => ({ date, amount }))
      .reverse() // Most recent first in data, but chart usually wants chronological
      .slice(-7); // Last 7 days
  }, [payments]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
        setAllUsers(userList);
        
        const userMap: Record<string, UserProfile> = {};
        userList.forEach(u => {
          userMap[u.uid] = u;
        });
        setUsers(userMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    const unsubscribeSalons = onSnapshot(
      query(collection(db, 'salons'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const processSalons = async () => {
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
        };
        processSalons().catch(err => {
          console.error('AdminPanel: salons snapshot processing error', err);
        });
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

    const unsubscribeMessages = onSnapshot(
      query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setContactMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ContactMessage[]);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'contact_messages');
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeSalons();
      unsubscribePayments();
      unsubscribeMessages();
    };
  }, [profile]);

  const approveSalon = async (salonId: string) => {
    const path = `salons/${salonId}`;
    try {
      await updateDoc(doc(db, 'salons', salonId), {
        status: 'active',
        adminAuthorized: true,
        subscriptionExpiry: Timestamp.fromDate(addDays(new Date(), 30)),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, path);
      } catch (e) {
        console.error('Firestore error reported:', e);
      }
    }
  };

  const setAdminAuthorization = async (salonId: string, authorized: boolean) => {
    const path = `salons/${salonId}`;
    try {
      await updateDoc(doc(db, 'salons', salonId), {
        adminAuthorized: authorized,
        status: authorized ? 'active' : 'pending',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.UPDATE, path);
      } catch (e) {
        console.error('Firestore error reported:', e);
      }
    }
  };

  const toggleSalonVisibility = async (salonId: string, currentStatus: Salon['status']) => {
    const path = `salons/${salonId}`;
    try {
      const newStatus = currentStatus === 'active' ? 'hidden' : 'active';
      await updateDoc(doc(db, 'salons', salonId), { 
        status: newStatus,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteSalon = async (salonId: string) => {
    const path = `salons/${salonId}`;
    setIsDeleting(true);
    try {
      // Also delete associated payments
      const associatedPayments = payments.filter(p => p.salonId === salonId);
      for (const p of associatedPayments) {
        await deleteDoc(doc(db, 'payments', p.id));
      }
      
      await deleteDoc(doc(db, 'salons', salonId));
      setSalonToDelete(null);
      toast.success('Salon and associated data deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setIsDeleting(false);
    }
  };

  const approvePayment = async (paymentId: string, salonId: string) => {
    const path = `payments/${paymentId}`;
    try {
      await updateDoc(doc(db, 'payments', paymentId), { status: 'success' });
      await approveSalon(salonId);
      toast.success('Payment approved and salon activated!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deletePaymentAndSalon = async (paymentId: string, salonId: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
      await deleteDoc(doc(db, 'salons', salonId));
      setPaymentToDelete(null);
      toast.success('Payment and salon deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `payments/${paymentId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldCheck className="w-20 h-20 text-red-500 mb-4" />
        <h1 className="text-3xl font-black text-white">Access Denied</h1>
        <p className="text-white/60 mt-2">Only administrators can access this panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Admin Control Panel</h1>
          <p className="text-white/60">Manage salons, verify payments, and oversee the marketplace.</p>
        </div>
      </div>

      {/* Salon Deletion Modal */}
      {salonToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-2">Delete Salon?</h3>
            <p className="text-white/60 text-center mb-8">
              Are you sure you want to delete <span className="text-white font-bold">{salons.find(s => s.id === salonToDelete)?.name}</span>? This will also delete all associated payments and cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setSalonToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-bold hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSalon(salonToDelete)}
                disabled={isDeleting}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Deletion Modal */}
      {paymentToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-2">Delete Payment & Salon?</h3>
            <p className="text-white/60 text-center mb-8">
              Are you sure you want to delete the pending payment and salon <span className="text-white font-bold">{paymentToDelete.salonName}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setPaymentToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-bold hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePaymentAndSalon(paymentToDelete.paymentId, paymentToDelete.salonId)}
                disabled={isDeleting}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                Delete Both
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
          <p className="text-xs uppercase tracking-widest font-bold text-white/40 mb-1">Total Salons</p>
          <h3 className="text-4xl font-black text-white">{salons.length}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
          <p className="text-xs uppercase tracking-widest font-bold text-white/40 mb-1">Pending Approvals</p>
          <h3 className="text-4xl font-black text-yellow-500">
            {salons.filter(s => s.status === 'pending').length}
          </h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
          <p className="text-xs uppercase tracking-widest font-bold text-white/40 mb-1">Total Payments</p>
          <h3 className="text-4xl font-black text-green-500">{payments.length}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
          <p className="text-xs uppercase tracking-widest font-bold text-white/40 mb-1">Total Users</p>
          <h3 className="text-4xl font-black text-blue-500">{allUsers.length}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'overview' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Scissors className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('owners')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'owners' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Salon Owners
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'users' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'payments' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <DollarSign className="w-4 h-4" />
          Payments
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'messages' ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Messages
        </button>
      </div>

      {activeTab === 'overview' && (
        <div
          className="space-y-10"
        >
          {/* Pending Payments */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
              <CreditCard className="text-green-500" />
              Pending Payments
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {payments.filter(p => p.status === 'pending').map(payment => (
                <div key={payment.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 border border-green-500/20">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{payment.salonName || 'Unknown Salon'}</h3>
                      <p className="text-xs text-green-400 font-black tracking-widest uppercase">₹{payment.amount} Payment</p>
                      <p className="text-[10px] text-white/20 font-mono mt-1">ID: {payment.id}</p>
                      <p className="text-[10px] text-white/40 mt-1">{format(payment.createdAt.toDate(), 'MMM dd, hh:mm a')}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPaymentToDelete({ 
                        paymentId: payment.id, 
                        salonId: payment.salonId, 
                        salonName: payment.salonName || 'Unknown Salon' 
                      })}
                      className="px-4 py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500/20 transition-all border border-red-500/20"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => approvePayment(payment.id, payment.salonId)}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-all shadow-lg shadow-green-600/20"
                    >
                      Verify & Activate
                    </button>
                  </div>
                </div>
              ))}
              {payments.filter(p => p.status === 'pending').length === 0 && (
                <p className="text-white/40 text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  No pending payments to verify.
                </p>
              )}
            </div>
          </section>

          {/* Salon Management */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
              <Scissors className="text-purple-500" />
              Salon Management
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Salon</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">AI Moderation</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Owner</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {salons.map(salon => (
                    <tr 
                      key={salon.id} 
                      className="hover:bg-white/5 transition-all cursor-pointer"
                      onClick={() => setSelectedSalonForDetails(salon)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={salon.imageUrl} alt={salon.name} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{salon.name}</span>
                            {salon.adminAuthorized && (
                              <span className="text-[8px] text-blue-400 font-black uppercase tracking-widest flex items-center gap-1">
                                <ShieldCheck className="w-2 h-2" /> Admin Authorized
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          salon.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date() ? "bg-red-500/20 text-red-400" :
                          salon.status === 'active' ? "bg-green-500/20 text-green-400" : 
                          salon.status === 'pending' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {salon.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date() ? 'expired' : salon.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          salon.imageStatus === 'authorized_by_ai' ? "bg-green-500/20 text-green-400" : 
                          salon.imageStatus === 'rejected_by_ai' ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/40"
                        )}>
                          {salon.imageStatus || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs text-white/60">
                            <Mail className="w-3 h-3 text-purple-500" />
                            {users[salon.ownerId]?.email || 'Loading...'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-white/20 font-black uppercase tracking-widest">
                            <User className="w-3 h-3 text-purple-500" />
                            {users[salon.ownerId]?.role || 'Loading...'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {salon.adminAuthorized ? (
                            <button
                              onClick={async () => {
                                try {
                                  await setAdminAuthorization(salon.id, false);
                                } catch (e) {
                                  console.error('Failed to unauthorize:', e);
                                }
                              }}
                              className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all border border-red-500/20 shadow-sm"
                              title="Unauthorize"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  await setAdminAuthorization(salon.id, true);
                                } catch (e) {
                                  console.error('Failed to authorize:', e);
                                }
                              }}
                              className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all border border-blue-500/20 shadow-sm"
                              title="Authorize"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {salon.status === 'pending' && (
                            <button
                              onClick={async () => {
                                try {
                                  await approveSalon(salon.id);
                                } catch (e) {
                                  console.error('Failed to approve:', e);
                                }
                              }}
                              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all shadow-sm"
                              title="Approve & Activate"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleSalonVisibility(salon.id, salon.status)}
                            disabled={salon.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date()}
                            className={cn(
                              "p-2 rounded-lg transition-all border shadow-sm",
                              salon.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date() 
                                ? "bg-red-500/10 text-red-400 border-red-500/20 cursor-not-allowed" 
                                : "bg-white/5 text-white/60 hover:bg-white/10 border-white/10"
                            )}
                            title={salon.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date() ? 'Expired' : (salon.status === 'active' ? 'Hide' : 'Show')}
                          >
                            {salon.subscriptionExpiry && salon.subscriptionExpiry.toDate() <= new Date() ? <AlertTriangle className="w-4 h-4" /> : (salon.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />)}
                          </button>
                          <button
                            onClick={() => setSalonToDelete(salon.id)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all border border-red-500/20 shadow-sm"
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
                <div className="p-10 text-center text-gray-400 italic">No salons found.</div>
              )}
            </div>
          </section>
        </div>
      )}

      {(activeTab === 'owners' || activeTab === 'users') && (
        <div
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            {activeTab === 'owners' ? <ShieldCheck className="text-purple-500" /> : <Users className="text-blue-500" />}
            {activeTab === 'owners' ? 'Salon Owners' : 'Registered Users'}
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">User</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Email</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Joined</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 text-right">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allUsers
                  .filter(u => activeTab === 'owners' ? u.role === 'salon_owner' : u.role === 'user')
                  .map(user => {
                    const userSalons = salons.filter(s => s.ownerId === user.uid);
                    return (
                      <tr key={user.uid} className="hover:bg-white/5 transition-all">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-black border border-purple-500/20">
                                {user.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{user.name}</span>
                              <span className="text-[10px] text-white/40 font-mono uppercase tracking-tighter">{user.uid}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-white/40" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-white/40">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {format(user.createdAt.toDate(), 'MMM dd, yyyy')}
                            </div>
                            {activeTab === 'owners' && (
                              <div className="flex items-center gap-2 text-purple-400 font-bold">
                                <Scissors className="w-3 h-3" />
                                {userSalons.length} Salon(s)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            user.role === 'salon_owner' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                          )}>
                            {user.role}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {allUsers.filter(u => activeTab === 'owners' ? u.role === 'salon_owner' : u.role === 'user').length === 0 && (
              <div className="p-10 text-center text-white/40 italic">No users found in this category.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div
          className="space-y-10"
        >
          {/* Payment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-white/40 mb-2">Total Income</p>
                <h3 className="text-5xl font-black text-green-400">₹{totalIncome}</h3>
              </div>
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400 border border-green-500/20">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex items-center justify-between shadow-xl">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-white/40 mb-2">Success Rate</p>
                <h3 className="text-5xl font-black text-blue-400">
                  {payments.length > 0 ? Math.round((payments.filter(p => p.status === 'success').length / payments.length) * 100) : 0}%
                </h3>
              </div>
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Income Chart */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
              <TrendingUp className="text-purple-500" />
              Income Trend (Last 7 Days)
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-[300px] shadow-xl">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dayWiseIncome}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#ffffff40" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                    itemStyle={{ color: '#9333ea', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#9333ea" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Detailed Payment History */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
              <CreditCard className="text-green-500" />
              Payment History
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Salon</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map(payment => (
                    <tr key={payment.id} className="hover:bg-white/5 transition-all">
                      <td className="px-6 py-4 text-sm font-bold text-white">
                        {payment.salonName || salons.find(s => s.id === payment.salonId)?.name || 'Unknown Salon'}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-400 font-black">
                        ₹{payment.amount}
                      </td>
                      <td className="px-6 py-4 text-xs text-white/40">
                        {format(payment.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                          payment.status === 'success' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                        )}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Contact Messages</h2>
              <p className="text-white/40 font-medium">Inquiries from the "Get in Touch" form</p>
            </div>
            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
              <span className="text-2xl font-black text-purple-500">{contactMessages.length}</span>
              <span className="ml-2 text-xs font-black uppercase tracking-widest text-white/40">Total</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {contactMessages.map((msg) => (
              <div key={msg.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/[0.07] transition-all group">
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center border border-purple-500/20">
                      <User className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{msg.name}</h3>
                      <div className="flex items-center gap-2 text-white/40 text-sm">
                        <Mail className="w-3 h-3" />
                        {msg.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black uppercase tracking-widest text-white/20 mb-1">Received On</div>
                    <div className="text-sm font-bold text-white/60">{format(msg.createdAt.toDate(), 'MMM dd, yyyy • hh:mm a')}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 mb-1 block">Subject</span>
                    <div className="text-lg font-bold text-white italic">"{msg.subject}"</div>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 block">Message Content</span>
                    <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/5 flex justify-end">
                  <button 
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this message?')) {
                        try {
                          await deleteDoc(doc(db, 'contact_messages', msg.id));
                          toast.success('Message deleted');
                        } catch (err) {
                          toast.error('Failed to delete message');
                        }
                      }
                    }}
                    className="flex items-center gap-2 text-red-500/40 hover:text-red-500 transition-all text-sm font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Message
                  </button>
                </div>
              </div>
            ))}

            {contactMessages.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-20 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-white/10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No messages yet</h3>
                <p className="text-white/40">When users contact you, their messages will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salon Details Modal */}
      {selectedSalonForDetails && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121212] border border-white/10 rounded-[2.5rem] w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in duration-300 my-8">
            <div className="relative h-64 sm:h-80 rounded-t-[2.5rem] overflow-hidden">
              <img 
                src={selectedSalonForDetails.imageUrl} 
                alt={selectedSalonForDetails.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
              <button 
                onClick={() => setSelectedSalonForDetails(null)}
                className="absolute top-6 right-6 w-12 h-12 bg-black/50 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-all border border-white/10"
              >
                <XCircle className="w-6 h-6" />
              </button>
              <div className="absolute bottom-6 left-8">
                <h2 className="text-4xl font-black text-white italic">{selectedSalonForDetails.name}</h2>
                <p className="text-white/60 flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  {selectedSalonForDetails.location.address}, {selectedSalonForDetails.location.city}, {selectedSalonForDetails.location.state}
                </p>
              </div>
            </div>

            <div className="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500">Owner Information</h3>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-400">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{users[selectedSalonForDetails.ownerId]?.name || 'Loading...'}</p>
                        <p className="text-xs text-white/40">{users[selectedSalonForDetails.ownerId]?.email || 'Loading...'}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="text-xs text-white/40">Owner UID</span>
                      <span className="text-[10px] font-mono text-white/60">{selectedSalonForDetails.ownerId}</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500">Location Details</h3>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">City</span>
                      <span className="text-sm font-bold text-white">{selectedSalonForDetails.location.city}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">State</span>
                      <span className="text-sm font-bold text-white">{selectedSalonForDetails.location.state}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">Coordinates</span>
                      <span className="text-[10px] font-mono text-white/60">
                        {selectedSalonForDetails.location.lat.toFixed(4)}, {selectedSalonForDetails.location.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500">Timeline & Status</h3>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">Uploaded On</span>
                      <span className="text-xs font-bold text-white">
                        {format(selectedSalonForDetails.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">Last Updated</span>
                      <span className="text-xs font-bold text-white">
                        {selectedSalonForDetails.updatedAt ? format(selectedSalonForDetails.updatedAt.toDate(), 'MMM dd, yyyy HH:mm') : 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">Status</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        selectedSalonForDetails.status === 'active' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {selectedSalonForDetails.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/40">AI Moderation</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        selectedSalonForDetails.imageStatus === 'authorized_by_ai' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {selectedSalonForDetails.imageStatus || 'pending'}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-500">Services ({selectedSalonForDetails.services.length})</h3>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 max-h-48 overflow-y-auto space-y-2">
                    {selectedSalonForDetails.services.map((s, i) => (
                      <div key={i} className="flex justify-between items-center p-2 hover:bg-white/5 rounded-lg transition-all">
                        <span className="text-sm text-white/80">{s.name}</span>
                        <span className="text-sm font-black text-purple-400">₹{s.price}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="p-8 sm:p-10 border-t border-white/5 flex justify-end gap-4">
              <button 
                onClick={() => setSelectedSalonForDetails(null)}
                className="px-8 py-4 bg-white/5 text-white rounded-2xl font-bold hover:bg-white/10 transition-all"
              >
                Close Details
              </button>
              <button 
                onClick={() => {
                  setSalonToDelete(selectedSalonForDetails.id);
                  setSelectedSalonForDetails(null);
                }}
                className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-500 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete Salon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
