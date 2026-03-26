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

export interface Salon {
  id: string;
  ownerId: string;
  name: string;
  services: Service[];
  imageUrl: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'pending' | 'active' | 'hidden';
  subscriptionExpiry: Timestamp;
  createdAt: Timestamp;
}

export interface Booking {
  id: string;
  userId: string;
  salonId: string;
  service: string;
  dateTime: Timestamp;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
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
  amount: number;
  status: 'pending' | 'success';
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
