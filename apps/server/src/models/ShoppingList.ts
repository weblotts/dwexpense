import { Schema, model, Document, Types } from 'mongoose';

export interface ShoppingListDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  name: string;
  bucketId?: Types.ObjectId;
  pinned: boolean;
  convertedExpenseId?: Types.ObjectId;
  createdAt: Date;
}

const shoppingListSchema = new Schema<ShoppingListDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  bucketId: { type: Schema.Types.ObjectId, ref: 'Bucket' },
  pinned: { type: Boolean, default: false },
  convertedExpenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
  createdAt: { type: Date, default: Date.now },
});

export const ShoppingList = model<ShoppingListDoc>('ShoppingList', shoppingListSchema);
