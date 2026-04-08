import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Booking } from '../types';
import { format, isAfter, differenceInHours } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, Download, XCircle, History, User as UserIcon, MapPin, AlertCircle, RefreshCw, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateICS, downloadICS } from '../utils/ics';
import { handleFirestoreError, OperationType, getTimestampDate } from '../utils/firestore';

export default function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phone || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editName,
        phone: editPhone
      });
      setShowEditModal(false);
      // Reload to refresh the profile state in App.tsx
      window.location.reload();
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(bookingData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancel = (booking: Booking) => {
    setBookingToCancel(booking);
    setIsRescheduling(false);
    setShowCancelModal(true);
  };

  const handleReschedule = (booking: Booking) => {
    setBookingToCancel(booking);
    setIsRescheduling(true);
    setShowCancelModal(true);
  };

  const confirmCancellation = async () => {
    if (!bookingToCancel) return;
    
    const startTime = getTimestampDate(bookingToCancel.classStartTime);
    const hoursUntilClass = differenceInHours(startTime, new Date());
    const isRefundEligible = hoursUntilClass >= 24;

    try {
      // 1. Update Firestore
      try {
        await updateDoc(doc(db, 'bookings', bookingToCancel.id), {
          status: 'cancelled',
          cancelledAt: new Date(),
          refundEligible: isRefundEligible,
          rescheduled: isRescheduling
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingToCancel.id}`);
      }
      
      try {
        await updateDoc(doc(db, 'classes', bookingToCancel.classId), {
          currentParticipants: increment(-1)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `classes/${bookingToCancel.classId}`);
      }
      
      if (!isRefundEligible && hoursUntilClass >= 12) {
        try {
          await updateDoc(doc(db, 'users', user!.uid), {
            rescheduleCredit: increment(1)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user!.uid}`);
        }
      }

      // 2. Trigger Refund if eligible (Simulated API call)
      if (isRefundEligible) {
        await fetch('/api/bookings/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: bookingToCancel.id,
            amount: bookingToCancel.price,
            paymentMethod: bookingToCancel.paymentMethod
          })
        });
      }

      // 3. Send Confirmation Email (Simulated API call)
      await fetch('/api/bookings/cancel-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user?.email,
          bookingId: bookingToCancel.id,
          classTitle: bookingToCancel.classTitle,
          refundEligible: isRefundEligible,
          isReschedule: isRescheduling
        })
      });
      
      setShowCancelModal(false);
      setBookingToCancel(null);
      
      if (isRescheduling) {
        navigate('/');
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert('Failed to process request.');
    }
  };

  const handleDownload = async (booking: Booking) => {
    try {
      const ics = await generateICS(
        booking.classTitle,
        getTimestampDate(booking.classStartTime),
        `Pilates Session: ${booking.classTitle}`,
        booking.classDuration || 60
      );
      downloadICS(ics, `pilates-${booking.classTitle.toLowerCase().replace(/\s+/g, '-')}.ics`);
    } catch (err) {
      console.error("Error generating ICS:", err);
      alert('Failed to generate calendar invite.');
    }
  };

  const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && isAfter(getTimestampDate(b.classStartTime), new Date()));
  const pastBookings = bookings.filter(b => b.status === 'cancelled' || !isAfter(getTimestampDate(b.classStartTime), new Date()));
  const completedBookings = bookings.filter(b => b.status === 'paid' && !isAfter(getTimestampDate(b.classStartTime), new Date()));

  return (
    <div className="max-w-5xl mx-auto space-y-16 pt-40 pb-24 px-6">
      <section className="space-y-3">
        <h1 className="text-5xl font-serif text-midnight italic tracking-tight">My Profile</h1>
        <p className="text-lg text-stone-500 font-medium">Manage your bookings and account details.</p>
      </section>

      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-32">
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-[#e1e1e7] shadow-sm space-y-8">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 bg-lavender-soft rounded-2xl flex items-center justify-center text-lavender-dark shadow-inner shrink-0">
                <UserIcon size={28} />
              </div>
              <div className="space-y-1 min-w-0 flex-grow">
                <div className="flex items-center justify-between">
                  <p className="text-base text-lavender-dark uppercase font-bold tracking-[0.2em]">Account</p>
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="p-1.5 hover:bg-lavender-soft rounded-lg text-lavender transition-colors"
                    title="Edit Profile"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-2xl font-serif text-midnight italic break-words leading-tight">{profile?.name || 'Guest'}</p>
                {profile?.phone && (
                  <p className="text-base text-stone-400 font-medium">{profile.phone}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 divide-y sm:divide-y-0 sm:divide-x lg:divide-x-0 lg:divide-y divide-[#e1e1e7] pt-8 border-t-2 border-[#e1e1e7]">
              <div className="pb-6 sm:pb-0 sm:pr-8 lg:pr-0 lg:pb-8">
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <p className="text-base uppercase font-bold text-stone-400 tracking-widest group-hover:text-lavender transition-colors">Upcoming</p>
                    <p className="text-3xl font-serif text-midnight italic">{upcomingBookings.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-ivory flex items-center justify-center text-stone-300">
                    <Calendar size={18} />
                  </div>
                </div>
              </div>
              <div className="pt-6 sm:pt-0 sm:pl-8 lg:pl-0 lg:pt-8">
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <p className="text-base uppercase font-bold text-stone-400 tracking-widest group-hover:text-seafoam-dark transition-colors">Completed</p>
                    <p className="text-3xl font-serif text-midnight italic">{completedBookings.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-ivory flex items-center justify-center text-stone-300">
                    <History size={18} />
                  </div>
                </div>
              </div>
              {profile?.rescheduleCredit && profile.rescheduleCredit > 0 ? (
                <div className="pt-6 sm:pt-0 sm:pl-8 lg:pl-0 lg:pt-8">
                  <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                      <p className="text-base uppercase font-bold text-lavender tracking-widest group-hover:text-lavender-dark transition-colors">Credits</p>
                      <p className="text-3xl font-serif text-midnight italic">{profile.rescheduleCredit}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-lavender-soft flex items-center justify-center text-lavender">
                      <RefreshCw size={18} />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-lavender-dark p-8 rounded-[2rem] text-white space-y-4 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <h4 className="text-xl font-serif italic relative z-10">Need help?</h4>
            <div className="space-y-2 relative z-10">
              <p className="text-white/70 text-base leading-relaxed">Our team is here to assist with your practice. Contact us for any scheduling questions.</p>
              <p className="text-white font-bold text-base">To change your class, please send us an email</p>
            </div>
            <button 
              onClick={() => window.location.href = 'mailto:rui.yi2902@gmail.com'}
              className="w-full py-3 bg-white text-lavender-dark rounded-full font-bold text-base uppercase tracking-widest hover:bg-ivory transition-colors relative z-10"
            >
              Email Support
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-20">
          <div className="space-y-10">
            <div className="flex items-center justify-between border-b-2 border-[#e1e1e7] pb-6">
              <h2 className="text-3xl font-serif text-midnight flex items-center gap-3 italic">
                Upcoming Sessions
              </h2>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-lavender/5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-lavender animate-pulse" />
                <span className="text-base text-lavender-dark font-bold uppercase tracking-[0.15em]">
                  {upcomingBookings.length} Active
                </span>
              </div>
            </div>
            
            {loading ? (
              <div className="space-y-6">
                {[1, 2].map(i => (
                  <div key={i} className="h-48 bg-lavender-soft/5 animate-pulse rounded-[2.5rem] border border-[#e1e1e7]"></div>
                ))}
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="space-y-8">
                {upcomingBookings.map((booking) => {
                  const hoursUntilClass = differenceInHours(getTimestampDate(booking.classStartTime), new Date());
                  return (
                    <motion.div 
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#D9D9D9]/40 p-8 rounded-[3rem] border border-[#e1e1e7] shadow-sm group"
                    >
                      <div className="bg-white p-8 rounded-[2rem] flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="space-y-6 flex-grow">
                          <div className="space-y-2">
                            <h3 className="text-3xl font-serif text-midnight italic leading-tight">{booking.classTitle}</h3>
                            <div className="flex items-center gap-3 text-stone-400">
                              <MapPin size={20} className="text-lavender/60" />
                              <span className="text-base font-medium tracking-wide">Main Atelier — Studio B</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-4 px-6 py-4 bg-[#F5F2ED] rounded-2xl border border-[#e1e1e7]/40 shadow-sm">
                              <Clock size={20} className="text-lavender" />
                              <div className="flex flex-col">
                                <span className="text-base text-stone-400 uppercase font-bold tracking-[0.15em]">Date & Time</span>
                                <span className="text-lg font-bold text-midnight">{format(getTimestampDate(booking.classStartTime), 'MMM d, h:mm a')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 px-6 py-4 bg-[#D1EDF2]/30 rounded-2xl border border-[#4A7C82]/10 shadow-sm">
                              <CheckCircle size={20} className="text-[#4A7C82]" />
                              <div className="flex flex-col">
                                <span className="text-base text-stone-400 uppercase font-bold tracking-[0.15em]">Status</span>
                                <span className="text-lg font-bold text-[#4A7C82]">Confirmed</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 shrink-0 lg:items-end">
                          <button 
                            onClick={() => handleDownload(booking)}
                            className="px-8 py-3 text-stone-300 hover:text-lavender transition-all flex items-center gap-2 text-base font-bold uppercase tracking-widest"
                          >
                            <Download size={18} />
                            Add to Cal
                          </button>
                          {hoursUntilClass >= 12 ? (
                            <div className="flex flex-col gap-3">
                              <button 
                                onClick={() => handleReschedule(booking)}
                                className="px-10 py-4 bg-lavender text-white hover:bg-lavender-dark rounded-full text-base font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 min-w-[180px] shadow-sm"
                              >
                                <RefreshCw size={18} />
                                Reschedule
                              </button>
                              <button 
                                onClick={() => handleCancel(booking)}
                                className="px-10 py-4 bg-[#f5f2ed] text-midnight border border-[#e1e1e7] hover:text-coral hover:border-coral rounded-full text-base font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 min-w-[180px] shadow-sm"
                              >
                                <XCircle size={18} />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="px-10 py-4 bg-stone-50 text-stone-400 border border-stone-100 rounded-full text-base font-bold uppercase tracking-widest flex items-center justify-center gap-2 min-w-[180px] cursor-not-allowed opacity-60">
                              <AlertCircle size={16} />
                              Locked
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-[#e1e1e7] space-y-6">
                <div className="w-20 h-20 bg-ivory rounded-full flex items-center justify-center mx-auto text-stone-300">
                  <Calendar size={40} />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-serif italic text-stone-400">Your schedule is clear. Ready to move?</p>
                  <Link to="/" className="inline-block text-lavender-dark font-bold text-base uppercase tracking-[0.2em] hover:tracking-[0.3em] transition-all">Book a class</Link>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-10">
            <div className="flex items-center justify-between border-b-2 border-[#e1e1e7] pb-6">
              <h2 className="text-3xl font-serif text-midnight flex items-center gap-3 italic">
                History
              </h2>
            </div>
            
            {loading ? (
              <div className="space-y-4">
                {[1].map(i => (
                  <div key={i} className="h-24 bg-lavender-soft/5 animate-pulse rounded-3xl border border-[#e1e1e7]"></div>
                ))}
              </div>
            ) : pastBookings.length > 0 ? (
              <div className="space-y-5">
                {pastBookings.map((booking) => (
                  <motion.div 
                    key={booking.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white/40 p-8 rounded-[2rem] border border-[#e1e1e7] flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:bg-white hover:shadow-sm transition-all duration-300"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${booking.status === 'cancelled' ? 'bg-coral/5 text-coral border border-coral/10' : 'bg-seafoam/10 text-seafoam-dark border border-seafoam/20'}`}>
                        {booking.status === 'cancelled' ? <XCircle size={24} /> : <History size={24} />}
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-xl font-serif text-midnight italic leading-tight">{booking.classTitle}</h3>
                        <div className="flex items-center gap-3 text-base text-stone-400 font-bold uppercase tracking-widest">
                          <span>{format(getTimestampDate(booking.classStartTime), 'MMM d, yyyy')}</span>
                          <span className="w-1 h-1 bg-stone-200 rounded-full" />
                          <span className={booking.status === 'cancelled' ? 'text-coral' : 'text-seafoam-dark'}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {booking.status !== 'cancelled' && (
                      <Link 
                        to="/"
                        className="px-8 py-3 bg-midnight text-white rounded-full text-base font-bold uppercase tracking-widest hover:bg-lavender-dark transition-all shadow-sm text-center"
                      >
                        Book Again
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/30 rounded-[2rem] border border-dashed border-[#e1e1e7]">
                <p className="text-stone-400 italic font-serif text-lg">No past sessions found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-midnight/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-serif italic text-midnight">Edit Profile</h3>
                <p className="text-[#646464]">Update your personal details below.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-base font-bold uppercase tracking-widest text-[#646464] ml-4">Full Name</label>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-6 py-4 bg-ivory border-none rounded-2xl focus:ring-2 focus:ring-lavender transition-all"
                    placeholder="Your Name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-base font-bold uppercase tracking-widest text-[#646464] ml-4">Phone Number</label>
                  <input 
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-6 py-4 bg-ivory border-none rounded-2xl focus:ring-2 focus:ring-lavender transition-all"
                    placeholder="+61 000 000 000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-base font-bold uppercase tracking-widest text-[#646464] ml-4">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-6 py-4 bg-[#d3d3d3] border-none rounded-2xl text-[#646464] cursor-not-allowed"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-seafoam-dark bg-seafoam/10 px-2 py-1 rounded-md">Verified</span>
                  </div>
                  <p className="text-base text-[#646464] ml-4 italic">Email is managed via authentication.</p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full py-4 bg-lavender text-white rounded-full font-bold uppercase tracking-widest hover:bg-lavender-dark transition-colors shadow-lg shadow-lavender/20 disabled:opacity-50"
                  >
                    {isUpdatingProfile ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
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

      {/* Cancellation Modal */}
      <AnimatePresence>
        {showCancelModal && bookingToCancel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelModal(false)}
              className="absolute inset-0 bg-midnight/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="w-16 h-16 bg-coral/10 rounded-2xl flex items-center justify-center text-coral mx-auto">
                <AlertCircle size={32} />
              </div>
              
              <div className="text-center space-y-4">
                <h3 className="text-3xl font-serif italic text-midnight">
                  {isRescheduling ? 'Reschedule Booking?' : 'Cancel Booking?'}
                </h3>
                <p className="text-midnight/60 leading-relaxed">
                  {isRescheduling
                    ? "Rescheduling will cancel your current session. You will receive a studio credit to book a new class at your convenience."
                    : differenceInHours(getTimestampDate(bookingToCancel.classStartTime), new Date()) < 24
                    ? "Cancellations within 24 hours are not eligible for a refund. However, you will receive a studio credit to reschedule your session."
                    : "Are you sure you want to cancel? You are eligible for a full refund as this is more than 24 hours before the class."}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmCancellation}
                  className={`w-full py-4 text-white rounded-full font-bold uppercase tracking-widest transition-colors shadow-lg ${isRescheduling ? 'bg-lavender hover:bg-lavender-dark shadow-lavender/20' : 'bg-coral hover:bg-coral-dark shadow-coral/20'}`}
                >
                  {isRescheduling ? 'Confirm & Reschedule' : 'Confirm Cancellation'}
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-4 bg-ivory text-midnight rounded-full font-bold uppercase tracking-widest hover:bg-[#e1e1e7] transition-colors"
                >
                  {isRescheduling ? 'Go Back' : 'Keep Booking'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
