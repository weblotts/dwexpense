import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { User } from '../models/User';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { SavingsGoal } from '../models/SavingsGoal';
import { Recurring } from '../models/Recurring';
import { ShoppingList } from '../models/ShoppingList';
import { ShoppingItem } from '../models/ShoppingItem';
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
  const dayOfMonth = now.getDate();

  const [buckets, savingsGoals, recurringRules, spendAgg, prevSpendAgg, incomeAgg, prevIncomeAgg, recentExpenses, topExpenses, shoppingLists, shoppingItems, prevSpendSameDayAgg] = await Promise.all([
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
    ShoppingList.find({ userId }).lean(),
    ShoppingItem.find({ userId, checked: false }).lean(),
    // Prev month spend up to the same day-of-month (like-for-like comparison)
    Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { userId: oid, date: { $gte: prevStart, $lt: new Date(prevStart.getFullYear(), prevStart.getMonth(), dayOfMonth + 1) }, ...notDeleted } },
      { $group: { _id: '$bucketId', total: { $sum: '$amount' } } },
    ]),
  ]);

  const spentMap = new Map(spendAgg.map(s => [s._id.toString(), s.total]));
  const prevSpentMap = new Map(prevSpendAgg.map(s => [s._id.toString(), s.total]));
  const totalSpent = spendAgg.reduce((s, r) => s + r.total, 0);
  const prevTotalSpent = prevSpendAgg.reduce((s, r) => s + r.total, 0);
  const extraIncome = incomeAgg[0]?.total ?? 0;
  const prevExtraIncome = prevIncomeAgg[0]?.total ?? 0;
  const totalIncome = user.monthlySalary + extraIncome;

  const currency = user.currency ?? 'USD';
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;
  const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;


  // --- Smarter projection ---

  // 1. Recurring expenses still due this month (not yet past their day)
  const remainingRecurring = recurringRules
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => {
      if (r.frequency === 'monthly') {
        // Only count if the day hasn't passed yet
        return r.dayOfMonth > dayOfMonth ? sum + r.amount : sum;
      }
      if (r.frequency === 'weekly') {
        // Count how many occurrences of r.dayOfWeek remain in this month
        let occurrences = 0;
        for (let d = dayOfMonth + 1; d <= daysInMonth; d++) {
          const dow = new Date(now.getFullYear(), now.getMonth(), d).getDay();
          if (dow === (r.dayOfWeek ?? 0)) occurrences++;
        }
        return sum + r.amount * occurrences;
      }
      if (r.frequency === 'biweekly') {
        // Approximate: 1 remaining occurrence if the next biweekly date is still this month
        const nextDay = r.dayOfMonth > dayOfMonth ? r.dayOfMonth : r.dayOfMonth + 14;
        return nextDay <= daysInMonth ? sum + r.amount : sum;
      }
      return sum;
    }, 0);

  // 2. Shopping list committed spend (unchecked items with estimated prices)
  const shoppingCommitted = shoppingItems.reduce((sum, item) => {
    return sum + (item.estimatedPrice ?? 0) * item.quantity;
  }, 0);

  // 3. Pace-based discretionary spend for remaining days
  //    Use actual daily rate but exclude known committed costs already captured
  const dailyRate = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const paceSpendRemaining = dailyRate * daysLeft;

  // 4. Final projection = spent + remaining bills + shopping list + discretionary pace
  //    But cap discretionary at what's left after bills & shopping so we don't double-count
  const projectedSpend = totalSpent + remainingRecurring + shoppingCommitted + paceSpendRemaining;
  const projectedSavings = totalIncome - projectedSpend;
  const available = totalIncome - user.savingsGoal - totalSpent;
  const dailyBudgetRemaining = daysLeft > 0 && available > 0 ? available / daysLeft : 0;
  const onTrack = projectedSpend <= totalIncome - user.savingsGoal;

  // Shopping list summary grouped by list
  const shoppingListSummary = shoppingLists.map(list => {
    const items = shoppingItems.filter(i => i.listId.toString() === list._id.toString());
    const totalEstimated = items.reduce((s, i) => s + (i.estimatedPrice ?? 0) * i.quantity, 0);
    const itemsWithPrice = items.filter(i => i.estimatedPrice);
    const itemsWithoutPrice = items.filter(i => !i.estimatedPrice);
    return {
      listName: list.name,
      itemCount: items.length,
      totalEstimated,
      itemsWithPrice,
      itemsWithoutPrice,
      items,
    };
  }).filter(l => l.itemCount > 0);

  const prevSpentSameDayMap = new Map(prevSpendSameDayAgg.map(s => [s._id.toString(), s.total]));
  const prevTotalSameDay = prevSpendSameDayAgg.reduce((s, r) => s + r.total, 0);
  const sameDayDelta = prevTotalSameDay > 0 ? totalSpent - prevTotalSameDay : null;
  const sameDayDeltaPct = prevTotalSameDay > 0 ? (sameDayDelta! / prevTotalSameDay) * 100 : null;

  // Per-bucket summary with prev month comparison
  const bucketSummary = buckets.map(b => {
    const id = b._id.toString();
    const spent = spentMap.get(id) ?? 0;
    const prevSpent = prevSpentMap.get(id) ?? 0;
    const prevSpentSameDay = prevSpentSameDayMap.get(id) ?? 0;
    const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
    const trend = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;
    const sameDayTrend = prevSpentSameDay > 0 ? ((spent - prevSpentSameDay) / prevSpentSameDay) * 100 : null;
    const status = spent > b.monthlyLimit ? '🔴 OVER' : pct >= 80 ? '🟡 near limit' : '🟢 ok';
    return { name: b.name, limit: b.monthlyLimit, spent, prevSpent, prevSpentSameDay, remaining: b.monthlyLimit - spent, pct, trend, sameDayTrend, status };
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
- Spent so far (day ${dayOfMonth}): ${fmt(totalSpent)}
${prevTotalSameDay > 0
  ? `- At this same point last month (day ${dayOfMonth} of ${prevMonth}): ${fmt(prevTotalSameDay)} — you are ${sameDayDelta! >= 0 ? `${fmt(sameDayDelta!)} MORE (+${sameDayDeltaPct!.toFixed(1)}%)` : `${fmt(Math.abs(sameDayDelta!))} LESS (${sameDayDeltaPct!.toFixed(1)}%)`} than last month at this stage`
  : `- No prior month data for day-${dayOfMonth} comparison`}
- Last month final total: ${fmt(prevTotalSpent)}
- Projected month-end spend: ${fmt(projectedSpend)} → ${onTrack ? '✅ on track' : '⚠️ over budget pace'}
  - Already spent: ${fmt(totalSpent)}
  - Recurring bills still due this month: ${fmt(remainingRecurring)}
  - Shopping list (committed, unchecked items): ${fmt(shoppingCommitted)}${shoppingCommitted === 0 ? ' (no estimated prices set)' : ''}
  - Discretionary pace (daily rate × days left): ${fmt(paceSpendRemaining)}
- Projected savings: ${fmt(projectedSavings)}
- Available to spend (excl. savings goal): ${fmt(available)} (${fmt(dailyBudgetRemaining)}/day for ${daysLeft} days)
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

## Shopping Lists (unchecked items)
${shoppingListSummary.length === 0 ? '- No active shopping lists.' : shoppingListSummary.map(list => {
  const lines = [`**${list.listName}** — ${list.itemCount} item${list.itemCount !== 1 ? 's' : ''}, estimated total: ${list.totalEstimated > 0 ? fmt(list.totalEstimated) : 'unknown'}`];
  list.itemsWithPrice.forEach(i => {
    const b = buckets.find(bk => bk._id.toString() === i.bucketId?.toString());
    lines.push(`  • ${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}: ${fmt((i.estimatedPrice ?? 0) * i.quantity)}${b ? ` [${b.name}]` : ''}`);
  });
  if (list.itemsWithoutPrice.length > 0) {
    lines.push(`  • Also: ${list.itemsWithoutPrice.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')} (no price set)`);
  }
  return lines.join('\n');
}).join('\n\n')}
- Total committed across all lists: ${fmt(shoppingCommitted)}${shoppingCommitted === 0 ? ' — encourage the user to add estimated prices to get better projections' : ''}

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

## Strict Scope Rule
You ONLY answer questions directly related to DWExpense and the user's financial data within it: expenses, budgets, income, savings goals, recurring bills, shopping lists, and spending trends.

If the user asks about ANYTHING else — coding, general knowledge, recipes, current events, other apps, advice unrelated to their finances — respond with exactly:
"I can only help with your DWExpense finances. Try asking about your spending, budget, or savings goals."

Do not engage with, answer partially, or acknowledge off-topic requests in any other way.`;

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
