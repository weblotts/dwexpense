import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { SavingsGoal } from '../models/SavingsGoal';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type { CreateSavingsGoalInput, UpdateSavingsGoalInput } from '@dwexpense/types';

export const savingsGoalsRouter = Router();

const uid = (req: Request) => (req as AuthedRequest).userId!;

/** GET /api/savings-goals → list user's goals */
savingsGoalsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const goals = await SavingsGoal.find({ userId: uid(req) }).sort({ createdAt: -1 }).lean();
  res.json(goals);
}));

/** POST /api/savings-goals → create a goal */
savingsGoalsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const body = req.body as CreateSavingsGoalInput;

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return res.status(400).json({ error: 'name is required', status: 400 });
  }
  if (typeof body.targetAmount !== 'number' || body.targetAmount <= 0) {
    return res.status(400).json({ error: 'targetAmount must be a positive number', status: 400 });
  }

  const goal = await SavingsGoal.create({
    userId,
    name: body.name.trim(),
    targetAmount: body.targetAmount,
    currentAmount: typeof body.currentAmount === 'number' ? body.currentAmount : 0,
    color: typeof body.color === 'string' ? body.color : '#3B82F6',
    deadline: body.deadline ?? undefined,
  });

  res.status(201).json(goal);
}));

/** PATCH /api/savings-goals/:id → update a goal */
savingsGoalsRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id', status: 400 });
  }

  const body = req.body as UpdateSavingsGoalInput;
  const update: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
  if (typeof body.targetAmount === 'number' && body.targetAmount > 0) update.targetAmount = body.targetAmount;
  if (typeof body.currentAmount === 'number' && body.currentAmount >= 0) update.currentAmount = body.currentAmount;
  if (typeof body.color === 'string') update.color = body.color;
  if (typeof body.deadline === 'string') update.deadline = body.deadline;

  const goal = await SavingsGoal.findOneAndUpdate({ _id: id, userId }, update, { new: true });
  if (!goal) return res.status(404).json({ error: 'Savings goal not found', status: 404 });
  res.json(goal);
}));

/** DELETE /api/savings-goals/:id */
savingsGoalsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id', status: 400 });
  }
  const deleted = await SavingsGoal.findOneAndDelete({ _id: id, userId });
  if (!deleted) return res.status(404).json({ error: 'Savings goal not found', status: 404 });
  res.json({ success: true });
}));
