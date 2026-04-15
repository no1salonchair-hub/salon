import { Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'salon_owner' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  createdAt: Timestamp;
}

export interface Service {
  name: string;
  price: number;
}

export interface Barber {
  id: string;
  name: string;
  specialty?: string;
}

export interface Salon {
  id: string;
  ownerId: string;
  name: string;
  services: Service[];
  barbers?: Barber[];
  imageUrl: string;
  location: {
    lat: number;
    lng: number;
    state?: string;
    city?: string;
    address?: string;
  };
  status: 'pending' | 'active' | 'hidden';
  imageStatus?: 'pending' | 'authorized_by_ai' | 'rejected_by_ai';
  adminAuthorized?: boolean;
  subscriptionPlan?: 'monthly' | 'yearly';
  subscriptionExpiry: Timestamp;
  averageRating?: number;
  reviewCount?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface Booking {
  id: string;
  userId: string;
  salonId: string;
  services: string[];
  barberName?: string;
  dateTime: Timestamp;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  isRated?: boolean;
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
}

export interface Payment {
  id: string;
  salonId: string;
  salonName?: string;
  amount: number;
  status: 'pending' | 'success';
  createdAt: Timestamp;
}

export interface Review {
  id: string;
  salonId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
}

export interface Favorite {
  id: string;
  userId: string;
  salonId: string;
  createdAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
