import { Schema, model, Document, Types } from 'mongoose';

export interface ExpenseDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  bucketId: Types.ObjectId;
  amount: number;
  note?: string;
  date: Date;
  createdAt: Date;
  deletedAt?: Date;
}

const expenseSchema = new Schema<ExpenseDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bucketId: { type: Schema.Types.ObjectId, ref: 'Bucket', required: true, index: true },
  amount: { type: Number, required: true, min: [0.01, 'amount must be positive'] },
  note: { type: String, trim: true },
  date: { type: Date, required: true, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export const Expense = model<ExpenseDoc>('Expense', expenseSchema);
