import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Income } from '../models/Income';
import { monthRange } from '../lib/dates';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type { CreateIncomeInput } from '@dwexpense/types';

export const incomeRouter = Router();

function localDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

const uid = (req: Request) => (req as AuthedRequest).userId!;

/** GET /api/income?month=YYYY-MM → income entries for the month, date desc. */
incomeRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { month } = req.query as { month?: string };
  const { start, end } = monthRange(month);
  const items = await Income.find({ userId, date: { $gte: start, $lt: end } })
    .sort({ date: -1 })
    .lean();
  res.json(items);
}));

/** POST /api/income → record a one-off income entry. */
incomeRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { amount, source, date } = req.body as CreateIncomeInput;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number', status: 400 });
  }
  const income = await Income.create({
    userId,
    amount,
    source: source?.trim() || 'Income',
    date: date ? localDate(date) : new Date(),
  });
  res.status(201).json(income);
}));

/** DELETE /api/income/:id. */
incomeRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid income id', status: 400 });
  }
  const deleted = await Income.findOneAndDelete({ _id: id, userId });
  if (!deleted) return res.status(404).json({ error: 'Income not found', status: 404 });
  res.json({ success: true });
}));
