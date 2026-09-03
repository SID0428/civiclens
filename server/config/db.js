const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civiclens');
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Error: ${error.message}`);
    // Don't exit immediately in demo mode so server still starts
    console.warn('[MongoDB] Running without persistent DB connection. Please provide a valid MONGO_URI.');
  }
};

module.exports = connectDB;
