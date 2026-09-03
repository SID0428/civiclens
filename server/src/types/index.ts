import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type UserRole = 'citizen' | 'subadmin' | 'superadmin';
export type ComplaintStatus = 'Pending' | 'Under Review' | 'In Progress' | 'Resolved' | 'Rejected';
export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ComplaintCategory =
  | 'Roads & Potholes'
  | 'Garbage & Sanitation'
  | 'Water Supply & Sewage'
  | 'Electricity & Streetlights'
  | 'Public Infrastructure'
  | 'Encroachment & Traffic'
  | 'Other';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: UserRole;
  officialId: string;
  department: string;
  assignedDistrict: string;
  assignedPincodes: string[];
  isEmailVerified: boolean;
  otp?: {
    code?: string;
    expiresAt?: Date;
    purpose?: string;
  };
  googleId?: string;
  avatar?: string;
  comparePassword(enteredPassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IComplaintImage {
  url: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface ITimelineEvent {
  status: ComplaintStatus;
  message: string;
  updatedBy: Types.ObjectId | IUser;
  updaterRole: UserRole;
  timestamp: Date;
}

export interface IComplaint extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  category: ComplaintCategory;
  imageUrl: string;
  images: IComplaintImage[];
  resolvedImageUrl?: string;
  resolvedImages?: { url: string; timestamp: Date }[];
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  latitude: number;
  longitude: number;
  address: string;
  pincode: string;
  district?: string;
  state?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  citizen: Types.ObjectId | IUser;
  assignedSubAdmin?: Types.ObjectId | IUser | null;
  resolutionNotes?: string;
  timeline: ITimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDepartment extends Document {
  name: string;
  description: string;
  slaHours: number;
  icon: string;
}

export interface AuthRequest extends Request {
  user?: IUser;
}
