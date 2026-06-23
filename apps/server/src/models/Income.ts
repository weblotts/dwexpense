import { Schema, model, Document, Types } from 'mongoose';

export interface IncomeDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  amount: number;
  source: string;
  date: Date;
  createdAt: Date;
}

const incomeSchema = new Schema<IncomeDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: [0.01, 'amount must be positive'] },
  source: { type: String, default: 'Income', trim: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
});

export const Income = model<IncomeDoc>('Income', incomeSchema);
