import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Recurring } from '../models/Recurring';
import { Bucket } from '../models/Bucket';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import { applyRecurringForUser } from '../lib/applyRecurring';
import type { CreateRecurringInput, UpdateRecurringInput } from '@dwexpense/types';

export const recurringRouter = Router();

const uid = (req: Request) => (req as AuthedRequest).userId!;

/** GET /api/recurring → all recurring rules for the user. */
recurringRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const items = await Recurring.find({ userId: uid(req) }).sort({ type: 1, dayOfMonth: 1 }).lean();
  res.json(items);
}));

/** POST /api/recurring → create a recurring expense or income rule. */
recurringRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const body = req.body as CreateRecurringInput;

  if (body.type !== 'expense' && body.type !== 'income') {
    return res.status(400).json({ error: 'type must be "expense" or "income"', status: 400 });
  }
  if (typeof body.amount !== 'number' || body.amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number', status: 400 });
  }
  if (body.type === 'expense') {
    if (!body.bucketId || !mongoose.isValidObjectId(body.bucketId)) {
      return res.status(400).json({ error: 'Valid bucketId is required for expenses', status: 400 });
    }
    const bucket = await Bucket.findOne({ _id: body.bucketId, userId });
    if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });
  }

  const freq = ['weekly','biweekly','monthly'].includes(body.frequency ?? '') ? body.frequency : 'monthly';
  const day = Math.min(28, Math.max(1, Math.round(body.dayOfMonth ?? 1)));
  const item = await Recurring.create({
    userId,
    type: body.type,
    frequency: freq,
    amount: body.amount,
    bucketId: body.type === 'expense' ? body.bucketId : undefined,
    source: body.type === 'income' ? body.source?.trim() || 'Income' : undefined,
    note: body.note?.trim(),
    serviceName: body.serviceName?.trim(),
    url: body.url?.trim(),
    dayOfMonth: day,
    dayOfWeek: typeof body.dayOfWeek === 'number' && body.dayOfWeek >= 0 && body.dayOfWeek <= 6 ? body.dayOfWeek : undefined,
    active: true,
    reminderDays: typeof body.reminderDays === 'number' && body.reminderDays >= 0 ? body.reminderDays : undefined,
  });
  res.status(201).json(item);
}));

/** PATCH /api/recurring/:id */
recurringRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id', status: 400 });
  }
  const body = req.body as UpdateRecurringInput;
  const update: Record<string, unknown> = {};
  if (typeof body.amount === 'number' && body.amount > 0) update.amount = body.amount;
  if (typeof body.bucketId === 'string') update.bucketId = body.bucketId;
  if (typeof body.source === 'string') update.source = body.source.trim();
  if (typeof body.note === 'string') update.note = body.note.trim();
  if (typeof body.dayOfMonth === 'number') {
    update.dayOfMonth = Math.min(28, Math.max(1, Math.round(body.dayOfMonth)));
  }
  if (typeof body.active === 'boolean') update.active = body.active;
  if (typeof body.serviceName === 'string') update.serviceName = body.serviceName.trim();
  if (typeof body.url === 'string') update.url = body.url.trim();
  if (body.frequency && ['weekly','biweekly','monthly'].includes(body.frequency)) update.frequency = body.frequency;
  if (typeof body.reminderDays === 'number' && body.reminderDays >= 0) update.reminderDays = body.reminderDays;
  if (typeof body.dayOfWeek === 'number' && body.dayOfWeek >= 0 && body.dayOfWeek <= 6) update.dayOfWeek = body.dayOfWeek;

  const item = await Recurring.findOneAndUpdate({ _id: id, userId }, update, { new: true });
  if (!item) return res.status(404).json({ error: 'Recurring rule not found', status: 404 });
  res.json(item);
}));

/** DELETE /api/recurring/:id */
recurringRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id', status: 400 });
  }
  const deleted = await Recurring.findOneAndDelete({ _id: id, userId });
  if (!deleted) return res.status(404).json({ error: 'Recurring rule not found', status: 404 });
  res.json({ success: true });
}));

/**
 * POST /api/recurring/apply → materialise due recurring rules into this month's
 * expenses/income. Idempotent per month via the rule's `lastApplied` field.
 * Safe to call on every dashboard load.
 */
recurringRouter.post('/apply', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const result = await applyRecurringForUser(userId);
  res.json(result);
}));
