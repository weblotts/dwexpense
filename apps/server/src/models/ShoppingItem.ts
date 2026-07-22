import { Schema, model, Document, Types } from 'mongoose';

export interface ShoppingItemDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  listId: Types.ObjectId;
  name: string;
  estimatedPrice?: number;
  bucketId?: Types.ObjectId;
  quantity: number;
  checked: boolean;
  checkedAt?: Date;
  order: number;
  createdAt: Date;
}

const shoppingItemSchema = new Schema<ShoppingItemDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  listId: { type: Schema.Types.ObjectId, ref: 'ShoppingList', required: true, index: true },
  name: { type: String, required: true, trim: true },
  estimatedPrice: { type: Number, min: 0 },
  bucketId: { type: Schema.Types.ObjectId, ref: 'Bucket' },
  quantity: { type: Number, default: 1, min: 1 },
  checked: { type: Boolean, default: false },
  checkedAt: { type: Date },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const ShoppingItem = model<ShoppingItemDoc>('ShoppingItem', shoppingItemSchema);
