import { Schema, model, Document, Types } from 'mongoose';

export interface BucketDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  name: string;
  monthlyLimit: number;
  color: string;
  createdAt: Date;
}

const bucketSchema = new Schema<BucketDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  monthlyLimit: { type: Number, required: true, min: 0 },
  color: { type: String, default: '#3B82F6' },
  createdAt: { type: Date, default: Date.now },
});

// Category names are unique per user (not globally).
bucketSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Bucket = model<BucketDoc>('Bucket', bucketSchema);
