import { Schema, model, Document, Types } from 'mongoose';

export interface NetWorthEntry {
  label: string;
  amount: number;
}

export interface NetWorthSnapshotDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  date: Date;
  assets: NetWorthEntry[];
  liabilities: NetWorthEntry[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  createdAt: Date;
}

const entrySchema = new Schema<NetWorthEntry>(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const netWorthSnapshotSchema = new Schema<NetWorthSnapshotDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true },
  assets: { type: [entrySchema], default: [] },
  liabilities: { type: [entrySchema], default: [] },
  totalAssets: { type: Number, default: 0 },
  totalLiabilities: { type: Number, default: 0 },
  netWorth: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const NetWorthSnapshot = model<NetWorthSnapshotDoc>('NetWorthSnapshot', netWorthSnapshotSchema);
