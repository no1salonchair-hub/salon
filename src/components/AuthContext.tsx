import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

// AuthContext.tsx
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
    
    // Safety timeout to prevent infinite loading (e.g. if 3rd party cookies are blocked)
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(prev => {
          if (prev) {
            console.warn('AuthContext: Auth initialization timed out after 20s. Forcing loading to false.');
            setError(new Error('Authentication failed to initialize. If the site is not reachable, please check your network connection and disable any strong ad-blockers.'));
            return false;
          }
          return prev;
        });
      }
    }, 20000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthContext: onAuthStateChanged fired. User:', firebaseUser?.uid || 'null');
      
      if (!isMounted) return;
      
      clearTimeout(safetyTimeout);
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        console.log('AuthContext: No user found, setting loading to false');
        setProfile(null);
        setLoading(false);
        return;
      }

      // Set loading to false early to prevent blocking the UI while fetching profile
      setLoading(false);

      try {
        console.log(`AuthContext: User ${firebaseUser.uid} logged in, fetching profile...`);
        
        // Use regular getDoc to benefit from offline persistence cache
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
      } catch (err: any) {
        console.error('AuthContext: Error in auth state change handler:', err);
        // Don't set hard error here for profile fetch, just log it
        // The app can survive without a profile for a bit (fallback to defaults)
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, (err) => {
      console.error('AuthContext: onAuthStateChanged error:', err);
      if (isMounted) {
        setError(err);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async () => {
    console.log('Sign in button clicked');
    try {
      console.log('Attempting signInWithPopup...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Sign in successful');
      // Explicitly set user if onAuthStateChanged is slow
      setUser(result.user);
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
      sessionStorage.removeItem('admin_verified');
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
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (e) {
        console.error('Firestore error reported:', e);
      }
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
