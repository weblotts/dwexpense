import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { NetWorthSnapshot } from '../models/NetWorthSnapshot';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type { CreateNetWorthInput, UpdateNetWorthInput } from '@dwexpense/types';

export const netWorthRouter = Router();

const uid = (req: Request) => (req as AuthedRequest).userId!;

function calcTotals(assets: { amount: number }[], liabilities: { amount: number }[]) {
  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
}

/** GET /api/net-worth → all snapshots for user, newest first */
netWorthRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const snapshots = await NetWorthSnapshot.find({ userId: uid(req) })
    .sort({ date: -1, createdAt: -1 })
    .lean();
  res.json(snapshots);
}));

/** POST /api/net-worth → create snapshot */
netWorthRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const body = req.body as CreateNetWorthInput;

  if (!Array.isArray(body.assets) || !Array.isArray(body.liabilities)) {
    return res.status(400).json({ error: 'assets and liabilities must be arrays', status: 400 });
  }

  const { totalAssets, totalLiabilities, netWorth } = calcTotals(body.assets, body.liabilities);

  const snapshot = await NetWorthSnapshot.create({
    userId,
    date: body.date ? new Date(body.date) : new Date(),
    assets: body.assets,
    liabilities: body.liabilities,
    totalAssets,
    totalLiabilities,
    netWorth,
  });

  res.status(201).json(snapshot);
}));

/** PATCH /api/net-worth/:id → update snapshot */
netWorthRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id', status: 400 });
  }

  const body = req.body as UpdateNetWorthInput;
  const update: Record<string, unknown> = {};

  if (body.date) update.date = new Date(body.date);

  // If either array is provided, recalculate totals
  if (body.assets !== undefined || body.liabilities !== undefined) {
    // Fetch existing to merge missing side
    const existing = await NetWorthSnapshot.findOne({ _id: id, userId }).lean();
    if (!existing) return res.status(404).json({ error: 'Snapshot not found', status: 404 });

    const assets = body.assets ?? existing.assets;
    const liabilities = body.liabilities ?? existing.liabilities;
    const { totalAssets, totalLiabilities, netWorth } = calcTotals(assets, liabilities);

    if (body.assets !== undefined) update.assets = body.assets;
    if (body.liabilities !== undefined) update.liabilities = body.liabilities;
    update.totalAssets = totalAssets;
    update.totalLiabilities = totalLiabilities;
    update.netWorth = netWorth;
  }

  const snapshot = await NetWorthSnapshot.findOneAndUpdate({ _id: id, userId }, update, { new: true });
  if (!snapshot) return res.status(404).json({ error: 'Snapshot not found', status: 404 });
  res.json(snapshot);
}));

/** DELETE /api/net-worth/:id */
netWorthRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id', status: 400 });
  }
  const deleted = await NetWorthSnapshot.findOneAndDelete({ _id: id, userId });
  if (!deleted) return res.status(404).json({ error: 'Snapshot not found', status: 404 });
  res.json({ success: true });
}));
