import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, Phone } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Ensure profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: user.displayName || '',
          phone: '',
          isAdmin: user.email?.toLowerCase() === 'rui.yi2902@gmail.com',
          createdAt: new Date().toISOString(),
        });
      }
      
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          name: name,
          phone: phone,
          isAdmin: email.toLowerCase() === 'rui.yi2902@gmail.com',
          createdAt: new Date().toISOString(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-40 pb-24 px-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-serif text-midnight">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="text-stone-500">
          {isSignUp ? 'Join us for a mindful movement journey.' : 'Sign in to book your next session.'}
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl border border-lavender-soft shadow-sm space-y-6"
      >
        {error && (
          <div className="p-4 bg-coral/5 text-coral text-base rounded-xl border border-[#e1e1e7]">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <>
              <div className="space-y-2">
                <label className="text-base font-medium text-midnight opacity-60">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-lavender" size={18} />
                  <input 
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-base font-medium text-midnight opacity-60">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-lavender" size={18} />
                  <input 
                    required
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <label className="text-base font-medium text-midnight opacity-60">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-lavender" size={18} />
              <input 
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-midnight opacity-60">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-lavender" size={18} />
              <input 
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-lavender text-white rounded-2xl font-medium hover:bg-midnight transition-colors disabled:opacity-50 shadow-lg"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-lavender-soft"></div>
          </div>
          <div className="relative flex justify-center text-base uppercase">
            <span className="bg-white px-2 text-stone-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 border border-lavender-soft rounded-2xl font-medium text-midnight hover:bg-lavender-soft transition-colors disabled:opacity-50"
        >
          <img 
            src="https://www.google.com/favicon.ico" 
            alt="Google" 
            className="w-5 h-5"
          />
          Google
        </button>

        <div className="text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-base text-stone-500 hover:text-midnight transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>

        <p className="text-center text-base text-stone-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
