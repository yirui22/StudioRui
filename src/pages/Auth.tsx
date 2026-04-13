import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import CountryCodeSelect from '../components/CountryCodeSelect';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetMode, setResetMode] = useState<'email' | 'phone'>('email');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCountryCode, setResetCountryCode] = useState('+61');
  
  // Email/Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+61');

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError('');
    setSuccess('');

    try {
      let targetEmail = resetIdentifier;

      // If phone mode is selected
      if (resetMode === 'phone') {
        const cleanPhone = resetIdentifier.replace(/\D/g, '');
        const fullPhone = `${resetCountryCode}${cleanPhone}`;
        
        const q = query(collection(db, 'users'), where('phone', '==', fullPhone));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('No account found with this phone number.');
        }
        
        targetEmail = querySnapshot.docs[0].data().email;
      }

      await sendPasswordResetEmail(auth, targetEmail);
      setSuccess(`Password reset link sent to ${targetEmail}. Please check your inbox and spam folder.`);
      setShowForgotModal(false);
      setResetIdentifier('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

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
    setSuccess('');

    // Validation
    if (isSignUp) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      if (phone.replace(/\D/g, '').length < 8) {
        setError('Please enter a valid phone number.');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        
        const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
        
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          name: name,
          phone: fullPhone,
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
          <div className="p-4 bg-coral/5 text-coral text-base rounded-xl border border-coral/20 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-seafoam/10 text-seafoam-dark text-base rounded-xl border border-seafoam/20 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={18} />
              Success
            </div>
            <p className="ml-6 opacity-90">{success}</p>
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
                <div className="flex gap-2">
                  <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-3 text-lavender" size={18} />
                    <input 
                      required
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                      placeholder="400 000 000"
                    />
                  </div>
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

          {!isSignUp && (
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm font-medium text-lavender hover:text-midnight transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-2">
              <label className="text-base font-medium text-midnight opacity-60">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-lavender" size={18} />
                <input 
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

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

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-midnight/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-serif text-midnight">Reset Password</h3>
                <p className="text-stone-500">Choose how you want to receive your reset link.</p>
              </div>

              <div className="flex p-1 bg-ivory rounded-2xl border border-lavender-soft">
                <button
                  type="button"
                  onClick={() => { setResetMode('email'); setResetIdentifier(''); }}
                  className={`flex-1 py-3 rounded-xl text-base font-bold transition-all ${resetMode === 'email' ? 'bg-white text-lavender shadow-sm' : 'text-stone-400 hover:text-midnight'}`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMode('phone'); setResetIdentifier(''); }}
                  className={`flex-1 py-3 rounded-xl text-base font-bold transition-all ${resetMode === 'phone' ? 'bg-white text-lavender shadow-sm' : 'text-stone-400 hover:text-midnight'}`}
                >
                  Phone
                </button>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-base font-bold uppercase tracking-widest text-stone-400 ml-4">
                    {resetMode === 'email' ? 'Email Address' : 'Phone Number'}
                  </label>
                  <div className="flex flex-col gap-3">
                    {resetMode === 'phone' ? (
                      <div className="flex gap-2">
                        <CountryCodeSelect value={resetCountryCode} onChange={setResetCountryCode} />
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-3 text-lavender" size={18} />
                          <input 
                            type="tel"
                            value={resetIdentifier}
                            onChange={(e) => setResetIdentifier(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                            placeholder="400 000 000"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 text-lavender" size={18} />
                        <input 
                          type="email"
                          value={resetIdentifier}
                          onChange={(e) => setResetIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-4 bg-lavender text-white rounded-full font-bold uppercase tracking-widest hover:bg-lavender-dark transition-colors shadow-lg shadow-lavender/20 disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-4 bg-ivory text-midnight rounded-full font-bold uppercase tracking-widest hover:bg-[#e1e1e7] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
