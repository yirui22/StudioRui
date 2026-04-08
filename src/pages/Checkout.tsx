import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc, increment, Timestamp, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { PilatesClass } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  CheckCircle2, 
  ArrowLeft, 
  Calendar, 
  User, 
  Phone, 
  AlertCircle, 
  Info, 
  Clock, 
  MapPin, 
  Lock, 
  CalendarPlus, 
  Wallet,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { generateICS, downloadICS } from '../utils/ics';
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Upload, FileText, X } from 'lucide-react';

export default function Checkout() {
  const { classId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [classItem, setClassItem] = useState<PilatesClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [icsString, setIcsString] = useState('');
  const [step, setStep] = useState(1);
  
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [injuries, setInjuries] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'bank' | 'credit'>('stripe');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alreadyBooked, setAlreadyBooked] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeReceipt = async (base64Data: string): Promise<{ flagged: boolean; analysis: string }> => {
    try {
      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data })
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      return await response.json();
    } catch (error) {
      console.error("AI Analysis error:", error);
      return { flagged: false, analysis: "Analysis failed" };
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      if (!classId) return;
      
      // Fetch class info
      try {
        const docSnap = await getDoc(doc(db, 'classes', classId));
        if (docSnap.exists()) {
          setClassItem({ id: docSnap.id, ...docSnap.data() } as PilatesClass);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `classes/${classId}`);
      }

      // Check if already booked
      if (user && classId) {
        try {
          const q = query(
            collection(db, 'bookings'),
            where('userId', '==', user.uid),
            where('classId', '==', classId)
          );
          const bookingSnap = await getDocs(q);
          const activeBooking = bookingSnap.docs.find(doc => doc.data().status !== 'cancelled');
          if (activeBooking) {
            setAlreadyBooked(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'bookings');
        }
      }
      
      setLoading(false);
    };
    fetchData();
  }, [classId, user]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      if (profile.rescheduleCredit && profile.rescheduleCredit > 0) {
        setPaymentMethod('credit');
      }
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const handlePayment = async () => {
    if (!classItem || !user) return;
    if (!name || !phone || !email) {
      alert('Please fill in your name, email, and phone number.');
      return;
    }
    
    if (paymentMethod === 'bank' && !receiptFile) {
      alert('Please upload a screenshot of your bank transfer or Beem receipt.');
      return;
    }
    
    setProcessing(true);
    
    let receiptFlagged = false;
    let receiptAnalysis = "";
    let base64Receipt = "";

    if (paymentMethod === 'bank' && receiptPreview) {
      setIsAnalyzing(true);
      const analysisResult = await analyzeReceipt(receiptPreview);
      receiptFlagged = analysisResult.flagged;
      receiptAnalysis = analysisResult.analysis;
      base64Receipt = receiptPreview;
      setIsAnalyzing(false);
    }

    try {
      if (!profile?.name || !profile?.phone) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            ...profile,
            name,
            phone,
          }, { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
        }
      }

      const bookingData: any = {
        userId: user.uid,
        userEmail: email,
        userName: name,
        userPhone: phone,
        classId: classItem.id,
        status: 'paid',
        paymentMethod,
        timestamp: Timestamp.now(),
        classTitle: classItem.title,
        classStartTime: classItem.startTime,
        classDuration: classItem.duration || 60,
        isFirstTime,
        injuries,
        price: paymentMethod === 'credit' ? 0 : classItem.price,
        receiptFlagged,
        receiptAnalysis,
        receiptBase64: base64Receipt
      };

      // If bank transfer, status is pending
      if (paymentMethod === 'bank') {
        bookingData.status = 'pending';
      }
      
      let bookingRef;
      try {
        bookingRef = await addDoc(collection(db, 'bookings'), bookingData);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'bookings');
      }

      // If using credit, decrement user's credit
      if (paymentMethod === 'credit') {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            rescheduleCredit: increment(-1)
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
        }
      }

      if (receiptFlagged) {
        // Notify admin via API
        try {
          await fetch('/api/admin/notify-flagged', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail: email,
              userName: name,
              analysis: receiptAnalysis,
              classTitle: classItem.title,
              bookingId: bookingRef?.id
            })
          });
        } catch (e) {
          console.error("Failed to notify admin:", e);
        }
      }

      try {
        await updateDoc(doc(db, 'classes', classItem.id), {
          currentParticipants: increment(1)
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `classes/${classItem.id}`);
      }

      const ics = await generateICS(
        classItem.title, 
        classItem.startTime.toDate(), 
        classItem.description,
        classItem.duration || 60
      );
      setIcsString(ics);
      setSuccess(true);
      setStep(2);
    } catch (err) {
      console.error("Payment error:", err);
      alert('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-ivory-light">
      <div className="w-12 h-12 border-4 border-lavender border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!classItem) return (
    <div className="min-h-screen flex items-center justify-center bg-ivory-light">
      <div className="text-center">
        <h2 className="text-2xl font-serif text-midnight mb-4">Class not found</h2>
        <Link to="/" className="text-lavender-dark hover:underline">Return home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory-light pt-48 pb-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <div className="flex items-center gap-2">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-colors ${step >= 1 ? 'bg-lavender-dark text-white' : 'border border-[#e1e1e7] text-midnight/40'}`}>1</span>
            <span className={`text-base font-medium uppercase tracking-widest font-serif italic ${step >= 1 ? 'text-lavender-dark' : 'text-midnight/40'}`}>Details</span>
          </div>
          <div className="h-[1px] w-8 bg-[#e1e1e7]" />
          <div className="flex items-center gap-2">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-colors ${step >= 2 ? 'bg-lavender-dark text-white' : 'border border-[#e1e1e7] text-midnight/40'}`}>2</span>
            <span className={`text-base font-medium uppercase tracking-widest font-serif italic ${step >= 2 ? 'text-lavender-dark' : 'text-midnight/40'}`}>Complete</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Forms */}
          <div className="lg:col-span-7 space-y-10">
            <div className="space-y-10">
              <div className="p-6 bg-lavender-soft/30 rounded-2xl border border-lavender/10">
                <p className="text-lavender-dark text-base leading-relaxed">
                  Cancellations made more than 24 hours before the scheduled class start time are eligible for a full refund. Cancellations within 24 hours (but more than 12 hours) can be rescheduled at no extra charge.
                </p>
              </div>

              {alreadyBooked && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-4"
                >
                  <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-amber-800 font-bold text-base mb-1">Already Booked</h4>
                    <p className="text-amber-700 text-base leading-relaxed">
                      You have already booked into this class. If you proceed, you will be making an additional booking.
                    </p>
                  </div>
                </motion.div>
              )}
              {/* Personal Information */}
              <section>
                <h2 className="text-3xl font-serif italic text-lavender-dark mb-6">Your Information</h2>
                <div className="space-y-6">
                  <div className="relative">
                    <label className="text-base font-bold text-midnight/40 uppercase tracking-widest mb-1 block">Full Name</label>
                    <input 
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-transparent border-b border-[#e1e1e7] focus:border-lavender focus:ring-0 transition-all py-2 placeholder:text-stone-300 text-base" 
                      placeholder="Jane Doe" 
                      type="text"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="text-base font-bold text-midnight/40 uppercase tracking-widest mb-1 block">Email Address</label>
                      <input 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-transparent border-b border-[#e1e1e7] focus:border-lavender focus:ring-0 transition-all py-2 placeholder:text-stone-300 text-base" 
                        placeholder="j.doe@studio.com" 
                        type="email"
                      />
                    </div>
                    <div className="relative">
                      <label className="text-base font-bold text-midnight/40 uppercase tracking-widest mb-1 block">Phone Number</label>
                      <input 
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-transparent border-b border-[#e1e1e7] focus:border-lavender focus:ring-0 transition-all py-2 placeholder:text-stone-300 text-base" 
                        placeholder="+61(0)405413510" 
                        type="tel"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="text-base font-bold text-midnight/40 uppercase tracking-widest mb-1 block">Health & Injury Notes</label>
                    <textarea 
                      value={injuries}
                      onChange={e => setInjuries(e.target.value)}
                      className="w-full bg-transparent border-b border-[#e1e1e7] focus:border-lavender focus:ring-0 transition-all py-2 placeholder:text-stone-300 resize-none text-base" 
                      placeholder="Tell us about any physical conditions or injuries..." 
                      rows={3}
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox"
                        checked={isFirstTime}
                        onChange={e => setIsFirstTime(e.target.checked)}
                        className="w-6 h-6 border-2 border-[#e1e1e7] rounded-lg checked:bg-lavender checked:border-lavender transition-all appearance-none cursor-pointer"
                      />
                      {isFirstTime && <CheckCircle2 size={14} className="absolute left-1.5 text-white pointer-events-none" />}
                    </div>
                    <span className="text-base text-midnight/60 group-hover:text-midnight transition-colors">This is my first time doing Reformer Pilates</span>
                  </label>
                </div>
              </section>

              {/* Payment Method */}
              <section>
                <h2 className="text-3xl font-serif italic text-lavender-dark mb-6">Payment Method</h2>
                <div className="space-y-4">
                  {profile?.rescheduleCredit && profile.rescheduleCredit > 0 && (
                    <label className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer group ${paymentMethod === 'credit' ? 'bg-white border-lavender shadow-sm' : 'bg-white/50 border-[#e1e1e7] hover:border-lavender/40'}`}>
                      <input 
                        type="radio" 
                        name="payment" 
                        checked={paymentMethod === 'credit'}
                        onChange={() => setPaymentMethod('credit')}
                        className="text-lavender focus:ring-lavender h-6 w-6" 
                      />
                      <div className="ml-4 flex-1 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-medium text-midnight text-base">Use Reschedule Credit</span>
                          <span className="text-base text-lavender-dark font-bold uppercase tracking-widest">
                            {profile.rescheduleCredit} Credit{profile.rescheduleCredit > 1 ? 's' : ''} Available
                          </span>
                        </div>
                        <RefreshCw size={20} className="text-lavender" />
                      </div>
                    </label>
                  )}

                  <label className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer group ${paymentMethod === 'stripe' ? 'bg-white border-lavender shadow-sm' : 'bg-white/50 border-[#e1e1e7] hover:border-lavender/40'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      checked={paymentMethod === 'stripe'}
                      onChange={() => setPaymentMethod('stripe')}
                      className="text-lavender focus:ring-lavender h-6 w-6" 
                    />
                    <div className="ml-4 flex-1 flex items-center justify-between">
                      <span className="font-medium text-midnight text-base">Credit or Debit Card</span>
                      <CreditCard size={20} className="text-stone-400" />
                    </div>
                  </label>
                  
                  {paymentMethod === 'stripe' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-lavender-soft/30 rounded-xl space-y-4 overflow-hidden"
                    >
                      <input className="w-full bg-transparent border-b border-[#e1e1e7] focus:border-lavender focus:ring-0 transition-all py-2 placeholder:text-stone-300 text-base" placeholder="Card Number" type="text" />
                      <div className="grid grid-cols-2 gap-4">
                        <input className="w-full bg-transparent border-b border-[#e1e1e7] focus:border-lavender focus:ring-0 transition-all py-2 placeholder:text-stone-300 text-base" placeholder="MM/YY" type="text" />
                        <input className="w-full bg-transparent border-b border-[#e1e1e7] focus:border-lavender focus:ring-0 transition-all py-2 placeholder:text-stone-300 text-base" placeholder="CVC" type="text" />
                      </div>
                    </motion.div>
                  )}

                  <label className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer group ${paymentMethod === 'paypal' ? 'bg-white border-lavender shadow-sm' : 'bg-white/50 border-[#e1e1e7] hover:border-lavender/40'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                      className="text-lavender focus:ring-lavender h-6 w-6" 
                    />
                    <div className="ml-4 flex-1 flex items-center justify-between">
                      <span className="font-medium text-midnight text-base">PayPal</span>
                      <Wallet size={20} className="text-stone-400" />
                    </div>
                  </label>

                  <label className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer group ${paymentMethod === 'bank' ? 'bg-white border-lavender shadow-sm' : 'bg-white/50 border-[#e1e1e7] hover:border-lavender/40'}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      checked={paymentMethod === 'bank'}
                      onChange={() => setPaymentMethod('bank')}
                      className="text-lavender focus:ring-lavender h-6 w-6" 
                    />
                    <div className="ml-4 flex-1 flex items-center justify-between">
                      <span className="font-medium text-midnight text-base">Bank Transfer / Beem</span>
                      <div className="w-6 h-6 rounded-full bg-lavender-soft flex items-center justify-center text-lavender font-bold text-base">B</div>
                    </div>
                  </label>

                  {paymentMethod === 'bank' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-coral/5 border border-[#e1e1e7] rounded-2xl space-y-4"
                    >
                      <div className="flex items-center gap-2 text-coral font-medium">
                        <AlertCircle size={18} />
                        Bank Transfer / Beem Details
                      </div>
                      <p className="text-base text-stone-600 leading-relaxed">
                        Please transfer the total amount to complete your booking. Your spot will be confirmed once payment is received.
                      </p>
                      <div className="pt-2 space-y-1">
                        <p className="text-base font-bold text-midnight">Beem Username: <span className="underline">@ruiyi2</span></p>
                        <p className="text-base text-stone-400 italic">Please include your name and class date in the reference.</p>
                      </div>

                      <div className="pt-4 border-t border-[#e1e1e7] space-y-3">
                        <label className="text-base font-bold text-midnight uppercase tracking-widest block">Upload Receipt Screenshot</label>
                        {!receiptPreview ? (
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="border-2 border-dashed border-[#e1e1e7] rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:border-lavender transition-colors">
                              <Upload size={24} className="text-stone-400" />
                              <span className="text-base text-stone-500">Click or drag to upload receipt</span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group">
                            <img 
                              src={receiptPreview} 
                              alt="Receipt Preview" 
                              className="w-full h-48 object-cover rounded-xl border border-[#e1e1e7]"
                              referrerPolicy="no-referrer"
                            />
                            <button 
                              onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                              className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-stone-400 hover:text-coral transition-colors"
                            >
                              <X size={16} />
                            </button>
                            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-base font-medium text-midnight flex items-center gap-2">
                              <FileText size={12} />
                              {receiptFile?.name}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </section>

              <div className="pt-6">
                {paymentMethod === 'paypal' ? (
                  <PayPalScriptProvider options={{ clientId: "test", currency: "AUD" }}>
                    <PayPalButtons 
                      style={{ layout: "vertical", shape: "pill" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [{
                            amount: {
                              currency_code: "AUD",
                              value: classItem.price.toString()
                            }
                          }]
                        });
                      }}
                      onApprove={async (data, actions) => {
                        await handlePayment();
                      }}
                    />
                  </PayPalScriptProvider>
                ) : (
                  <button 
                    onClick={handlePayment}
                    disabled={processing || isAnalyzing}
                    className="w-full bg-lavender-dark text-white py-5 rounded-full font-bold text-lg hover:scale-[1.02] transition-transform shadow-lg shadow-lavender/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? 'Analyzing Receipt...' : processing ? 'Processing...' : (paymentMethod === 'bank' ? 'Confirm Booking' : `Complete Booking — $${classItem.price.toFixed(2)}`)}
                    <Lock size={20} />
                  </button>
                )}
                <p className="text-center text-base text-midnight/40 mt-4 uppercase tracking-widest">Your payment is secured with industry-standard encryption.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Summary */}
          <aside className="lg:col-span-5">
            <div className="sticky top-24 bg-white border border-[#e1e1e7] rounded-[2rem] p-8 space-y-8 shadow-sm">
              <div className="space-y-2">
                <span className="text-base font-bold text-lavender-dark uppercase tracking-[0.2em] font-serif italic">RUI STUDIO — Reservation</span>
                <h3 className="text-2xl font-serif italic leading-tight text-midnight">{classItem.title}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-lavender-soft flex items-center justify-center text-lavender-dark">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-midnight">{format(classItem.startTime.toDate(), 'EEEE, MMM do')}</p>
                    <p className="text-base text-midnight/50">{format(classItem.startTime.toDate(), 'h:mm a')} — {classItem.duration} min</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-lavender-soft flex items-center justify-center text-lavender-dark">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-midnight">{classItem.location}</p>
                    <p className="text-base text-midnight/50">Main Atelier — Studio B</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-lavender-soft flex items-center justify-center text-lavender-dark">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-midnight">Instructor: {classItem.instructor}</p>
                    <p className="text-base text-midnight/50">Advanced Specialist</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-midnight/50">Session Rate</span>
                  <span className="text-midnight font-medium">${classItem.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-midnight/50">Service Fee</span>
                  <span className="text-midnight font-medium">$0.00</span>
                </div>
                <div className="flex justify-between text-xl font-serif italic pt-2">
                  <span className="text-lavender-dark">Total Amount</span>
                  <span className="text-lavender-dark">${classItem.price.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-ivory/50 p-4 rounded-2xl flex gap-3 items-start">
                <Info size={18} className="text-seafoam-dark shrink-0" />
                <p className="text-base leading-relaxed text-midnight/60">
                  Cancellation Policy: Full refund for cancellations made at least 24 hours prior to the session start time.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-ivory-light flex flex-col items-center justify-start pt-32 px-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full text-center space-y-8"
            >
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-lavender/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <CheckCircle2 size={48} className="text-lavender-dark" />
                </div>
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-coral/20 rounded-full" />
                <div className="absolute -bottom-2 -left-6 w-12 h-12 bg-seafoam/30 rounded-full" />
              </div>

              <div className="space-y-3">
                <h1 className="text-5xl font-serif italic text-midnight tracking-tight">Thank You</h1>
                <p className="text-midnight/60 font-medium">Your session has been successfully booked. We've sent a confirmation to your email.</p>
              </div>

              <div className="bg-white border border-ivory rounded-[2rem] p-8 text-left space-y-6 shadow-sm">
                <div className="grid grid-cols-2 gap-8 border-b border-ivory pb-6">
                  <div className="space-y-1">
                    <p className="text-base font-bold text-lavender-dark uppercase tracking-widest font-serif italic">Session</p>
                    <p className="font-medium text-midnight leading-tight text-base">{classItem.title}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-lavender-dark uppercase tracking-widest font-serif italic">Date & Time</p>
                    <p className="font-medium text-midnight leading-tight text-base">{format(classItem.startTime.toDate(), 'MMM do, h:mm a')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-lavender-soft flex items-center justify-center text-lavender-dark">
                    <User size={24} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-base font-bold text-lavender-dark uppercase tracking-widest font-serif italic">Instructor</p>
                    <p className="text-base font-bold text-midnight">{classItem.instructor}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => downloadICS(icsString, 'pilates-booking.ics')}
                  className="w-full bg-lavender-dark text-white py-4 rounded-full font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-lavender/20"
                >
                  <CalendarPlus size={20} />
                  Add to Calendar (.ics)
                </button>
                <Link 
                  to="/profile"
                  className="w-full bg-white text-lavender-dark border border-lavender/20 py-4 rounded-full font-bold hover:bg-lavender-soft transition-colors text-center"
                >
                  View My Bookings
                </Link>
              </div>
              <Link to="/" className="text-base text-midnight/40 underline decoration-lavender/30 underline-offset-4 hover:text-lavender-dark transition-colors">
                Return to Home
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
