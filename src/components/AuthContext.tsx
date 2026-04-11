import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromServer, setDoc, Timestamp } from 'firebase/firestore';
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

    // Connection test as per critical directive - moved inside useEffect to avoid blocking
    const runConnectionTest = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
          toast.error("Firebase connection failed. Please check your configuration.");
        }
      }
    };
    runConnectionTest();
    
    // Safety timeout to prevent infinite loading (e.g. if 3rd party cookies are blocked)
    // We'll set a long timeout for the hard error, but let the UI handle the "taking long" state
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(prev => {
          if (prev) {
            console.warn('AuthContext: Auth initialization timed out after 20s. Forcing loading to false.');
            setError(new Error('Authentication failed to initialize. This usually happens in incognito mode or when third-party cookies are blocked. Try clicking "Reload Application" or use the "Go to Login" button if it appeared.'));
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

      // Set loading to false as soon as we have a user to speed up initial render
      // The profile will load in the background
      setLoading(false);

      try {
        console.log(`AuthContext: User ${firebaseUser.uid} logged in, fetching profile...`);
        
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const isAdmin = firebaseUser.email === 'no1salonchair@gmail.com';
        
        if (userDoc.exists()) {
          const existingProfile = userDoc.data() as UserProfile;
          console.log('AuthContext: Profile found in Firestore');
          
          if (isAdmin && existingProfile.role !== 'admin') {
            console.log('AuthContext: Upgrading user to admin role');
            const updatedProfile = { ...existingProfile, role: 'admin' as const };
            await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile);
            if (isMounted) setProfile(updatedProfile);
          } else {
            if (isMounted) setProfile(existingProfile);
          }
        } else {
          console.log('AuthContext: Profile not found, creating new profile...');
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
        console.log('AuthContext: Profile loading complete');
      } catch (err: any) {
        console.error('AuthContext: Error in auth state change handler:', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) {
          console.log('AuthContext: Setting loading to false in finally block');
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
