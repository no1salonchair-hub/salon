import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('AuthContext: Initializing auth listener...');
    let isMounted = true;
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(prev => {
          if (prev) {
            console.warn('AuthContext: Auth initialization timed out after 10s. Forcing loading to false.');
            return false;
          }
          return prev;
        });
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthContext: onAuthStateChanged fired. User:', firebaseUser?.uid || 'null');
      if (isMounted) {
        clearTimeout(safetyTimeout);
      }
      
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const path = `users/${firebaseUser.uid}`;
          
          const fetchProfile = async (retries = 3): Promise<void> => {
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`AuthContext: Fetching profile (Attempt ${i + 1}/${retries})...`);
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                const isAdmin = firebaseUser.email === 'no1salonchair@gmail.com';
                
                if (userDoc.exists()) {
                  const existingProfile = userDoc.data() as UserProfile;
                  if (isAdmin && existingProfile.role !== 'admin') {
                    const updatedProfile = { ...existingProfile, role: 'admin' as const };
                    await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile);
                    if (isMounted) setProfile(updatedProfile);
                  } else {
                    if (isMounted) setProfile(existingProfile);
                  }
                } else {
                  const newProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    name: firebaseUser.displayName || 'Anonymous',
                    email: firebaseUser.email || '',
                    role: isAdmin ? 'admin' : 'user',
                    photoURL: firebaseUser.photoURL || undefined,
                    createdAt: Timestamp.now(),
                  };
                  await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
                  if (isMounted) setProfile(newProfile);
                }
                console.log('AuthContext: Profile loaded successfully');
                return; // Success
              } catch (err: any) {
                console.error(`AuthContext: Profile fetch attempt ${i + 1} failed:`, err);
                if (err.message?.includes('offline') && i < retries - 1) {
                  console.log('AuthContext: Client is offline, retrying in 2 seconds...');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  continue;
                }
                if (i === retries - 1) {
                  handleFirestoreError(err, OperationType.GET, path);
                }
              }
            }
          };

          await fetchProfile();
        } else {
          if (isMounted) setProfile(null);
        }
      } catch (err: any) {
        console.error('AuthContext: Auth initialization error:', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signIn = async () => {
    console.log('Sign in button clicked');
    try {
      console.log('Attempting signInWithPopup...');
      await signInWithPopup(auth, googleProvider);
      console.log('Sign in successful');
      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(`Sign in failed: ${error.message || 'Unknown error'}`);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized for Firebase Auth. Please add it to your Firebase Console.');
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;
    try {
      const updatedProfile = { ...profile, ...updates };
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setProfile(updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
