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

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  department?: string;
  assignedDistrict?: string;
  assignedPincodes?: string[];
  officialId?: string;
}

export interface ComplaintImage {
  url: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface TimelineEvent {
  status: ComplaintStatus;
  message: string;
  updatedBy: any;
  updaterRole: string;
  timestamp: string;
}

export interface Complaint {
  _id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  imageUrl: string;
  images: ComplaintImage[];
  resolvedImageUrl?: string;
  latitude: number;
  longitude: number;
  address: string;
  pincode: string;
  district?: string;
  state?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  citizen?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  assignedSubAdmin?: {
    _id: string;
    name: string;
    email: string;
    department?: string;
  };
  resolutionNotes?: string;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
}
