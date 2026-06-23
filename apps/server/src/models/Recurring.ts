import { Schema, model, Document, Types } from 'mongoose';

export type RecurringType = 'expense' | 'income';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface RecurringDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  type: RecurringType;
  frequency: RecurringFrequency;
  amount: number;
  bucketId?: Types.ObjectId;
  source?: string;
  note?: string;
  serviceName?: string;
  url?: string;
  dayOfMonth: number;
  dayOfWeek?: number; // 0=Sun, 1=Mon, … 5=Fri, 6=Sat — used when frequency is weekly/biweekly
  active: boolean;
  lastApplied: string;
  reminderDays?: number;
  createdAt: Date;
}

const recurringSchema = new Schema<RecurringDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['expense', 'income'], required: true },
  frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'monthly' },
  amount: { type: Number, required: true, min: [0.01, 'amount must be positive'] },
  bucketId: { type: Schema.Types.ObjectId, ref: 'Bucket' },
  source: { type: String, trim: true },
  note: { type: String, trim: true },
  serviceName: { type: String, trim: true },
  url: { type: String, trim: true },
  dayOfMonth: { type: Number, default: 1, min: 1, max: 28 },
  dayOfWeek: { type: Number, min: 0, max: 6 },
  active: { type: Boolean, default: true },
  lastApplied: { type: String, default: '' },
  reminderDays: { type: Number, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Recurring = model<RecurringDoc>('Recurring', recurringSchema);
