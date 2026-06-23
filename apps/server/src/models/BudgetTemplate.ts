import { Schema, model, Document, Types } from 'mongoose';

export interface BudgetTemplateCategoryDoc {
  name: string;
  monthlyLimit: number;
  color: string;
}

export interface BudgetTemplateDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  name: string;
  categories: BudgetTemplateCategoryDoc[];
  createdAt: Date;
}

const categorySchema = new Schema<BudgetTemplateCategoryDoc>(
  {
    name: { type: String, required: true, trim: true },
    monthlyLimit: { type: Number, required: true, min: 0 },
    color: { type: String, default: '#3B82F6' },
  },
  { _id: false }
);

const budgetTemplateSchema = new Schema<BudgetTemplateDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  categories: { type: [categorySchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const BudgetTemplate = model<BudgetTemplateDoc>('BudgetTemplate', budgetTemplateSchema);
