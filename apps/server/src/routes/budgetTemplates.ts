import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { BudgetTemplate } from '../models/BudgetTemplate';
import { Bucket } from '../models/Bucket';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type { CreateBudgetTemplateInput } from '@dwexpense/types';

export const budgetTemplatesRouter = Router();

const uid = (req: Request) => (req as AuthedRequest).userId!;

/** GET /api/budget-templates → list user's templates */
budgetTemplatesRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const templates = await BudgetTemplate.find({ userId: uid(req) }).sort({ createdAt: -1 }).lean();
  res.json(templates);
}));

/** POST /api/budget-templates/from-current → snapshot current buckets as template */
budgetTemplatesRouter.post('/from-current', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required', status: 400 });
  }

  const buckets = await Bucket.find({ userId }).lean();
  const categories = buckets.map((b) => ({
    name: b.name,
    monthlyLimit: b.monthlyLimit,
    color: b.color,
  }));

  const template = await BudgetTemplate.create({ userId, name: name.trim(), categories });
  res.status(201).json(template);
}));

/** POST /api/budget-templates → create template */
budgetTemplatesRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const body = req.body as CreateBudgetTemplateInput;

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ error: 'name is required', status: 400 });
  }
  if (!Array.isArray(body.categories)) {
    return res.status(400).json({ error: 'categories must be an array', status: 400 });
  }

  const template = await BudgetTemplate.create({
    userId,
    name: body.name.trim(),
    categories: body.categories,
  });
  res.status(201).json(template);
}));

/** POST /api/budget-templates/:id/apply → replace all buckets with template categories */
budgetTemplatesRouter.post('/:id/apply', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id', status: 400 });
  }

  const template = await BudgetTemplate.findOne({ _id: id, userId }).lean();
  if (!template) return res.status(404).json({ error: 'Template not found', status: 404 });

  // Delete existing buckets and create new ones from template
  await Bucket.deleteMany({ userId });
  const newBuckets = await Bucket.insertMany(
    template.categories.map((c) => ({
      userId: new mongoose.Types.ObjectId(userId),
      name: c.name,
      monthlyLimit: c.monthlyLimit,
      color: c.color,
    }))
  );

  res.json(newBuckets);
}));

/** DELETE /api/budget-templates/:id */
budgetTemplatesRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id', status: 400 });
  }
  const deleted = await BudgetTemplate.findOneAndDelete({ _id: id, userId });
  if (!deleted) return res.status(404).json({ error: 'Template not found', status: 404 });
  res.json({ success: true });
}));
