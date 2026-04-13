import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PilatesClass } from '../types';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Clock, MapPin, ChevronRight, User as UserIcon, Timer, Sparkles, ChevronLeft, CheckCircle2, Instagram, Mail } from 'lucide-react';
import { useAuth } from '../App';

export default function Home() {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<PilatesClass[]>([]);
  const [userBookings, setUserBookings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      alert("Please enter a valid email address.");
      return;
    }

    setIsSubscribing(true);
    try {
      await addDoc(collection(db, 'mailing_list'), {
        email: newsletterEmail,
        subscribedAt: serverTimestamp()
      });
      setSubscribed(true);
      setNewsletterEmail('');
    } catch (error) {
      console.error("Error subscribing:", error);
      alert("Failed to subscribe. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const q = query(collection(db, 'classes'), orderBy('startTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PilatesClass[];
      setClasses(classData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const bookingIds = snapshot.docs
          .filter(doc => doc.data().status !== 'cancelled')
          .map(doc => doc.data().classId);
        setUserBookings(bookingIds);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      });
      return () => unsubscribe();
    } else {
      setUserBookings([]);
    }
  }, [user]);

  const next10Days = Array.from({ length: 10 }, (_, i) => addDays(startOfDay(new Date()), i));
  
  const filteredClasses = classes.filter(c => 
    isSameDay(c.startTime.toDate(), selectedDate) && 
    c.startTime.toDate() > new Date()
  );

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <main className="pt-32 pb-24">
      {/* Hero Section */}
      <section className="relative px-6 py-12 md:py-24 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lavender/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-seafoam/20 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <span className="text-lavender-dark font-bold tracking-[0.2em] uppercase text-base mb-4 block">Pilates for everybody</span>
          <h2 className="font-serif text-5xl md:text-7xl italic text-midnight leading-tight mb-6">
            STUDIO <span className="text-lavender">RUI</span>
          </h2>
          <p className="text-midnight/60 text-lg md:text-xl max-w-xl mx-auto font-light leading-relaxed">
            A curated movement experience designed to align your body and elevate your spirit through the art of classical inspired contemporary Pilates.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <a href="#classes" className="px-8 py-4 bg-lavender-dark text-white rounded-full font-semibold shadow-lg hover:scale-105 transition-transform whitespace-nowrap">
              Book a Class
            </a>
          </div>
        </motion.div>
      </section>

      {/* Date Scroller */}
      <section className="mt-12 px-6">
        <div className="text-center mb-10 relative">
          <span className="text-lavender-dark font-bold tracking-[0.2em] uppercase text-base mb-2 block">Your Journey</span>
          <h3 className="font-serif text-4xl italic text-midnight">Weekly Schedule</h3>
        </div>
        
        <div className="relative max-w-4xl mx-auto flex items-center group">
          <button 
            onClick={() => scroll('left')}
            className="absolute left-0 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full border border-[#e1e1e7] shadow-sm text-lavender-dark opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto hide-scrollbar py-4 px-10 w-full snap-x snap-mandatory scroll-smooth"
          >
            {next10Days.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const hasClasses = classes.some(c => isSameDay(c.startTime.toDate(), date));
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 w-20 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 snap-center ${
                    isSelected 
                      ? 'bg-lavender-dark text-white shadow-lg scale-110' 
                      : !hasClasses
                        ? 'bg-stone-100 border-stone-200 text-stone-300 opacity-50 cursor-not-allowed'
                        : 'bg-white border border-[#e1e1e7] text-midnight/60 hover:border-lavender'
                  }`}
                >
                  <span className={`text-base uppercase tracking-tighter font-bold ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-2xl font-bold my-1">{format(date, 'd')}</span>
                  <span className={`text-base uppercase font-bold ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                    {format(date, 'MMM')}
                  </span>
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => scroll('right')}
            className="absolute right-0 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full border border-[#e1e1e7] shadow-sm text-lavender-dark opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* Class Cards Section */}
      <section id="classes" className="mt-8 px-6 space-y-6 max-w-3xl mx-auto scroll-mt-24">
        <h4 className="font-serif text-xl italic mb-4 text-midnight">Available Classes</h4>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-lavender-soft/30 rounded-[1.5rem] animate-pulse" />
            ))}
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-lavender-soft rounded-[2rem]">
            <p className="text-midnight/40 font-serif italic text-base">No classes scheduled for this day.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredClasses.map((cls) => (
              <ClassCard 
                key={cls.id} 
                cls={cls} 
                isBooked={userBookings.includes(cls.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Private Booking Section */}
      <section className="mt-16 px-6 max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 md:p-10 bg-white rounded-[3rem] border border-[#e1e1e7] shadow-sm text-center space-y-8"
        >
          <div className="space-y-3">
            <h3 className="font-serif text-3xl italic text-midnight">Private & Small Group Sessions</h3>
            <p className="text-midnight/60 text-lg max-w-xl mx-auto">
              Looking for a more personalised experience? Book in a private 1:1 or small group sessions tailored to your goals.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:rui.yi2902@gmail.com" 
              className="flex items-center justify-center gap-3 px-8 py-4 bg-lavender-dark text-white rounded-full font-bold tracking-widest uppercase hover:bg-midnight transition-all shadow-md whitespace-nowrap"
            >
              <Mail size={20} />
              Email Me
            </a>
            <a 
              href="https://instagram.com/studiorui" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 px-8 py-4 bg-[#f5f2ed] text-midnight border border-[#e1e1e7] rounded-full font-bold tracking-widest uppercase hover:text-lavender-dark hover:border-lavender transition-all shadow-sm whitespace-nowrap"
            >
              <Instagram size={20} />
              Instagram
            </a>
          </div>
        </motion.div>
      </section>

      {/* Newsletter Section */}
      <section className="mt-16 px-6 pb-12 max-w-3xl mx-auto">
        <div className="bg-ivory p-8 rounded-[2.5rem] border border-[#e1e1e7] relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-lavender/5 rounded-full blur-2xl" />
          <h3 className="font-serif text-3xl italic mb-4 text-midnight">Join the Collective</h3>
          <p className="text-midnight/60 mb-6 text-base leading-relaxed max-w-md">Stay up to date with studio news, receive weekly insights and early access to events.</p>
          
          {subscribed ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 text-seafoam-dark font-serif italic text-xl"
            >
              <CheckCircle2 className="text-seafoam" />
              Thank you for joining our collective.
            </motion.div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <input 
                className="bg-white border-none rounded-full px-6 py-3 text-base focus:ring-1 focus:ring-lavender" 
                placeholder="Your Email Address" 
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={isSubscribing}
              />
              <button 
                type="submit"
                disabled={isSubscribing}
                className="w-full py-3 bg-midnight text-white rounded-full text-base font-bold tracking-widest uppercase hover:bg-lavender-dark transition-colors disabled:opacity-50"
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </section>
      {/* Need Help Section */}
      <section className="mt-8 px-6 pb-24 max-w-3xl mx-auto text-center">
        <div className="py-12 border-t border-[#e1e1e7]">
          <h3 className="font-serif text-3xl italic mb-4 text-midnight">Need Help?</h3>
          <p className="text-midnight/60 mb-8 text-base">
            Have questions about bookings or our classes? We're here to assist you.
          </p>
          <a 
            href="mailto:rui.yi2902@gmail.com"
            className="inline-block px-10 py-4 bg-lavender-dark text-white rounded-full font-bold tracking-widest uppercase hover:bg-midnight transition-colors shadow-lg"
          >
            Contact Team
          </a>
        </div>
      </section>
    </main>
  );
}

const ClassCard: React.FC<{ cls: PilatesClass; isBooked?: boolean }> = ({ cls, isBooked }) => {
  const spotsLeft = cls.maxSize - cls.currentParticipants;
  const isFull = spotsLeft <= 0;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-[2rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.02)] border border-[#e1e1e7]"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          <span className={`px-4 py-1.5 text-base font-bold uppercase tracking-widest rounded-full ${
            cls.type === 'group' ? 'bg-[#D1EDF2] text-[#4A7C82]' : 'bg-coral/20 text-coral-dark'
          }`}>
            {cls.type === 'group' ? 'GROUP' : 'PRIVATE'}
          </span>
          {isBooked && (
            <span className="px-4 py-1.5 text-base font-bold uppercase tracking-widest rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
              <CheckCircle2 size={14} /> BOOKED
            </span>
          )}
        </div>
        <span className="text-2xl font-serif text-midnight">${cls.price}</span>
      </div>

      <div className="mb-6">
        <h5 className="text-3xl font-serif text-midnight mb-2">{cls.title}</h5>
        <p className="text-midnight/60 text-base leading-relaxed">
          {cls.description || "A curated movement experience designed to align your body and elevate your spirit."}
        </p>
      </div>

      <div className="border-t border-[#e1e1e7] pt-6 space-y-4">
        <div className="flex items-center gap-3 text-midnight/60">
          <Clock size={18} className="text-lavender" />
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">{format(cls.startTime.toDate(), 'h:mm a')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-midnight/60">
          <MapPin size={18} className="text-lavender" />
          <span className="text-base font-medium">{cls.location || 'Studio A'}</span>
        </div>

        <div className="flex items-center gap-3 text-midnight/60">
          <Users size={18} className="text-lavender" />
          <span className="text-base font-medium">
            {isFull ? 'Fully Booked' : `${spotsLeft} spots available`}
          </span>
        </div>
      </div>

      <div className="mt-8">
        <Link
          to={isFull ? '#' : `/checkout/${cls.id}`}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-base font-bold transition-all active:scale-95 ${
            isFull 
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
              : 'bg-lavender text-white hover:bg-lavender-dark shadow-lg shadow-lavender/20'
          }`}
        >
          {isFull ? 'Sold Out' : (
            <>
              Book Now <ChevronRight size={18} />
            </>
          )}
        </Link>
      </div>
    </motion.div>
  );
}
