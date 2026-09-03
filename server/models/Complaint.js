const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema(
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
      required: [true, 'An image of the issue is required'],
    },
    resolvedImageUrl: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedSubAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    timeline: [
      {
        status: String,
        message: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        updaterRole: String,
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

module.exports = mongoose.model('Complaint', ComplaintSchema);
