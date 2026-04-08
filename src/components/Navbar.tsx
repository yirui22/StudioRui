import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { auth } from '../firebase';
import { LogOut, User, ShieldCheck, Calendar, Menu, Bell, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 h-16 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="hover:opacity-80 transition-opacity text-lavender-dark"
        >
          <Menu size={24} />
        </button>

        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="STUDIO RUI Logo" className="h-10 w-auto" />
        </Link>

        <div className="w-6" /> {/* Spacer to balance the menu button */}
      </header>

      {/* Mobile Side Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-midnight/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-[280px] bg-ivory-light z-[70] shadow-2xl p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-start gap-2 text-lavender-dark">
                  <User size={20} className="mt-1" />
                  <span className={`font-serif leading-tight ${
                    (profile?.name || user?.email?.split('@')[0] || 'Guest').length > 15 
                    ? 'text-[18px]' 
                    : 'text-[22px]'
                  }`}>
                    Hi, {profile?.name || user?.email?.split('@')[0] || 'Guest'}
                  </span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="text-stone-400 hover:text-midnight">
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-grow space-y-8">
                <Link 
                  to="/" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-[22px] font-serif italic text-midnight hover:text-lavender transition-colors"
                >
                  Book a Class
                </Link>

                <Link 
                  to="/pricing" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-[22px] font-serif italic text-midnight hover:text-lavender transition-colors font-normal"
                >
                  Pricing
                </Link>
                
                {user ? (
                  <>
                    <Link 
                      to="/profile" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 text-[22px] font-serif text-midnight/70 hover:text-lavender transition"
                    >
                      <Calendar size={20} />
                      My Bookings
                    </Link>
                    
                    {profile?.isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 text-[22px] font-serif text-coral-dark hover:text-coral transition"
                      >
                        <ShieldCheck size={20} />
                        Admin Dashboard
                      </Link>
                    )}
                  </>
                ) : (
                  <Link 
                    to="/auth" 
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-block px-8 py-3 bg-lavender text-white rounded-full text-[22px] font-medium hover:bg-midnight transition shadow-lg"
                  >
                    Sign In
                  </Link>
                )}

                <Link 
                  to="/about" 
                  onClick={() => setIsMenuOpen(false)}
                  className="block text-[22px] font-serif italic text-midnight hover:text-lavender transition-colors font-normal"
                >
                  About
                </Link>
              </nav>

              {user && (
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 text-stone-400 hover:text-midnight transition mt-auto pt-8 border-t border-lavender-soft"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
