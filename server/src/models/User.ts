import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      select: false,
    },
    phone: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['citizen', 'subadmin', 'superadmin'],
      default: 'citizen',
    },
    officialId: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: '',
    },
    assignedDistrict: {
      type: String,
      default: '',
    },
    assignedPincodes: {
      type: [String],
      default: [],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: String,
      expiresAt: Date,
      purpose: String,
    },
    googleId: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Encrypt password before save
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare Password helper
UserSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
