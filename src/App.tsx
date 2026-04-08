import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';
import Auth from './pages/Auth';
import Pricing from './pages/Pricing';

import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          const isAdminEmail = firebaseUser.email?.toLowerCase() === 'rui.yi2902@gmail.com';
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Only update if isAdmin status changed or if we need to merge new info
            if (isAdminEmail && !data.isAdmin) {
              await setDoc(userDocRef, { ...data, isAdmin: true }, { merge: true });
              setProfile({ ...data, isAdmin: true });
            } else {
              setProfile(data);
            }
          } else {
            // Check if the Auth page is already creating the profile
            // We'll wait a brief moment to see if the profile appears
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              isAdmin: isAdminEmail,
              createdAt: new Date().toISOString(),
            };
            // Use merge: true to avoid overwriting if Auth.tsx already started writing
            await setDoc(userDocRef, newProfile, { merge: true });
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lavender"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      <Router>
        <div className="min-h-screen bg-ivory font-serif text-midnight">
          <Navbar />
          <main className="container mx-auto px-4 pt-20 pb-8">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
                <Route path="/checkout/:classId" element={user ? <Checkout /> : <Navigate to="/auth" />} />
                <Route path="/admin" element={
                  profile?.isAdmin ? <Admin /> : (
                    user ? (
                      <div className="text-center py-20 space-y-4">
                        <h1 className="text-3xl font-serif text-midnight">Access Denied</h1>
                        <p className="text-stone-500">You do not have permission to view this page.</p>
                        <p className="text-base text-stone-400">Logged in as: {user.email}</p>
                      </div>
                    ) : <Navigate to="/auth" />
                  )
                } />
              </Routes>
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
