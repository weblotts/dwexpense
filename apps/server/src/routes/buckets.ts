import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { Recurring } from '../models/Recurring';
import { monthRange } from '../lib/dates';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type { BucketWithSpend, UpdateBucketInput, CreateBucketInput } from '@dwexpense/types';

export const bucketsRouter = Router();

const uid = (req: Request) => (req as AuthedRequest).userId!;

/** Default colors cycled through when a new category doesn't specify one. */
const DEFAULT_COLORS = [
  '#22C55E', '#F97316', '#3B82F6', '#A855F7', '#06B6D4',
  '#EC4899', '#EAB308', '#64748B', '#EF4444', '#14B8A6',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** GET /api/buckets → user's buckets with current month's spent + remaining. */
bucketsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { start, end } = monthRange();
  const userId = uid(req);

  const buckets = await Bucket.find({ userId }).sort({ createdAt: 1 }).lean();

  const spendByBucket = await Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
    { $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: start, $lt: end },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    }},
    { $group: { _id: '$bucketId', total: { $sum: '$amount' } } },
  ]);
  const spentMap = new Map(spendByBucket.map((s) => [s._id.toString(), s.total]));

  const result: BucketWithSpend[] = buckets.map((b) => {
    const spent = spentMap.get(b._id.toString()) ?? 0;
    return {
      _id: b._id.toString(),
      name: b.name,
      monthlyLimit: b.monthlyLimit,
      color: b.color,
      createdAt: (b.createdAt as Date).toISOString(),
      spent,
      remaining: b.monthlyLimit - spent,
    };
  });

  res.json(result);
}));

/** POST /api/buckets → create a category if the name isn't already taken. */
bucketsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const body = req.body as CreateBucketInput;
  const name = body.name?.trim();
  if (!name) return res.status(400).json({ error: 'name is required', status: 400 });

  const existing = await Bucket.findOne({ userId, name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
  if (existing) {
    return res.status(409).json({ error: `A category named "${existing.name}" already exists`, status: 409 });
  }

  const count = await Bucket.countDocuments({ userId });
  const bucket = await Bucket.create({
    userId,
    name,
    monthlyLimit: typeof body.monthlyLimit === 'number' && body.monthlyLimit >= 0 ? body.monthlyLimit : 0,
    color: body.color || DEFAULT_COLORS[count % DEFAULT_COLORS.length],
  });

  res.status(201).json(bucket);
}));

/** PATCH /api/buckets/:id → update name / monthlyLimit / color. */
bucketsRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid bucket id', status: 400 });
  }

  const body = req.body as UpdateBucketInput;
  const update: UpdateBucketInput = {};
  if (typeof body.name === 'string') update.name = body.name;
  if (typeof body.color === 'string') update.color = body.color;
  if (typeof body.monthlyLimit === 'number') {
    if (body.monthlyLimit < 0) {
      return res.status(400).json({ error: 'monthlyLimit must be >= 0', status: 400 });
    }
    update.monthlyLimit = body.monthlyLimit;
  }

  const bucket = await Bucket.findOneAndUpdate({ _id: id, userId }, update, { new: true });
  if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });
  res.json(bucket);
}));

const DEFAULT_CATEGORIES = [
  { name: 'Housing',       color: '#3B82F6', monthlyLimit: 0 },
  { name: 'Groceries',     color: '#22C55E', monthlyLimit: 0 },
  { name: 'Transport',     color: '#F97316', monthlyLimit: 0 },
  { name: 'Health',        color: '#EC4899', monthlyLimit: 0 },
  { name: 'Entertainment', color: '#A855F7', monthlyLimit: 0 },
  { name: 'Dining Out',    color: '#EAB308', monthlyLimit: 0 },
  { name: 'Shopping',      color: '#06B6D4', monthlyLimit: 0 },
  { name: 'Savings',       color: '#14B8A6', monthlyLimit: 0 },
  { name: 'Subscriptions', color: '#6366F1', monthlyLimit: 0 },
  { name: 'Misc',          color: '#64748B', monthlyLimit: 0 },
];

/** POST /api/buckets/seed → insert default categories, skipping any that already exist. */
bucketsRouter.post('/seed', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const existing = await Bucket.find({ userId }).lean();
  const existingNames = new Set(existing.map((b) => b.name.toLowerCase()));

  const toInsert = DEFAULT_CATEGORIES.filter((c) => !existingNames.has(c.name.toLowerCase()));
  if (toInsert.length === 0) return res.json({ created: 0 });

  await Bucket.insertMany(toInsert.map((c) => ({ ...c, userId })));
  res.status(201).json({ created: toInsert.length });
}));

/** DELETE /api/buckets/:id → removes the category and its expenses/recurring. */
bucketsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid bucket id', status: 400 });
  }
  const bucket = await Bucket.findOneAndDelete({ _id: id, userId });
  if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });
  await Expense.deleteMany({ userId, bucketId: id });
  await Recurring.deleteMany({ userId, bucketId: id });
  res.json({ success: true });
}));
