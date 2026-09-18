import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/voxaflow';

  try {
    // Attempt connecting to provided MongoDB URI with a short timeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] Connected to external MongoDB at ${mongoUri}`);
  } catch (err: any) {
    console.warn(`[Database] External MongoDB connection failed (${err.message}). Starting embedded in-memory MongoDB server...`);
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'voxaflow',
      }
    });
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[Database] Connected to embedded in-memory MongoDB at ${memoryUri}`);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
  console.log('[Database] Disconnected from MongoDB');
}
