import mongoose, { Types } from 'mongoose';
import { Bucket } from './models/Bucket';
import { SEED_BUCKETS } from './seedData';

export async function connectDb(uri: string): Promise<void> {
  await mongoose.connect(uri);
  console.log('[db] connected to MongoDB');
}

/** Give a brand-new user the predefined starter categories. */
export async function seedDefaultBuckets(userId: Types.ObjectId): Promise<void> {
  await Bucket.insertMany(SEED_BUCKETS.map((b) => ({ ...b, userId })));
}
