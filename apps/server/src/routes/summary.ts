import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { Recurring } from '../models/Recurring';
import { monthRange, currentMonthKey, daysInMonth } from '../lib/dates';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type { Alert, DailySpend, MonthlySummary } from '@dwexpense/types';

export const summaryRouter = Router();

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

/** GET /api/summary?month=YYYY-MM → full budgeting overview for any month. */
summaryRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId!;
  const oid = new mongoose.Types.ObjectId(userId);

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found', status: 404 });

  const monthParam = typeof req.query.month === 'string' ? req.query.month : undefined;
  const { start, end } = monthRange(monthParam);
  // Use the requested month's midpoint as "now" for projections/alerts on past months
  const now = monthParam ? new Date(start.getFullYear(), start.getMonth(), 15) : new Date();
  const prev = monthRange(currentMonthKey(new Date(start.getFullYear(), start.getMonth() - 1, 1)));

  const buckets = await Bucket.find({ userId }).lean();
  const totalAllocated = buckets.reduce((s, b) => s + b.monthlyLimit, 0);

  const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };

  // Spend per bucket this month.
  const spendAgg = await Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
    { $match: { userId: oid, date: { $gte: start, $lt: end }, ...notDeleted } },
    { $group: { _id: '$bucketId', total: { $sum: '$amount' } } },
  ]);
  const spentMap = new Map(spendAgg.map((s) => [s._id.toString(), s.total]));
  const totalSpent = spendAgg.reduce((s, r) => s + r.total, 0);

  // Previous month total spend (for comparison).
  const prevAgg = await Expense.aggregate<{ total: number }>([
    { $match: { userId: oid, date: { $gte: prev.start, $lt: prev.end }, ...notDeleted } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const prevMonthSpent = prevAgg[0]?.total ?? 0;

  // Extra income recorded this month (one-off + applied recurring).
  const incomeAgg = await Income.aggregate<{ total: number }>([
    { $match: { userId: oid, date: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const extraIncome = incomeAgg[0]?.total ?? 0;

  const salary = user.monthlySalary;
  const savingsGoal = user.savingsGoal;
  const totalIncome = salary + extraIncome;
  const unallocated = salary - savingsGoal - totalAllocated;
  const available = totalIncome - savingsGoal - totalSpent;

  // Spend-pace projection for the full month.
  const dim = daysInMonth(now);
  const dayOfMonth = now.getDate();
  const projectedSpend = dayOfMonth > 0 ? (totalSpent / dayOfMonth) * dim : totalSpent;
  const projectedSavings = totalIncome - projectedSpend;

  const overAllocated = savingsGoal + totalAllocated > salary && salary > 0;
  const onTrack = totalIncome > 0 ? projectedSpend <= totalIncome - savingsGoal : true;

  // Daily cumulative spend vs linear budget target.
  const dailyAgg = await Expense.aggregate<{ _id: number; dayTotal: number }>([
    { $match: { userId: oid, date: { $gte: start, $lt: end }, ...notDeleted } },
    { $group: { _id: { $dayOfMonth: '$date' }, dayTotal: { $sum: '$amount' } } },
  ]);
  const dayMap = new Map(dailyAgg.map((d) => [d._id, d.dayTotal]));
  const budgetPerDay = totalAllocated > 0 ? totalAllocated / dim : (totalIncome - savingsGoal) / dim;
  let cumulative = 0;
  const dailySpend: DailySpend[] = [];
  for (let d = 1; d <= dayOfMonth; d++) {
    cumulative += dayMap.get(d) ?? 0;
    dailySpend.push({ day: d, actual: Math.round(cumulative * 100) / 100, budget: Math.round(budgetPerDay * d * 100) / 100 });
  }

  // Top categories by spend.
  const topCategories = buckets
    .map((b) => ({ name: b.name, color: b.color, spent: spentMap.get(b._id.toString()) ?? 0 }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Build alerts.
  const alerts: Alert[] = [];
  if (salary === 0) {
    alerts.push({ level: 'info', message: 'Set your monthly salary in Settings to unlock budgeting insights.' });
  }
  if (overAllocated) {
    alerts.push({
      level: 'warning',
      message: `Your category limits + savings (${money(totalAllocated + savingsGoal)}) exceed your salary (${money(salary)}).`,
    });
  }
  for (const b of buckets) {
    const spent = spentMap.get(b._id.toString()) ?? 0;
    if (b.monthlyLimit > 0 && spent > b.monthlyLimit) {
      alerts.push({ level: 'danger', message: `${b.name} is over budget by ${money(spent - b.monthlyLimit)}.` });
    }
  }
  if (totalIncome > 0 && !onTrack) {
    alerts.push({
      level: 'warning',
      message: `At this pace you'll spend ${money(projectedSpend)} this month — more than your income minus savings.`,
    });
  }
  if (available < 0) {
    alerts.push({ level: 'danger', message: `You've spent ${money(-available)} beyond your income and savings goal.` });
  }

  // --- Upcoming bills (bill reminder) ---
  const today = new Date();
  const todayDay = today.getDate();
  const activeRecurringExpenses = await Recurring.find({
    userId,
    type: 'expense',
    active: true,
    reminderDays: { $gt: 0 },
  }).lean();

  const upcomingBills = activeRecurringExpenses
    .map((r) => {
      const dueDay = r.dayOfMonth;
      // Days until due this month; if already past, wrap to next month
      let daysUntilDue = dueDay - todayDay;
      if (daysUntilDue < 0) {
        // Use days remaining in month + dueDay for next month wrap
        const daysInThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        daysUntilDue = daysInThisMonth - todayDay + dueDay;
      }
      return { r, daysUntilDue };
    })
    .filter(({ r, daysUntilDue }) => daysUntilDue >= 0 && daysUntilDue <= (r.reminderDays ?? 0))
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .map(({ r, daysUntilDue }) => ({
      _id: r._id.toString(),
      serviceName: r.serviceName,
      note: r.note,
      amount: r.amount,
      dueDay: r.dayOfMonth,
      daysUntilDue,
    }));

  // --- Spending streak (consecutive weeks under budget) ---
  // Single aggregation over last 13 weeks grouped by ISO week number
  const weeklyBudget =
    (totalAllocated > 0 ? totalAllocated : totalIncome - savingsGoal) / 4.33;

  let spendingStreak = 0;
  if (weeklyBudget > 0) {
    const thirteenWeeksAgo = new Date(today.getTime() - 13 * 7 * 86400000);
    const weeklyAgg = await Expense.aggregate<{ _id: { year: number; week: number }; total: number }>([
      { $match: { userId: oid, date: { $gte: thirteenWeeksAgo }, ...notDeleted } },
      { $group: { _id: { year: { $isoWeekYear: '$date' }, week: { $isoWeek: '$date' } }, total: { $sum: '$amount' } } },
    ]);
    // Build a map of "year-week" -> total
    const weekMap = new Map(weeklyAgg.map((w) => [`${w._id.year}-${w._id.week}`, w.total]));
    // Walk backwards from current ISO week
    const MS_PER_WEEK = 7 * 86400000;
    for (let w = 0; w < 13; w++) {
      const d = new Date(today.getTime() - w * MS_PER_WEEK);
      // Get ISO week year and week number
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const isoYear = d.getFullYear();
      const startOfYear = new Date(jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000);
      const isoWeek = Math.ceil((d.getTime() - startOfYear.getTime()) / MS_PER_WEEK) + 1;
      const key = `${isoYear}-${isoWeek}`;
      const weekTotal = weekMap.get(key) ?? 0;
      if (weekTotal === 0 && w > 0) break;
      if (weekTotal <= weeklyBudget) spendingStreak++;
      else break;
    }
  }

  const summary: MonthlySummary = {
    month: monthParam ?? currentMonthKey(now),
    daysInMonth: dim,
    dayOfMonth,
    salary,
    savingsGoal,
    extraIncome,
    totalIncome,
    totalAllocated,
    totalSpent,
    unallocated,
    available,
    projectedSpend: Math.round(projectedSpend * 100) / 100,
    projectedSavings: Math.round(projectedSavings * 100) / 100,
    overAllocated,
    onTrack,
    topCategories,
    dailySpend,
    prevMonthSpent,
    alerts,
    upcomingBills,
    spendingStreak,
  };

  res.json(summary);
}));

/** GET /api/summary/top-items?month=YYYY-MM → top 10 individual expenses for the month. */
summaryRouter.get('/top-items', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId!;
  const oid = new mongoose.Types.ObjectId(userId);
  const monthParam = typeof req.query.month === 'string' ? req.query.month : undefined;
  const { start, end } = monthRange(monthParam);
  const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };

  const items = await Expense.aggregate<{
    _id: mongoose.Types.ObjectId;
    amount: number;
    note: string;
    date: Date;
    bucketName: string;
    bucketColor: string;
  }>([
    { $match: { userId: oid, date: { $gte: start, $lt: end }, ...notDeleted } },
    { $sort: { amount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'buckets',
        localField: 'bucketId',
        foreignField: '_id',
        as: 'bucket',
      },
    },
    { $unwind: { path: '$bucket', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        amount: 1,
        note: 1,
        date: 1,
        bucketName: '$bucket.name',
        bucketColor: '$bucket.color',
      },
    },
  ]);

  res.json(items);
}));

/** GET /api/summary/months → list of YYYY-MM strings that have expense or income data. */
summaryRouter.get('/months', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId!;
  const oid = new mongoose.Types.ObjectId(userId);

  const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };

  const [expenseDates, incomeDates] = await Promise.all([
    Expense.aggregate<{ _id: string }>([
      { $match: { userId: oid, ...notDeleted } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } } } },
    ]),
    Income.aggregate<{ _id: string }>([
      { $match: { userId: oid } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } } } },
    ]),
  ]);

  const months = [...new Set([...expenseDates, ...incomeDates].map((r) => r._id))]
    .sort()
    .reverse();

  // Always include current month even if empty
  const current = currentMonthKey(new Date());
  if (!months.includes(current)) months.unshift(current);

  res.json(months);
}));
