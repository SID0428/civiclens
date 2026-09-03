import mongoose, { Schema } from 'mongoose';
import { IDepartment } from '../types';

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
    },
    slaHours: {
      type: Number,
      default: 48,
    },
    icon: {
      type: String,
      default: 'building',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
