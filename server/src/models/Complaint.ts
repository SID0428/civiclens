import mongoose, { Schema } from 'mongoose';
import { IComplaint } from '../types';

const ComplaintSchema = new Schema<IComplaint>(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for the issue'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please describe the issue in detail'],
    },
    category: {
      type: String,
      required: [true, 'Please select a civic category'],
      enum: [
        'Roads & Potholes',
        'Garbage & Sanitation',
        'Water Supply & Sewage',
        'Electricity & Streetlights',
        'Public Infrastructure',
        'Encroachment & Traffic',
        'Other',
      ],
      default: 'Other',
    },
    imageUrl: {
      type: String,
      required: [true, 'At least one geotagged photo is required'],
    },
    images: [
      {
        url: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    resolvedImageUrl: {
      type: String,
      default: '',
    },
    resolvedImages: [
      {
        url: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    latitude: {
      type: Number,
      required: [true, 'GPS Latitude is strictly required'],
    },
    longitude: {
      type: Number,
      required: [true, 'GPS Longitude is strictly required'],
    },
    address: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required for district routing'],
      trim: true,
      index: true,
    },
    district: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    citizen: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedSubAdmin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    timeline: [
      {
        status: { type: String, required: true },
        message: { type: String, required: true },
        updatedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        updaterRole: { type: String, required: true },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Geospatial index for nearby queries
ComplaintSchema.index({ location: '2dsphere' });

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);
