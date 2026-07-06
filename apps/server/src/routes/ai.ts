import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { User } from '../models/User';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { SavingsGoal } from '../models/SavingsGoal';
import { Recurring } from '../models/Recurring';
import { monthRange, currentMonthKey } from '../lib/dates';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';

export const aiRouter = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** POST /api/ai/chat — streaming chat with financial context */
aiRouter.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId!;
  const oid = new mongoose.Types.ObjectId(userId);
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required', status: 400 });
  }

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: 'User not found', status: 404 });

  const now = new Date();
  const thisMonthKey = currentMonthKey(now);
  const prevMonthKey = currentMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const { start, end } = monthRange(thisMonthKey);
  const { start: prevStart, end: prevEnd } = monthRange(prevMonthKey);
  const notDeleted = { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };

  const [buckets, savingsGoals, recurringRules, spendAgg, prevSpendAgg, incomeAgg, prevIncomeAgg, recentExpenses, topExpenses] = await Promise.all([
    Bucket.find({ userId }).lean(),
    SavingsGoal.find({ userId }).lean(),
    Recurring.find({ userId, active: true }).lean(),
    // This month spend per bucket
    Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { userId: oid, date: { $gte: start, $lt: end }, ...notDeleted } },
      { $group: { _id: '$bucketId', total: { $sum: '$amount' } } },
    ]),
    // Prev month spend per bucket (for comparison)
    Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { userId: oid, date: { $gte: prevStart, $lt: prevEnd }, ...notDeleted } },
      { $group: { _id: '$bucketId', total: { $sum: '$amount' } } },
    ]),
    // This month income
    Income.aggregate<{ total: number }>([
      { $match: { userId: oid, date: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Prev month income
    Income.aggregate<{ total: number }>([
      { $match: { userId: oid, date: { $gte: prevStart, $lt: prevEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    // Recent 15 expenses with notes
    Expense.find({ userId: oid, date: { $gte: start, $lt: end }, ...notDeleted })
      .sort({ date: -1 })
      .limit(15)
      .lean(),
    // Top 5 biggest expenses this month
    Expense.find({ userId: oid, date: { $gte: start, $lt: end }, ...notDeleted })
      .sort({ amount: -1 })
      .limit(5)
      .lean(),
  ]);

  const spentMap = new Map(spendAgg.map(s => [s._id.toString(), s.total]));
  const prevSpentMap = new Map(prevSpendAgg.map(s => [s._id.toString(), s.total]));
  const totalSpent = spendAgg.reduce((s, r) => s + r.total, 0);
  const prevTotalSpent = prevSpendAgg.reduce((s, r) => s + r.total, 0);
  const extraIncome = incomeAgg[0]?.total ?? 0;
  const prevExtraIncome = prevIncomeAgg[0]?.total ?? 0;
  const totalIncome = user.monthlySalary + extraIncome;
  const prevTotalIncome = user.monthlySalary + prevExtraIncome;

  const currency = user.currency ?? 'USD';
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;
  const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const projectedSpend = dayOfMonth > 0 ? (totalSpent / dayOfMonth) * daysInMonth : totalSpent;
  const projectedSavings = totalIncome - projectedSpend;
  const available = totalIncome - user.savingsGoal - totalSpent;
  const dailyBudgetRemaining = daysLeft > 0 && available > 0 ? available / daysLeft : 0;
  const spendVsPrev = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;
  const onTrack = projectedSpend <= totalIncome - user.savingsGoal;

  // Per-bucket summary with prev month comparison
  const bucketSummary = buckets.map(b => {
    const id = b._id.toString();
    const spent = spentMap.get(id) ?? 0;
    const prevSpent = prevSpentMap.get(id) ?? 0;
    const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
    const trend = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;
    const status = spent > b.monthlyLimit ? '🔴 OVER' : pct >= 80 ? '🟡 near limit' : '🟢 ok';
    return { name: b.name, limit: b.monthlyLimit, spent, prevSpent, remaining: b.monthlyLimit - spent, pct, trend, status };
  });

  // Upcoming recurring expenses within next 7 days
  const upcomingBills = recurringRules
    .filter(r => r.type === 'expense')
    .map(r => {
      let daysUntil = r.dayOfMonth - dayOfMonth;
      if (daysUntil < 0) daysUntil += daysInMonth;
      return { name: r.serviceName ?? r.note ?? 'Bill', amount: r.amount, daysUntil, frequency: r.frequency };
    })
    .filter(b => b.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Recurring income summary
  const recurringIncome = recurringRules
    .filter(r => r.type === 'income')
    .map(r => ({ name: r.source ?? 'Income', amount: r.amount, frequency: r.frequency }));

  // Savings goal projections
  const savingsGoalSummary = savingsGoals.map(g => {
    const remaining = g.targetAmount - g.currentAmount;
    const monthsNeeded = remaining > 0 && user.savingsGoal > 0
      ? Math.ceil(remaining / user.savingsGoal)
      : null;
    const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
    const deadline = g.deadline ? new Date(g.deadline) : null;
    const monthsToDeadline = deadline
      ? Math.round((deadline.getTime() - now.getTime()) / (30 * 24 * 3600 * 1000))
      : null;
    const onTrackForGoal = monthsNeeded !== null && monthsToDeadline !== null
      ? monthsNeeded <= monthsToDeadline
      : null;
    return { name: g.name, current: g.currentAmount, target: g.targetAmount, remaining, pct, monthsNeeded, monthsToDeadline, onTrackForGoal };
  });

  const systemPrompt = `You are a smart, empathetic personal finance assistant built into DWExpense — a budgeting and savings app. Your job is to give the user clear, specific, actionable financial guidance based on their real data below.

## Tone & Format Rules
- Be direct and specific — reference actual numbers from the data, never vague advice
- Use short paragraphs or bullet points, never walls of text
- Lead with the most important insight first
- If something is good, say so with genuine encouragement
- If something needs attention, be clear but not alarmist
- For lists of 3+ items, use bullet points
- Keep responses under 200 words unless the user explicitly asks for detail
- Never say "I don't have access to your data" — you do, it's all below

## User Profile
- Name: ${user.name || 'User'}
- Currency: ${currency}
- Month: ${month} (Day ${dayOfMonth} of ${daysInMonth}, ${daysLeft} days left)

## This Month at a Glance
- Salary: ${fmt(user.monthlySalary)}${extraIncome > 0 ? ` + ${fmt(extraIncome)} extra = ${fmt(totalIncome)} total` : ''}
- Savings goal: ${fmt(user.savingsGoal)}/month
- Spent so far: ${fmt(totalSpent)} (${prevTotalSpent > 0 ? `${spendVsPrev >= 0 ? '+' : ''}${spendVsPrev.toFixed(1)}% vs ${prevMonth}` : 'no prior month data'})
- Projected month-end spend: ${fmt(projectedSpend)} → ${onTrack ? '✅ on track' : '⚠️ over budget pace'}
- Projected savings: ${fmt(projectedSavings)}
- Available to spend: ${fmt(available)} (${fmt(dailyBudgetRemaining)}/day for ${daysLeft} days)
- Previous month total spend: ${fmt(prevTotalSpent)}

## Budget Categories (this month vs last month)
${bucketSummary.map(b =>
  `- ${b.status} ${b.name}: ${fmt(b.spent)} / ${fmt(b.limit)} (${b.pct.toFixed(0)}% used, ${fmt(b.remaining)} left)${b.trend !== null ? ` — ${b.trend >= 0 ? '+' : ''}${b.trend.toFixed(0)}% vs last month` : ''}`
).join('\n')}

## Savings Goals
${savingsGoalSummary.length === 0 ? '- No savings goals set.' : savingsGoalSummary.map(g => {
  const deadline = g.monthsToDeadline !== null ? `, ${g.monthsToDeadline} months to deadline` : '';
  const projection = g.monthsNeeded !== null ? `, ~${g.monthsNeeded} months to reach at current savings rate` : '';
  const trackStatus = g.onTrackForGoal === true ? ' ✅' : g.onTrackForGoal === false ? ' ⚠️ behind' : '';
  return `- ${g.name}: ${fmt(g.current)} / ${fmt(g.target)} (${g.pct.toFixed(1)}%${projection}${deadline}${trackStatus})`;
}).join('\n')}

## Recurring Bills (active)
${recurringRules.filter(r => r.type === 'expense').length === 0 ? '- None set.' :
  recurringRules.filter(r => r.type === 'expense').map(r =>
    `- ${r.serviceName ?? r.note ?? 'Bill'}: ${fmt(r.amount)} ${r.frequency} (day ${r.dayOfMonth})`
  ).join('\n')}

## Recurring Income
${recurringIncome.length === 0 ? '- None set.' : recurringIncome.map(r => `- ${r.name}: ${fmt(r.amount)} ${r.frequency}`).join('\n')}

${upcomingBills.length > 0 ? `## ⚠️ Bills Due in Next 7 Days\n${upcomingBills.map(b => `- ${b.name}: ${fmt(b.amount)} in ${b.daysUntil === 0 ? 'TODAY' : `${b.daysUntil} day${b.daysUntil !== 1 ? 's' : ''}`}`).join('\n')}` : ''}

## Biggest Expenses This Month
${topExpenses.map(e => {
  const b = buckets.find(bk => bk._id.toString() === e.bucketId?.toString());
  return `- ${fmt(e.amount)}${e.note ? ` — ${e.note}` : ''}${b ? ` [${b.name}]` : ''} on ${new Date(e.date).toLocaleDateString()}`;
}).join('\n')}

## Recent Transactions (last 15)
${recentExpenses.map(e => {
  const b = buckets.find(bk => bk._id.toString() === e.bucketId?.toString());
  return `- ${new Date(e.date).toLocaleDateString()}: ${fmt(e.amount)}${e.note ? ` — ${e.note}` : ''}${b ? ` [${b.name}]` : ''}`;
}).join('\n')}

If the user asks something outside personal finance, politely redirect them back to budgeting and savings topics.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
}));
