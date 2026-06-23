import { Router, Request, Response } from 'express';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { Bucket } from '../models/Bucket';
import { monthRange } from '../lib/dates';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';

export const exportRouter = Router();

const uid = (req: Request) => (req as AuthedRequest).userId!;

function csvEscape(value: string | number | undefined): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toRow(fields: (string | number | undefined)[]): string {
  return fields.map(csvEscape).join(',');
}

/** GET /api/export/csv?month=YYYY-MM */
exportRouter.get('/csv', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const month = (req.query.month as string | undefined);
  const { start, end } = monthRange(month);

  // Determine the month label for the filename
  const monthLabel = month && /^\d{4}-\d{2}$/.test(month)
    ? month
    : `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

  const [expenses, incomes, buckets] = await Promise.all([
    Expense.find({ userId, date: { $gte: start, $lt: end }, $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }).sort({ date: 1 }).lean(),
    Income.find({ userId, date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean(),
    Bucket.find({ userId }).lean(),
  ]);

  const bucketMap = new Map(buckets.map((b) => [String(b._id), b.name]));

  const rows: string[] = [
    'Date,Type,Category,Source,Amount,Note',
  ];

  for (const e of expenses) {
    const dateStr = e.date.toISOString().slice(0, 10);
    const category = bucketMap.get(String(e.bucketId)) ?? '';
    rows.push(toRow([dateStr, 'Expense', category, '', -e.amount, e.note ?? '']));
  }

  for (const i of incomes) {
    const dateStr = i.date.toISOString().slice(0, 10);
    rows.push(toRow([dateStr, 'Income', '', i.source, i.amount, '']));
  }

  const csv = rows.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="budget-${monthLabel}.csv"`);
  res.send(csv);
}));
