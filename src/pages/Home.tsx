import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PilatesClass } from '../types';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users, Clock, MapPin, ChevronRight,
  CheckCircle2, Mail, ArrowDown
} from 'lucide-react';
import { useAuth } from '../App';

export default function Home() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<PilatesClass[]>([]);
  const [userBookings, setUserBookings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      alert('Please enter a valid email address.');
      return;
    }
    setIsSubscribing(true);
    try {
      await addDoc(collection(db, 'mailing_list'), {
        email: newsletterEmail,
        subscribedAt: serverTimestamp(),
      });
      setSubscribed(true);
      setNewsletterEmail('');
    } catch (error) {
      console.error('Error subscribing:', error);
      alert('Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const q = query(collection(db, 'classes'), orderBy('startTime', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const classData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PilatesClass[];
        setClasses(classData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'classes');
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'bookings'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const bookingIds = snapshot.docs
            .filter((doc) => doc.data().status !== 'cancelled')
            .map((doc) => doc.data().classId);
          setUserBookings(bookingIds);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'bookings');
        }
      );
      return () => unsubscribe();
    } else {
      setUserBookings([]);
    }
  }, [user]);

  const next10Days = Array.from({ length: 10 }, (_, i) => addDays(startOfDay(new Date()), i));
  const filteredClasses = classes.filter(
    (c) => isSameDay(c.startTime.toDate(), selectedDate) && c.startTime.toDate() > new Date()
  );

  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (!loading && classes.length > 0 && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      const now = new Date();
      const firstDay = next10Days.find(date =>
        classes.some(c => isSameDay(c.startTime.toDate(), date) && c.startTime.toDate() > now)
      );
      if (firstDay) setSelectedDate(firstDay);
    }
  }, [loading, classes]);


  return (
    <main>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative h-[100svh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background image with subtle scale-in */}
        <motion.img
          src="/studio-hero.jpeg"
          alt="Studio Rui — Reformer Pilates"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.0, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0 w-full h-full object-cover object-center"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/ruiprofilephoto.jpg';
          }}
        />
        {/* Overlay fades in */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 bg-midnight/55"
        />

        {/* Centred content — each element staggers in */}
        <div className="relative z-10 w-full px-6 text-center flex flex-col items-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="block text-white/50 uppercase tracking-[0.35em] text-xs font-sans mb-7"
          >
            Pilates for Everybody
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-serif uppercase text-white leading-[0.92] mb-8 text-[clamp(3rem,12vw,9rem)]"
          >
            Studio Rui
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-white/65 text-base md:text-lg font-sans font-light leading-relaxed mb-10 max-w-[34ch] mx-auto"
          >
            A curated movement experience designed to align your body and elevate your spirit through classical inspired contemporary Pilates.
          </motion.p>

          <motion.a
            href="#classes"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 px-9 py-4 bg-white text-midnight rounded-full font-sans font-bold tracking-widest uppercase text-sm hover:bg-lavender hover:text-white transition-colors duration-300 shadow-lg"
          >
            Book a Class
            <ChevronRight size={15} />
          </motion.a>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 flex flex-col items-center gap-1.5"
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        >
          <ArrowDown size={18} />
        </motion.div>
      </section>


      {/* ─── BOOK CLASSES ─────────────────────────────────────────────────── */}
      <section id="classes" className="pt-24 pb-16 scroll-mt-0">

        {/* Section header */}
        <div className="px-6 md:px-16 lg:px-24 mb-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-lavender-dark font-sans font-bold tracking-[0.25em] uppercase text-xs mb-3 block"
          >
            Your Journey
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-midnight text-4xl md:text-5xl leading-tight"
          >
            Weekly Schedule
          </motion.h2>
        </div>

        {/* Date strip — fills full width, non-selectable dates are disabled */}
        <div className="px-6 md:px-16 lg:px-24 mb-8">
          <div className="flex gap-2">
            {next10Days.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const hasClasses = classes.some(
                (c) => isSameDay(c.startTime.toDate(), date) && c.startTime.toDate() > new Date()
              );
              return (
                <motion.button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  disabled={!hasClasses}
                  whileHover={hasClasses && !isSelected ? { y: -3, transition: { duration: 0.15 } } : {}}
                  whileTap={hasClasses ? { scale: 0.95 } : {}}
                  className={`flex-1 min-w-0 h-[72px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                    isSelected
                      ? 'bg-midnight text-white shadow-md'
                      : !hasClasses
                      ? 'bg-stone-50 text-stone-300 cursor-not-allowed pointer-events-none'
                      : 'bg-white border border-[#e8e8e8] text-midnight hover:border-lavender/50 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <span className={`text-[9px] uppercase tracking-widest font-sans font-bold ${
                    isSelected ? 'text-white/60' : !hasClasses ? 'text-stone-300' : 'text-midnight/40'
                  }`}>
                    {format(date, 'EEE')}
                  </span>
                  <span className={`text-lg font-serif font-bold leading-none ${
                    isSelected ? 'text-white' : !hasClasses ? 'text-stone-300' : 'text-midnight'
                  }`}>
                    {format(date, 'd')}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected date label */}
        <div className="px-6 md:px-16 lg:px-24 mb-5">
          <h3 className="font-serif text-midnight/40 text-base">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
        </div>

        {/* Class cards — 2-col grid */}
        <div className="px-6 md:px-16 lg:px-24">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-72 bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#e8e8e8] rounded-2xl">
              <p className="text-midnight/30 font-sans text-sm">No classes scheduled for this day.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cls) => (
                <ClassCard key={cls.id} cls={cls} isBooked={userBookings.includes(cls.id)} />
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ─── PRIVATE & SMALL GROUP ────────────────────────────────────────── */}
      <section className="py-16 px-6 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden min-h-[460px]"
        >
          {/* Left — text + CTAs (order-2 on mobile so image shows first) */}
          <div className="order-2 md:order-1 flex flex-col justify-center px-10 md:px-12 lg:px-16 py-16 bg-midnight">
            <span className="block text-lavender/60 uppercase tracking-[0.3em] text-xs font-sans font-bold mb-5">
              Tailored to You
            </span>
            <h2 className="font-serif text-white text-3xl md:text-4xl leading-tight mb-5">
              Private &amp; Small Group Sessions
            </h2>
            <p className="text-white/50 font-sans text-base leading-relaxed mb-10 max-w-sm">
              Looking for a more personalised experience? Book a private 1:1 or small group session tailored specifically to your goals and body.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:rui.yi2902@gmail.com"
                className="flex items-center justify-center gap-2.5 px-7 py-3.5 bg-white text-midnight rounded-full font-sans font-bold tracking-widest uppercase text-sm hover:bg-lavender hover:text-white transition-all duration-300"
              >
                <Mail size={15} />
                Email Me
              </a>
              <a
                href="https://instagram.com/studiorui"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-7 py-3.5 bg-transparent text-white border border-white/25 rounded-full font-sans font-bold tracking-widest uppercase text-sm hover:border-white/60 hover:bg-white/10 transition-all duration-300"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
                Instagram
              </a>
            </div>
          </div>

          {/* Right — image (order-1 on mobile so it appears above text) */}
          <div className="order-1 md:order-2 relative overflow-hidden min-h-[300px] md:min-h-0">
            <img
              src="/studio-hero.jpeg"
              alt="Private Pilates session"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-midnight/15" />
          </div>
        </motion.div>
      </section>


      {/* ─── NEWSLETTER ───────────────────────────────────────────────────── */}
      <section className="py-24 px-8 md:px-16 lg:px-24 bg-ivory">
        <div className="max-w-2xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="block text-lavender-dark uppercase tracking-[0.25em] text-xs font-sans font-bold mb-4"
          >
            Stay Connected
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-midnight text-4xl md:text-5xl leading-tight mb-5"
          >
            Join the Collective
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-midnight/50 font-sans text-base leading-relaxed mb-10 max-w-sm mx-auto"
          >
            Studio news, weekly movement insights, and early access to events — straight to your inbox.
          </motion.p>

          {subscribed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 text-seafoam-dark font-serif text-xl"
            >
              <CheckCircle2 className="text-seafoam-dark" size={22} />
              Thank you for joining our collective.
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubscribe}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={isSubscribing}
                className="flex-1 bg-white border border-[#e1e1e7] rounded-full px-6 py-4 text-sm font-sans text-midnight placeholder-midnight/30 focus:outline-none focus:ring-2 focus:ring-lavender/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="px-8 py-4 bg-midnight text-white rounded-full text-sm font-sans font-bold tracking-widest uppercase hover:bg-lavender-dark transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isSubscribing ? 'Subscribing…' : 'Subscribe'}
              </button>
            </motion.form>
          )}
        </div>
      </section>


      {/* ─── NEED HELP ────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-2xl"
        >
          {/* Background image */}
          <img
            src="/studio-hero.jpeg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-midnight/60" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-24 md:py-32">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-serif text-white text-4xl md:text-6xl leading-tight mb-5"
            >
              Need Help?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="text-white/60 font-sans text-base max-w-sm mx-auto mb-10 leading-relaxed"
            >
              Questions about bookings, classes, or anything else? We're happy to help.
            </motion.p>
            <motion.a
              href="mailto:rui.yi2902@gmail.com"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.24 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 px-9 py-3.5 bg-white text-midnight rounded-full font-sans font-bold tracking-widest uppercase text-sm hover:bg-lavender hover:text-white transition-colors duration-300 shadow-lg"
            >
              <Mail size={15} />
              Get in Touch
            </motion.a>
          </div>
        </motion.div>
      </section>

    </main>
  );
}


/* ─── CLASS CARD ────────────────────────────────────────────────────────── */
const ClassCard: React.FC<{ cls: PilatesClass; isBooked?: boolean }> = ({ cls, isBooked }) => {
  const spotsLeft = cls.maxSize - cls.currentParticipants;
  const isFull = spotsLeft <= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-white rounded-2xl overflow-hidden border border-[#e8e8e8] hover:border-lavender/30 hover:shadow-md transition-colors duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative w-full aspect-[2/1] overflow-hidden">
        <img
          src="/studio-hero.jpeg"
          alt={cls.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-widest rounded-full backdrop-blur-sm ${
            cls.type === 'group' ? 'bg-white/90 text-seafoam-dark' : 'bg-white/90 text-coral-dark'
          }`}>
            {cls.type === 'group' ? 'Group' : 'Private'}
          </span>
          {isBooked && (
            <span className="px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-widest rounded-full bg-white/90 text-amber-600 flex items-center gap-1">
              <CheckCircle2 size={10} />
              Booked
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title + price */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="font-serif text-xl text-midnight leading-snug">{cls.title}</h4>
          <span className="font-serif text-xl font-bold text-midnight shrink-0">${cls.price}</span>
        </div>

        {/* Description */}
        <p className="font-sans text-sm text-midnight/55 leading-relaxed mb-4">
          {cls.description || 'A curated movement experience designed to align your body and elevate your spirit.'}
        </p>

        {/* Meta */}
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex items-center gap-2 text-midnight/60">
            <Clock size={13} className="text-lavender shrink-0" />
            <span className="font-sans text-sm font-medium">{format(cls.startTime.toDate(), 'h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2 text-midnight/60">
            <MapPin size={13} className="text-lavender shrink-0" />
            <span className="font-sans text-sm font-medium">{cls.location || 'Studio A'}</span>
          </div>
          <div className="flex items-center gap-2 text-midnight/60">
            <Users size={13} className="text-lavender shrink-0" />
            <span className="font-sans text-sm font-medium">
              {isFull ? 'Fully booked' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
            </span>
          </div>
        </div>

        <Link
          to={isFull ? '#' : `/checkout/${cls.id}`}
          className={`mt-auto w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-sans font-bold tracking-widest uppercase transition-all duration-200 active:scale-95 ${
            isFull
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
              : isBooked
              ? 'border border-midnight/20 text-midnight hover:bg-midnight hover:text-white'
              : 'bg-midnight text-white hover:bg-lavender-dark'
          }`}
        >
          {isFull ? 'Sold Out' : isBooked ? 'View Booking' : <>Book Now <ChevronRight size={12} /></>}
        </Link>
      </div>
    </motion.div>
  );
};
