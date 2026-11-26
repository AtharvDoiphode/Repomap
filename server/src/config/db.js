import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas using Mongoose.
 * If MONGO_URI is missing or contains placeholder text, logs a warning
 * and safely returns false without crashing the process.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('your_mongodb_atlas_connection_string_here') || uri.includes('<username>')) {
    console.warn(
      '⚠️ [DB] MONGO_URI is missing or contains placeholder values. Running in ephemeral cache mode (database disabled).'
    );
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ [DB] Connected to MongoDB Atlas: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.warn(`⚠️ [DB] Connection failed (${err.message}). Running with database caching disabled.`);
    return false;
  }
}
