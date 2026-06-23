import { Schema, model, Document, Types } from 'mongoose';

export interface SavingsGoalDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  deadline?: string;
  createdAt: Date;
}

const savingsGoalSchema = new Schema<SavingsGoalDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: [0.01, 'targetAmount must be positive'] },
  currentAmount: { type: Number, default: 0, min: 0 },
  color: { type: String, default: '#3B82F6' },
  deadline: { type: String }, // YYYY-MM-DD, optional
  createdAt: { type: Date, default: Date.now },
});

export const SavingsGoal = model<SavingsGoalDoc>('SavingsGoal', savingsGoalSchema);
