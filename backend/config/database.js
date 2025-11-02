// MongoDB connection configuration
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/peerprep');
    
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
