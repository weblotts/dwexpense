import { Schema, model, Document, Types } from 'mongoose';

export interface UserDoc extends Document<Types.ObjectId> {
  email: string;
  passwordHash: string;
  name: string;
  monthlySalary: number;
  savingsGoal: number;
  theme?: 'light' | 'dark';
  currency?: string;
  createdAt: Date;
}

const userSchema = new Schema<UserDoc>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: '', trim: true },
  monthlySalary: { type: Number, default: 0, min: 0 },
  savingsGoal: { type: Number, default: 0, min: 0 },
  theme: { type: String, enum: ['light', 'dark'] },
  currency: { type: String, default: 'USD' },
  createdAt: { type: Date, default: Date.now },
});

export const User = model<UserDoc>('User', userSchema);
