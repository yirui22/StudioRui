import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, deleteDoc, doc, getDocs, updateDoc, increment, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PilatesClass, ClassTemplate, UserProfile, Booking } from '../types';
import { format, addDays, addMonths, subMonths, setHours, setMinutes, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Trash2, Calendar, Users, DollarSign, MapPin, Save, Download, Database, History, XCircle, Clock, ChevronRight, Edit2, Check, Copy, AlertTriangle, Eye, FileText, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Admin() {
  const [classes, setClasses] = useState<PilatesClass[]>([]);
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [duration, setDuration] = useState(60);
  const [activeTab, setActiveTab] = useState<'calendar' | 'clients' | 'bookings'>('calendar');
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClassForClients, setSelectedClassForClients] = useState<PilatesClass | null>(null);
  const [bookingDateFilter, setBookingDateFilter] = useState('');
  const [bookingClassFilter, setBookingClassFilter] = useState('');
  const [bookingClientFilter, setBookingClientFilter] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string, analysis: string } | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [instructor, setInstructor] = useState('');
  const [type, setType] = useState<'group' | 'private'>('group');
  const [startTime, setStartTime] = useState('');
  const [maxSize, setMaxSize] = useState(10);
  const [price, setPrice] = useState(25);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Main Studio');

  useEffect(() => {
    const q = query(collection(db, 'classes'), orderBy('startTime', 'desc'));
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

    const tQ = query(collection(db, 'templates'), orderBy('title', 'asc'));
    const unsubscribeTemplates = onSnapshot(tQ, (snapshot) => {
      const templateData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClassTemplate[];
      setTemplates(templateData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'templates');
    });

    const bQ = query(collection(db, 'bookings'), orderBy('timestamp', 'desc'));
    const unsubscribeBookings = onSnapshot(bQ, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as Booking[];
      setAllBookings(bookingData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    const uQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(uQ, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as UserProfile[];
      setAllUsers(userData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const nQ = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'));
    const unsubscribeNotifications = onSnapshot(nQ, (snapshot) => {
      const notificationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => {
      unsubscribe();
      unsubscribeTemplates();
      unsubscribeBookings();
      unsubscribeUsers();
      unsubscribeNotifications();
    };
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'classes';
    try {
      await addDoc(collection(db, path), {
        title,
        instructor,
        type,
        startTime: Timestamp.fromDate(new Date(startTime)),
        duration: Number(duration),
        maxSize: Number(maxSize),
        currentParticipants: 0,
        price: Number(price),
        description,
        location
      });
      setShowForm(false);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const seedDatabase = async () => {
    if (!window.confirm('This will add sample classes to the database. Continue?')) return;
    
    const sampleClasses = [
      {
        title: 'Reformer: Foundation',
        instructor: 'Rui Yi',
        type: 'group',
        startTime: Timestamp.fromDate(addDays(setMinutes(setHours(new Date(), 9), 0), 1)),
        duration: 60,
        maxSize: 10,
        currentParticipants: 0,
        price: 20,
        description: 'Perfect for beginners or those looking to refine their technique. Focus on core alignment and controlled movement.',
        location: 'Main Studio'
      },
      {
        title: 'Reformer: Dynamic Flow',
        instructor: 'Rui Yi',
        type: 'group',
        startTime: Timestamp.fromDate(addDays(setMinutes(setHours(new Date(), 17), 30), 1)),
        duration: 60,
        maxSize: 10,
        currentParticipants: 0,
        price: 20,
        description: 'A faster-paced session designed to build strength and endurance through continuous movement patterns.',
        location: 'Main Studio'
      },
      {
        title: 'Private 1:1 Session',
        instructor: 'Rui Yi',
        type: 'private',
        startTime: Timestamp.fromDate(addDays(setMinutes(setHours(new Date(), 11), 0), 2)),
        duration: 60,
        maxSize: 1,
        currentParticipants: 0,
        price: 60,
        description: 'Tailored specifically to your goals and physical requirements.',
        location: 'Private Suite'
      }
    ];

    try {
      for (const cls of sampleClasses) {
        await addDoc(collection(db, 'classes'), cls);
      }
      alert('Database seeded successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'classes');
    }
  };

  const handleSaveTemplate = async () => {
    if (!title) return alert('Please enter a title first');
    try {
      await addDoc(collection(db, 'templates'), {
        title,
        instructor,
        type,
        duration: Number(duration),
        maxSize: Number(maxSize),
        price: Number(price),
        description,
        location
      });
      alert('Template saved!');
    } catch (err) {
      console.error("Error saving template:", err);
    }
  };

  const loadTemplate = (t: ClassTemplate) => {
    setTitle(t.title);
    setInstructor(t.instructor || '');
    setType(t.type);
    setDuration(t.duration || 60);
    setPrice(t.price);
    setDescription(t.description);
    setLocation(t.location);
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: 'pending' | 'paid' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status });
    } catch (err) {
      console.error("Error updating booking status:", err);
    }
  };

  const handleToggleCheckIn = async (bookingId: string, currentStatus?: boolean) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { isCheckedIn: !currentStatus });
    } catch (err) {
      console.error("Error toggling check-in:", err);
    }
  };

  const copySyncLink = () => {
    const syncUrl = `${window.location.origin}/api/calendar/sync`;
    navigator.clipboard.writeText(syncUrl);
    alert('Sync link copied to clipboard! You can now add this URL to your Google Calendar as a "From URL" calendar.');
  };

  const resetForm = () => {
    setTitle('');
    setInstructor('');
    setStartTime('');
    setDescription('');
    setLocation('Main Studio');
    setDuration(60);
    setPrice(25);
  };

  const handleDeleteClass = async (id: string) => {
    setClassToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      // 1. Delete associated bookings
      const bookingsQuery = query(collection(db, 'bookings'), where('classId', '==', classToDelete));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const deletePromises = bookingsSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'bookings', docSnap.id)));
      await Promise.all(deletePromises);

      // 2. Delete the class
      await deleteDoc(doc(db, 'classes', classToDelete));
      
      setShowDeleteConfirm(false);
      setClassToDelete(null);
      if (selectedClassForClients?.id === classToDelete) {
        setSelectedClassForClients(null);
      }
    } catch (err) {
      console.error("Error deleting class:", err);
      alert("Failed to delete class.");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Delete this template?')) {
      await deleteDoc(doc(db, 'templates', id));
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'cancelled'
      });
      // Decrement participants
      await updateDoc(doc(db, 'classes', booking.classId), {
        currentParticipants: increment(-1)
      });
      alert('Booking cancelled.');
    } catch (err) {
      console.error("Error cancelling booking:", err);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!window.confirm('Are you sure you want to delete this booking? This will remove the record entirely.')) return;
    try {
      await deleteDoc(doc(db, 'bookings', booking.id));
      // Decrement participants
      await updateDoc(doc(db, 'classes', booking.classId), {
        currentParticipants: increment(-1)
      });
      alert('Booking deleted.');
    } catch (err) {
      console.error("Error deleting booking:", err);
    }
  };

  const handleReschedule = async (newClass: PilatesClass) => {
    if (!reschedulingBooking) return;
    if (newClass.currentParticipants >= newClass.maxSize) {
      alert('This class is full.');
      return;
    }

    try {
      // 1. Update booking with new class info
      await updateDoc(doc(db, 'bookings', reschedulingBooking.id), {
        classId: newClass.id,
        classTitle: newClass.title,
        classStartTime: newClass.startTime,
        classDuration: newClass.duration || 60
      });

      // 2. Decrement old class participants
      await updateDoc(doc(db, 'classes', reschedulingBooking.classId), {
        currentParticipants: increment(-1)
      });

      // 3. Increment new class participants
      await updateDoc(doc(db, 'classes', newClass.id), {
        currentParticipants: increment(1)
      });

      setReschedulingBooking(null);
      setShowRescheduleModal(false);
      alert('Booking rescheduled successfully.');
    } catch (err) {
      console.error("Error rescheduling booking:", err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const upcomingClasses = classes.filter(c => c.startTime.toDate() >= new Date());
  const pastClasses = classes.filter(c => c.startTime.toDate() < new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl md:text-4xl font-serif text-midnight">Studio Management</h1>
          <div className="hidden sm:block w-px h-8 bg-lavender-soft" />
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2.5 rounded-xl transition-all relative ${unreadCount > 0 ? 'bg-coral/10 text-coral' : 'bg-lavender-soft text-lavender'}`}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-coral text-white text-base font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-lavender-soft z-[60] overflow-hidden"
                >
                  <div className="p-4 border-b border-lavender-soft flex justify-between items-center">
                    <h3 className="font-bold text-midnight">Notifications</h3>
                    <span className="text-base font-bold uppercase tracking-widest text-stone-400">{unreadCount} New</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            if (n.bookingId) {
                              setBookingClientFilter('');
                              setBookingClassFilter('');
                              setBookingDateFilter('');
                              setActiveTab('bookings');
                            }
                            markNotificationRead(n.id);
                          }}
                          className={`p-4 border-b border-lavender-soft last:border-0 cursor-pointer hover:bg-lavender-soft/30 transition-colors ${!n.read ? 'bg-lavender-soft/10' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.severity === 'high' ? 'bg-coral/10 text-coral' : 'bg-lavender-soft text-lavender'}`}>
                              <AlertTriangle size={14} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-base font-bold text-midnight leading-tight">{n.title}</p>
                              <p className="text-base text-stone-500 leading-relaxed">{n.message}</p>
                              <p className="text-base text-stone-400">{format(n.timestamp.toDate(), 'MMM d, h:mm a')}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-stone-400 italic text-base">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="flex bg-lavender-soft p-1 rounded-2xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-base font-medium transition ${activeTab === 'calendar' ? 'bg-white text-midnight shadow-sm' : 'text-stone-500 hover:text-midnight'}`}
            >
              Calendar
            </button>
            <button 
              onClick={() => setActiveTab('clients')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-base font-medium transition ${activeTab === 'clients' ? 'bg-white text-midnight shadow-sm' : 'text-stone-500 hover:text-midnight'}`}
            >
              Clients
            </button>
            <button 
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-base font-medium transition ${activeTab === 'bookings' ? 'bg-white text-midnight shadow-sm' : 'text-stone-500 hover:text-midnight'}`}
            >
              Bookings
            </button>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-lavender text-white rounded-2xl hover:bg-midnight transition shadow-sm w-full sm:w-auto"
          >
            <Plus size={20} />
            {showForm ? 'Cancel' : 'New Class'}
          </button>
          <button 
            onClick={seedDatabase}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-ivory border border-lavender-soft text-lavender rounded-2xl hover:bg-lavender-soft transition shadow-sm w-full sm:w-auto"
          >
            <Database size={20} />
            Seed Data
          </button>
        </div>
      </div>

      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-lavender-soft shadow-sm space-y-8"
        >
          <div className="flex justify-between items-center border-b border-lavender-soft pb-4">
            <h2 className="text-xl font-serif text-midnight">Create New Class</h2>
            {templates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-base text-stone-400 uppercase font-medium">Load Template:</span>
                <select 
                  onChange={(e) => {
                    const t = templates.find(t => t.id === e.target.value);
                    if (t) loadTemplate(t);
                  }}
                  className="text-base p-2 bg-lavender-soft border border-lavender-soft rounded-lg focus:outline-none text-midnight"
                >
                  <option value="">Select...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <form onSubmit={handleAddClass} className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-base font-medium text-midnight opacity-60">Class Title</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                placeholder="e.g., Reformer: Intro"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-midnight opacity-60">Instructor</label>
              <input 
                required
                value={instructor}
                onChange={e => setInstructor(e.target.value)}
                className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                placeholder="e.g., Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-midnight opacity-60">Class Type</label>
              <select 
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
              >
                <option value="group">Group Session</option>
                <option value="private">Private Training</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-midnight opacity-60">Start Time</label>
              <input 
                required
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-midnight opacity-60">Duration (Minutes)</label>
              <input 
                required
                type="number"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                placeholder="e.g., 60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-midnight opacity-60">Location</label>
              <input 
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                placeholder="e.g., Studio A"
              />
            </div>

            <div className="space-y-2 flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-base font-medium text-midnight opacity-60">Max Size</label>
                <input 
                  required
                  type="number"
                  value={maxSize}
                  onChange={e => setMaxSize(Number(e.target.value))}
                  className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-base font-medium text-midnight opacity-60">Price ($)</label>
                <input 
                  required
                  type="number"
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-base font-medium text-midnight opacity-60">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-3 bg-ivory border border-lavender-soft rounded-xl focus:outline-none focus:ring-2 focus:ring-lavender/20 text-midnight h-24"
                placeholder="Details about the class..."
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium text-lavender uppercase tracking-wider">Templates</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(t => (
                  <div key={t.id} className="bg-lavender-soft p-3 rounded-xl border border-lavender-soft flex items-center justify-between group">
                    <div>
                      <div className="text-base font-medium text-midnight">{t.title}</div>
                      <div className="text-base text-midnight opacity-50">{t.location} • ${t.price}</div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        type="button"
                        onClick={() => loadTemplate(t)}
                        className="p-1.5 text-midnight opacity-40 hover:opacity-100 transition-opacity"
                        title="Load Template"
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1.5 text-midnight opacity-40 hover:text-coral transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 flex gap-4">
              <button 
                type="submit"
                className="flex-1 py-4 bg-lavender text-white rounded-2xl font-medium hover:bg-midnight transition shadow-sm"
              >
                Create Class
              </button>
              <button 
                type="button"
                onClick={handleSaveTemplate}
                className="px-6 py-4 border border-lavender-soft text-midnight rounded-2xl font-medium hover:bg-lavender-soft transition flex items-center gap-2"
              >
                <Save size={20} />
                Save Template
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-serif text-midnight">Class Calendar</h2>
              <p className="text-base text-stone-500">{format(currentDate, calendarView === 'month' ? 'MMMM yyyy' : 'MMMM d, yyyy')}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-lavender-soft p-1 rounded-xl">
                <button 
                  onClick={() => setCalendarView('day')}
                  className={`px-3 py-1.5 rounded-lg text-base font-medium transition ${calendarView === 'day' ? 'bg-white text-midnight shadow-sm' : 'text-stone-500 hover:text-midnight'}`}
                >
                  Day
                </button>
                <button 
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-1.5 rounded-lg text-base font-medium transition ${calendarView === 'week' ? 'bg-white text-midnight shadow-sm' : 'text-stone-500 hover:text-midnight'}`}
                >
                  Week
                </button>
                <button 
                  onClick={() => setCalendarView('month')}
                  className={`px-3 py-1.5 rounded-lg text-base font-medium transition ${calendarView === 'month' ? 'bg-white text-midnight shadow-sm' : 'text-stone-500 hover:text-midnight'}`}
                >
                  Month
                </button>
              </div>

              <div className="flex items-center gap-1 bg-lavender-soft p-1 rounded-xl">
                <button 
                  onClick={() => {
                    if (calendarView === 'day') setCurrentDate(addDays(currentDate, -1));
                    else if (calendarView === 'week') setCurrentDate(addDays(currentDate, -7));
                    else setCurrentDate(subMonths(currentDate, 1));
                  }}
                  className="p-1.5 text-stone-500 hover:text-midnight transition"
                >
                  <ChevronRight className="rotate-180" size={16} />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 text-base font-medium text-stone-600 hover:text-midnight"
                >
                  Today
                </button>
                <button 
                  onClick={() => {
                    if (calendarView === 'day') setCurrentDate(addDays(currentDate, 1));
                    else if (calendarView === 'week') setCurrentDate(addDays(currentDate, 7));
                    else setCurrentDate(addMonths(currentDate, 1));
                  }}
                  className="p-1.5 text-stone-500 hover:text-midnight transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button 
                onClick={copySyncLink}
                className="flex items-center gap-2 px-4 py-2 bg-lavender-soft text-lavender rounded-xl hover:bg-lavender hover:text-white transition text-base font-medium"
              >
                <Copy size={16} />
                Sync
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-lavender-soft shadow-sm overflow-hidden">
            <div className={`grid ${calendarView === 'day' ? 'grid-cols-1' : 'grid-cols-7'} border-b border-lavender-soft`}>
              {calendarView === 'day' ? (
                <div className="px-4 py-3 text-center text-base font-bold text-stone-400 uppercase tracking-widest">
                  {format(currentDate, 'EEEE')}
                </div>
              ) : (
                ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="px-4 py-3 text-center text-base font-bold text-stone-400 uppercase tracking-widest border-r border-lavender-soft last:border-r-0">
                    {day}
                  </div>
                ))
              )}
            </div>
            <div className={`grid ${calendarView === 'day' ? 'grid-cols-1' : 'grid-cols-7'}`}>
              {eachDayOfInterval({
                start: calendarView === 'month' ? startOfMonth(currentDate) : (calendarView === 'day' ? currentDate : startOfWeek(currentDate)),
                end: calendarView === 'month' ? endOfMonth(currentDate) : (calendarView === 'day' ? currentDate : endOfWeek(currentDate))
              }).map((date, i) => {
                const dayClasses = classes.filter(c => isSameDay(c.startTime.toDate(), date));
                const isCurrentMonth = calendarView !== 'month' || date.getMonth() === currentDate.getMonth();
                
                return (
                  <div key={i} className={`min-h-[150px] p-2 border-r border-b border-lavender-soft last:border-r-0 ${!isCurrentMonth ? 'bg-ivory/30 opacity-50' : ''} ${!isSameDay(date, new Date()) && date < new Date() ? 'bg-ivory/50' : ''}`}>
                    <div className={`text-base font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full ${isToday(date) ? 'bg-lavender text-white' : 'text-stone-400'}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayClasses.map(c => (
                        <div 
                          key={c.id}
                          onClick={() => setSelectedClassForClients(c)}
                          className="p-1.5 bg-lavender-soft rounded-lg text-base cursor-pointer hover:bg-lavender hover:text-white transition-colors border-l-2 border-lavender"
                        >
                          <div className="font-bold truncate">{c.title}</div>
                          <div className="opacity-70">{format(c.startTime.toDate(), 'h:mm a')}</div>
                          <div className="opacity-60 font-medium">{c.currentParticipants}/{c.maxSize}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif text-midnight">Upcoming Classes</h2>
            <div className="bg-white rounded-3xl border border-lavender-soft shadow-sm overflow-hidden">
              <table className="w-full text-left text-base">
                <thead className="bg-lavender-soft text-midnight opacity-50 text-base font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 font-medium">Class</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Occupancy</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lavender-soft">
                  {upcomingClasses.length > 0 ? (
                    upcomingClasses.sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()).map(c => (
                      <tr key={c.id} className="hover:bg-lavender-soft/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-midnight">{c.title}</td>
                        <td className="px-6 py-4 text-stone-500">{format(c.startTime.toDate(), 'MMM d, h:mm a')}</td>
                        <td className="px-6 py-4 text-stone-500">{c.currentParticipants} / {c.maxSize}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteClass(c.id)} className="p-2 text-stone-400 hover:text-coral transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-stone-400 italic">No upcoming classes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif text-midnight">Past Classes</h2>
            <div className="bg-white rounded-3xl border border-lavender-soft shadow-sm overflow-hidden opacity-75">
              <table className="w-full text-left text-base">
                <thead className="bg-lavender-soft text-midnight opacity-50 text-base font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 font-medium">Class</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Occupancy</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lavender-soft">
                  {pastClasses.map(c => (
                    <tr key={c.id} className="hover:bg-lavender-soft/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-midnight">{c.title}</td>
                      <td className="px-6 py-4 text-stone-500">{format(c.startTime.toDate(), 'MMM d, h:mm a')}</td>
                      <td className="px-6 py-4 text-stone-500">{c.currentParticipants} / {c.maxSize}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteClass(c.id)} className="p-2 text-stone-400 hover:text-coral transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedClassForClients && (
        <div className="fixed inset-0 bg-midnight/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-6 border border-lavender-soft"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-serif text-midnight">{selectedClassForClients.title}</h2>
                <p className="text-stone-500">{format(selectedClassForClients.startTime.toDate(), 'EEEE, MMM d @ h:mm a')}</p>
              </div>
              <button onClick={() => setSelectedClassForClients(null)} className="text-stone-400 hover:text-midnight transition">
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-coral/5 rounded-2xl border border-coral/10">
              <div className="flex items-center gap-3 text-coral">
                <AlertTriangle size={20} />
                <p className="text-base font-medium">Danger Zone</p>
              </div>
              <button 
                onClick={() => handleDeleteClass(selectedClassForClients.id)}
                className="px-4 py-2 bg-coral text-white rounded-xl text-base font-medium hover:bg-red-600 transition shadow-sm flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Class
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-medium text-lavender uppercase tracking-wider">Booked Clients ({selectedClassForClients.currentParticipants} / {selectedClassForClients.maxSize})</h3>
              <div className="bg-ivory rounded-2xl border border-lavender-soft overflow-hidden">
                <table className="w-full text-left text-base">
                  <thead className="bg-stone-100 text-stone-500 text-base uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Check-in</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {allBookings.filter(b => b.classId === selectedClassForClients.id && b.status !== 'cancelled').map(b => (
                      <tr key={b.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-stone-800">{b.userName || 'Unnamed'}</div>
                          <div className="text-base text-stone-400">{b.userEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-base font-bold uppercase ${b.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            checked={b.isCheckedIn || false}
                            onChange={() => handleToggleCheckIn(b.id, b.isCheckedIn)}
                            className="w-4 h-4 rounded border-[#e1e1e7] text-stone-800 focus:ring-stone-800"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleDeleteBooking(b)}
                            className="p-1.5 text-stone-400 hover:text-coral transition-colors"
                            title="Delete Booking"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedClassForClients.currentParticipants === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-stone-400 italic">No clients booked yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="space-y-8">
          <h2 className="text-2xl font-serif text-midnight">Client Management</h2>
          <div className="bg-white rounded-3xl border border-lavender-soft shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-lavender-soft text-midnight opacity-50 text-base font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                  <th className="px-6 py-4 font-medium">Last Class</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lavender-soft">
                {allUsers.map(u => {
                  const userBookings = allBookings.filter(b => b.userId === u.uid && b.status !== 'cancelled');
                  const lastBooking = userBookings.length > 0 
                    ? [...userBookings].sort((a, b) => b.classStartTime.toDate().getTime() - a.classStartTime.toDate().getTime())[0]
                    : null;
                  
                  return (
                    <tr key={u.uid} className="hover:bg-lavender-soft/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-midnight">{u.name || 'Unnamed'}</div>
                        <div className="text-base text-stone-400">{u.uid.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-base text-stone-600">{u.email}</div>
                        <div className="text-base text-stone-400">{u.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 text-base text-stone-600">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        {lastBooking ? (
                          <>
                            <div className="text-base text-stone-600">{lastBooking.classTitle}</div>
                            <div className="text-base text-stone-400">{format(lastBooking.classStartTime.toDate(), 'MMM d, yyyy')}</div>
                          </>
                        ) : (
                          <span className="text-base text-stone-400 italic">No bookings</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setBookingClientFilter(u.email);
                              setActiveTab('bookings');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-lavender-soft text-lavender rounded-lg text-base font-medium hover:bg-lavender hover:text-white transition"
                          >
                            <History size={14} />
                            View Bookings
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-serif text-midnight">Booking Management</h2>
              <button 
                onClick={() => setIsBulkEditing(!isBulkEditing)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-base font-medium transition ${isBulkEditing ? 'bg-lavender text-white shadow-sm' : 'bg-lavender-soft text-lavender hover:bg-lavender hover:text-white'}`}
              >
                {isBulkEditing ? <Check size={16} /> : <Edit2 size={16} />}
                {isBulkEditing ? 'Done Editing' : 'Bulk Edit'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input 
                type="date" 
                value={bookingDateFilter}
                onChange={(e) => setBookingDateFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-lavender-soft rounded-xl text-base focus:ring-lavender focus:border-lavender text-midnight"
              />
              <select 
                value={bookingClassFilter}
                onChange={(e) => setBookingClassFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-lavender-soft rounded-xl text-base focus:ring-lavender focus:border-lavender text-midnight"
              >
                <option value="">All Classes</option>
                {Array.from(new Set(allBookings.map(b => b.classTitle))).map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="Search Client..."
                value={bookingClientFilter}
                onChange={(e) => setBookingClientFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-lavender-soft rounded-xl text-base focus:ring-lavender focus:border-lavender text-midnight"
              />
              {(bookingDateFilter || bookingClassFilter || bookingClientFilter) && (
                <button 
                  onClick={() => { setBookingDateFilter(''); setBookingClassFilter(''); setBookingClientFilter(''); }}
                  className="px-4 py-2 text-stone-400 hover:text-midnight text-base font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-lavender-soft shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-lavender-soft text-midnight opacity-50 text-base font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Class</th>
                  <th className="px-6 py-4 font-medium">Date / Time</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Check-in</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lavender-soft">
                {allBookings
                  .filter(b => {
                    if (bookingDateFilter && format(b.classStartTime.toDate(), 'yyyy-MM-dd') !== bookingDateFilter) return false;
                    if (bookingClassFilter && b.classTitle !== bookingClassFilter) return false;
                    if (bookingClientFilter && !b.userName?.toLowerCase().includes(bookingClientFilter.toLowerCase()) && !b.userEmail.toLowerCase().includes(bookingClientFilter.toLowerCase())) return false;
                    return true;
                  })
                  .map(b => (
                  <tr key={b.id} className="hover:bg-lavender-soft/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-midnight">{b.userName || 'Unnamed'}</div>
                        {b.receiptFlagged && (
                          <div className="flex items-center gap-1 bg-coral/10 text-coral px-2 py-0.5 rounded-full text-base font-bold uppercase tracking-wider animate-pulse">
                            <AlertTriangle size={10} />
                            Check Payment
                          </div>
                        )}
                      </div>
                      <div className="text-base text-stone-400">{b.userEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-base text-stone-600">{b.classTitle}</div>
                      {b.isFirstTime && <span className="text-base bg-coral/10 text-coral px-1.5 py-0.5 rounded font-bold uppercase">First Timer</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-base text-stone-600">{format(b.classStartTime.toDate(), 'MMM d, h:mm a')}</div>
                    </td>
                    <td className="px-6 py-4">
                      {isBulkEditing ? (
                        <select 
                          value={b.status}
                          onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value as any)}
                          className={`text-base font-bold uppercase bg-ivory border border-lavender-soft rounded px-2 py-1 focus:ring-0 ${
                            b.status === 'paid' ? 'text-green-600' : 
                            b.status === 'cancelled' ? 'text-coral' : 'text-amber-600'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span className={`text-base font-bold uppercase ${
                          b.status === 'paid' ? 'text-green-600' : 
                          b.status === 'cancelled' ? 'text-coral' : 'text-amber-600'
                        }`}>
                          {b.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        disabled={!isBulkEditing}
                        checked={b.isCheckedIn || false}
                        onChange={() => handleToggleCheckIn(b.id, b.isCheckedIn)}
                        className={`w-4 h-4 rounded border-lavender-soft text-lavender focus:ring-lavender ${!isBulkEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {b.receiptBase64 && (
                          <button 
                            onClick={() => {
                              setSelectedReceipt({ url: b.receiptBase64!, analysis: b.receiptAnalysis || 'No analysis available' });
                              setShowReceiptModal(true);
                            }}
                            className="p-2 text-stone-400 hover:text-lavender transition-colors"
                            title="View Receipt"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                        {b.status !== 'cancelled' && (
                          <>
                            <button 
                              onClick={() => {
                                setReschedulingBooking(b);
                                setShowRescheduleModal(true);
                              }}
                              className="p-2 text-stone-400 hover:text-lavender transition-colors"
                              title="Reschedule"
                            >
                              <Calendar size={18} />
                            </button>
                            <button 
                              onClick={() => handleCancelBooking(b)}
                              className="p-2 text-stone-400 hover:text-coral transition-colors"
                              title="Cancel Booking"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showRescheduleModal && reschedulingBooking && (
        <div className="fixed inset-0 bg-midnight/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-6 border border-lavender-soft"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif text-midnight">Reschedule Booking</h2>
              <button onClick={() => setShowRescheduleModal(false)} className="text-stone-400 hover:text-midnight transition">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-4 bg-ivory rounded-2xl border border-lavender-soft">
              <p className="text-base text-stone-500">Currently booked for:</p>
              <p className="font-medium text-midnight">{reschedulingBooking.classTitle}</p>
              <p className="text-base text-stone-600">{format(reschedulingBooking.classStartTime.toDate(), 'EEEE, MMM d @ h:mm a')}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-medium text-lavender uppercase tracking-wider">Select New Class</h3>
              <div className="space-y-2">
                {upcomingClasses.filter(c => c.id !== reschedulingBooking.classId).map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleReschedule(c)}
                    className="w-full p-4 bg-white border border-lavender-soft rounded-2xl text-left hover:border-lavender transition-all flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-medium text-midnight group-hover:text-lavender transition-colors">{c.title}</div>
                      <div className="text-base text-stone-500">{format(c.startTime.toDate(), 'EEEE, MMM d @ h:mm a')}</div>
                    </div>
                    <div className="text-base text-stone-400">
                      {c.maxSize - c.currentParticipants} spots left
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-midnight/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full space-y-6 border border-lavender-soft"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif text-midnight">Payment Receipt</h2>
              <button onClick={() => setShowReceiptModal(false)} className="text-stone-400 hover:text-midnight transition">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-base font-bold text-lavender uppercase tracking-widest">Receipt Image</p>
                <div className="border border-lavender-soft rounded-2xl overflow-hidden">
                  <img 
                    src={selectedReceipt.url} 
                    alt="Receipt" 
                    className="w-full h-auto max-h-[400px] object-contain bg-ivory"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-base font-bold text-lavender uppercase tracking-widest">AI Analysis</p>
                  <div className="p-4 bg-ivory rounded-2xl border border-lavender-soft text-base text-stone-600 leading-relaxed italic">
                    "{selectedReceipt.analysis}"
                  </div>
                </div>
                <div className="p-4 bg-coral/5 rounded-2xl border border-coral/20 flex gap-3 items-start">
                  <AlertTriangle size={18} className="text-coral shrink-0" />
                  <p className="text-base text-stone-600">
                    If this receipt is invalid, please contact the client and update the booking status to "Cancelled" or "Pending".
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="px-6 py-3 bg-lavender text-white rounded-xl font-medium hover:bg-midnight transition"
              >
                Close Review
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-midnight/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-lavender-soft space-y-6"
            >
              <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center text-coral mx-auto">
                <AlertTriangle size={32} />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-serif text-midnight italic">Delete Class?</h3>
                <p className="text-stone-500 text-lg">
                  This action cannot be undone. All bookings associated with this class will be permanently removed from the schedule.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 bg-lavender-soft text-lavender rounded-2xl font-medium hover:bg-lavender hover:text-white transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteClass}
                  className="flex-1 py-4 bg-coral text-white rounded-2xl font-medium hover:bg-red-600 transition shadow-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
