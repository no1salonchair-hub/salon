import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { Salon, Payment, UserProfile } from '../types';
import { ShieldCheck, CheckCircle, XCircle, Trash2, Eye, EyeOff, Scissors, MapPin, CreditCard, Loader2, AlertTriangle, Mail, User, Users, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const AdminPanel: React.FC = () => {
  const { profile } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'owners' | 'users' | 'payments'>('overview');
  const [salonToDelete, setSalonToDelete] = useState<string | null>(null);
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

    return () => {
      unsubscribeUsers();
      unsubscribeSalons();
      unsubscribePayments();
    };
  }, [profile]);

  const approveSalon = async (salonId: string) => {
    const path = `salons/${salonId}`;
    try {
      await updateDoc(doc(db, 'salons', salonId), {
        status: 'active',
        adminAuthorized: true,
        subscriptionExpiry: Timestamp.fromDate(addDays(new Date(), 30)),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const setAdminAuthorization = async (salonId: string, authorized: boolean) => {
    const path = `salons/${salonId}`;
    try {
      await updateDoc(doc(db, 'salons', salonId), {
        adminAuthorized: authorized,
        status: authorized ? 'active' : 'pending'
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
    const path = `salons/${salonId}`;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'salons', salonId));
      setSalonToDelete(null);
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
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

      {salonToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white text-center mb-2">Delete Salon?</h3>
            <p className="text-white/60 text-center mb-8">
              Are you sure you want to delete <span className="text-white font-bold">{salons.find(s => s.id === salonToDelete)?.name}</span>? This action cannot be undone.
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
                  <button
                    onClick={() => approvePayment(payment.id, payment.salonId)}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-all shadow-lg shadow-green-600/20"
                  >
                    Verify & Activate
                  </button>
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
                    <tr key={salon.id} className="hover:bg-white/5 transition-all">
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
                        <div className="flex items-center justify-end gap-2">
                          {salon.adminAuthorized ? (
                            <button
                              onClick={() => setAdminAuthorization(salon.id, false)}
                              className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all border border-red-500/20 shadow-sm"
                              title="Unauthorize"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setAdminAuthorization(salon.id, true)}
                              className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all border border-blue-500/20 shadow-sm"
                              title="Authorize"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {salon.status === 'pending' && (
                            <button
                              onClick={() => approveSalon(salon.id)}
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
    </div>
  );
};
