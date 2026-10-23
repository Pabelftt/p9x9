// lib/db.js
// MongoDB connection (mongoose) - same as the old project's index.js

import mongoose from "mongoose";

mongoose.set("bufferTimeoutMS", 60000);

const cached = global.mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is required to connect to MongoDB.");
    }

    cached.promise = mongoose
      .connect(uri, {
        bufferTimeoutMS: 60000,
        serverSelectionTimeoutMS: 30000
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  // keep the connection + Atlas free cluster awake (prevents cold-start wake-up delays)
  if (!cached.keepAlive) {
    cached.keepAlive = setInterval(() => {
      mongoose.connection.db
        .admin()
        .command({ ping: 1 })
        .catch(() => {});
    }, 60000);
    if (cached.keepAlive.unref) cached.keepAlive.unref();
  }

  return cached.conn;
}

global.mongoose = cached;
