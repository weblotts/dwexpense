import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { monthRange } from '../lib/dates';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type { CreateExpenseInput, SplitExpenseInput } from '@dwexpense/types';

export const expensesRouter = Router();

/** Parse a YYYY-MM-DD string as local midnight (not UTC midnight). */
function localDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

const uid = (req: Request) => (req as AuthedRequest).userId!;

/** GET /api/expenses?bucketId=&month=YYYY-MM → filtered, date desc. */
expensesRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { bucketId, month } = req.query as { bucketId?: string; month?: string };
  const { start, end } = monthRange(month);

  const filter: Record<string, unknown> = {
    userId,
    date: { $gte: start, $lt: end },
    deletedAt: null,
  };
  if (bucketId) {
    if (!mongoose.isValidObjectId(bucketId)) {
      return res.status(400).json({ error: 'Invalid bucketId', status: 400 });
    }
    filter.bucketId = bucketId;
  }

  const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 }).lean();
  res.json(expenses);
}));

/** POST /api/expenses → validate amount > 0 and bucket belongs to user. */
expensesRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { bucketId, amount, note, date } = req.body as CreateExpenseInput;

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number', status: 400 });
  }
  if (!bucketId || !mongoose.isValidObjectId(bucketId)) {
    return res.status(400).json({ error: 'Valid bucketId is required', status: 400 });
  }

  const bucket = await Bucket.findOne({ _id: bucketId, userId });
  if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });

  const expense = await Expense.create({
    userId,
    bucketId,
    amount,
    note: note?.trim() || undefined,
    date: date ? localDate(date) : new Date(),
  });

  res.status(201).json(expense);
}));

/** POST /api/expenses/split → create multiple expenses in one call. */
expensesRouter.post('/split', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { splits, date } = req.body as SplitExpenseInput;

  if (!Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ error: 'splits must be a non-empty array', status: 400 });
  }

  const total = splits.reduce((sum, s) => sum + (s.amount ?? 0), 0);
  if (total <= 0) {
    return res.status(400).json({ error: 'total amount must be greater than 0', status: 400 });
  }

  for (const split of splits) {
    if (typeof split.amount !== 'number' || split.amount <= 0) {
      return res.status(400).json({ error: 'Each split amount must be a positive number', status: 400 });
    }
    if (!split.bucketId || !mongoose.isValidObjectId(split.bucketId)) {
      return res.status(400).json({ error: 'Each split must have a valid bucketId', status: 400 });
    }
  }

  // Verify all buckets belong to the user
  const bucketIds = splits.map((s) => s.bucketId);
  const buckets = await Bucket.find({ _id: { $in: bucketIds }, userId }).lean();
  if (buckets.length !== new Set(bucketIds).size) {
    return res.status(404).json({ error: 'One or more buckets not found', status: 404 });
  }

  const expenseDate = date ? localDate(date) : new Date();
  const created = await Expense.insertMany(
    splits.map((s) => ({
      userId,
      bucketId: s.bucketId,
      amount: s.amount,
      note: s.note?.trim() || undefined,
      date: expenseDate,
    }))
  );

  res.status(201).json(created);
}));

/** DELETE /api/expenses/:id → soft delete (sets deletedAt). */
expensesRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid expense id', status: 400 });
  }
  const updated = await Expense.findOneAndUpdate(
    { _id: id, userId, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Expense not found', status: 404 });
  res.json({ success: true });
}));

/** POST /api/expenses/:id/restore → clears deletedAt. */
expensesRouter.post('/:id/restore', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid expense id', status: 400 });
  }
  const restored = await Expense.findOneAndUpdate(
    { _id: id, userId },
    { $unset: { deletedAt: '' } },
    { new: true }
  );
  if (!restored) return res.status(404).json({ error: 'Expense not found', status: 404 });
  res.json(restored);
}));
