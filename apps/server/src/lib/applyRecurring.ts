import { Recurring } from '../models/Recurring';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { currentMonthKey } from './dates';

export async function applyRecurringForUser(
  userId: string
): Promise<{ createdExpenses: number; createdIncome: number }> {
  const now = new Date();
  const month = currentMonthKey();
  const today = now.getDate();
  const todayDow = now.getDay(); // 0=Sun … 6=Sat

  // Week number within the month (1-5)
  const weekOfMonth = Math.ceil(today / 7);
  // Biweekly period: 1 = first half (days 1-14), 2 = second half (days 15-28)
  const biweeklyPeriod = today <= 14 ? 1 : 2;

  const rules = await Recurring.find({ userId, active: true });
  let createdExpenses = 0;
  let createdIncome = 0;

  for (const rule of rules) {
    const freq = rule.frequency ?? 'monthly';

    // Build the key that marks "already applied for this period"
    let periodKey: string;
    if (freq === 'weekly') {
      // If dayOfWeek is set, only fire on that day of the week
      if (rule.dayOfWeek != null && rule.dayOfWeek !== todayDow) continue;
      periodKey = `${month}-w${weekOfMonth}`;
    } else if (freq === 'biweekly') {
      // If dayOfWeek is set, only fire on that day of the week
      if (rule.dayOfWeek != null && rule.dayOfWeek !== todayDow) continue;
      periodKey = `${month}-bw${biweeklyPeriod}`;
    } else {
      periodKey = month;
      if (rule.dayOfMonth > today) continue; // monthly: not yet due
    }

    if (rule.lastApplied === periodKey) continue; // already applied this period

    if (rule.type === 'expense' && rule.bucketId) {
      // Dedup: don't insert if an identical recurring expense already exists this period
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const existing = await Expense.findOne({
        userId,
        bucketId: rule.bucketId,
        amount: rule.amount,
        note: rule.note || 'Recurring',
        date: { $gte: monthStart, $lt: monthEnd },
      });
      if (existing) {
        rule.lastApplied = periodKey;
        await rule.save();
        continue;
      }
      await Expense.create({
        userId,
        bucketId: rule.bucketId,
        amount: rule.amount,
        note: rule.note || 'Recurring',
        date: now,
      });
      createdExpenses++;
    } else if (rule.type === 'income') {
      await Income.create({
        userId,
        amount: rule.amount,
        source: rule.source || 'Recurring income',
        date: now,
      });
      createdIncome++;
    }

    rule.lastApplied = periodKey;
    await rule.save();
  }

  return { createdExpenses, createdIncome };
}
