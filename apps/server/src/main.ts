import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { connectDb } from './db';
import { requireAuth } from './lib/auth';
import { authRouter } from './routes/auth';
import { bucketsRouter } from './routes/buckets';
import { expensesRouter } from './routes/expenses';
import { incomeRouter } from './routes/income';
import { recurringRouter } from './routes/recurring';
import { summaryRouter } from './routes/summary';
import migrateRouter from './routes/migrate';
import { exportRouter } from './routes/export';
import { savingsGoalsRouter } from './routes/savingsGoals';
import { netWorthRouter } from './routes/netWorth';
import { budgetTemplatesRouter } from './routes/budgetTemplates';
import { User } from './models/User';
import { applyRecurringForUser } from './lib/applyRecurring';

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/expense-tracker';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Public auth endpoints.
app.use('/api/auth', authRouter);

// Everything below requires a valid token and is scoped to the user.
app.use('/api/buckets', requireAuth, bucketsRouter);
app.use('/api/expenses', requireAuth, expensesRouter);
app.use('/api/income', requireAuth, incomeRouter);
app.use('/api/recurring', requireAuth, recurringRouter);
app.use('/api/summary', requireAuth, summaryRouter);
app.use('/api/migrate', requireAuth, migrateRouter);
app.use('/api/export', requireAuth, exportRouter);
app.use('/api/savings-goals', requireAuth, savingsGoalsRouter);
app.use('/api/net-worth', requireAuth, netWorthRouter);
app.use('/api/budget-templates', requireAuth, budgetTemplatesRouter);

// Consistent JSON error format.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[error]', message);
  res.status(500).json({ error: message, status: 500 });
});

/** Hourly cron: apply due recurring rules for all active users. */
function startRecurringCron() {
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] Running hourly recurring apply...');
    try {
      const users = await User.find({}, '_id').lean();
      let totalExpenses = 0;
      let totalIncome = 0;
      for (const user of users) {
        const { createdExpenses, createdIncome } = await applyRecurringForUser(String(user._id));
        totalExpenses += createdExpenses;
        totalIncome += createdIncome;
      }
      console.log(`[cron] Recurring apply complete — expenses created: ${totalExpenses}, income created: ${totalIncome}`);
    } catch (err) {
      console.error('[cron] Recurring apply error:', err);
    }
  });
}

async function start() {
  await connectDb(MONGO_URI);
  startRecurringCron();
  app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
