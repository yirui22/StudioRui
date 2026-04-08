export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  phone?: string;
  isAdmin: boolean;
  createdAt: string;
  rescheduleCredit?: number;
}

export interface PilatesClass {
  id: string;
  title: string;
  instructor: string;
  type: 'group' | 'private';
  startTime: any; // Firestore Timestamp
  duration: number; // In minutes
  maxSize: number;
  currentParticipants: number;
  price: number;
  description: string;
  location: string;
}

export interface ClassTemplate {
  id: string;
  title: string;
  instructor: string;
  type: 'group' | 'private';
  duration: number; // In minutes
  maxSize: number;
  price: number;
  description: string;
  location: string;
}

export interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  userPhone?: string;
  classId: string;
  status: 'pending' | 'paid' | 'cancelled';
  isCheckedIn?: boolean;
  timestamp: any; // Firestore Timestamp
  classTitle: string;
  classStartTime: any; // Firestore Timestamp
  classDuration?: number;
  isFirstTime?: boolean;
  injuries?: string;
  receiptFlagged?: boolean;
  receiptAnalysis?: string;
  receiptBase64?: string;
  price: number;
  paymentMethod: 'stripe' | 'paypal' | 'bank' | 'credit';
}
