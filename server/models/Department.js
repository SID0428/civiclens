const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    description: String,
    slaHours: {
      type: Number,
      default: 48,
    },
    icon: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', DepartmentSchema);
