import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Recurring } from '../models/Recurring';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';

const router = Router();

/**
 * POST /api/migrate/subscriptions
 * One-time migration: reads old Subscription documents and creates
 * equivalent Recurring expense rules, then removes the originals.
 */
router.post(
  '/subscriptions',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).userId!;
    const oid = new mongoose.Types.ObjectId(userId);

    // Read directly from the raw collection — model is deleted
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: 'No DB connection' });

    const subs = await db.collection('subscriptions').find({ userId: oid }).toArray();

    if (subs.length === 0) {
      return res.json({ migrated: 0, message: 'No subscriptions found to migrate' });
    }

    let migrated = 0;
    for (const sub of subs) {
      // Convert billing cycle to a monthly-equivalent amount
      let monthlyAmount = sub.amount;
      if (sub.billingCycle === 'yearly') monthlyAmount = sub.amount / 12;
      if (sub.billingCycle === 'weekly') monthlyAmount = sub.amount * 4.33;

      // Extract day from nextRenewal date
      const renewalDate = sub.nextRenewal ? new Date(sub.nextRenewal) : new Date();
      const dayOfMonth = Math.min(28, Math.max(1, renewalDate.getDate()));

      // Only migrate active/paused — skip cancelled
      if (sub.status === 'cancelled') continue;

      await Recurring.create({
        userId: oid,
        type: 'expense',
        amount: Math.round(monthlyAmount * 100) / 100,
        bucketId: sub.bucketId || undefined,
        serviceName: sub.name,
        url: sub.url || undefined,
        note: sub.note || undefined,
        dayOfMonth,
        active: sub.status !== 'paused',
        lastApplied: '',
      });
      migrated++;
    }

    // Remove migrated docs
    await db.collection('subscriptions').deleteMany({ userId: oid });

    res.json({ migrated, message: `Migrated ${migrated} subscription(s) to recurring rules` });
  })
);

export default router;
