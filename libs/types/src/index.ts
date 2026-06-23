/** Shared domain types used by both client and server. */

/* -------------------------------- Auth / User ------------------------------ */
export interface User {
  _id: string;
  email: string;
  name: string;
  monthlySalary: number;
  savingsGoal: number;
  theme?: 'light' | 'dark';
  currency?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  monthlySalary?: number;
  savingsGoal?: number;
  theme?: 'light' | 'dark';
  currency?: string;
}

/* --------------------------------- Buckets --------------------------------- */
export interface Bucket {
  _id: string;
  name: string;
  monthlyLimit: number;
  color: string;
  createdAt: string;
}

/** A bucket enriched with the current month's spend totals (GET /api/buckets). */
export interface BucketWithSpend extends Bucket {
  spent: number;
  remaining: number;
}

export interface CreateBucketInput {
  name: string;
  monthlyLimit?: number;
  color?: string;
}

export interface UpdateBucketInput {
  name?: string;
  monthlyLimit?: number;
  color?: string;
}

/* --------------------------------- Expenses -------------------------------- */
export interface Expense {
  _id: string;
  bucketId: string;
  amount: number;
  note?: string;
  date: string;
  createdAt: string;
  deletedAt?: string;
}

export interface CreateExpenseInput {
  bucketId: string;
  amount: number;
  note?: string;
  date?: string;
}

export interface ExpenseFilters {
  bucketId?: string;
  /** YYYY-MM */
  month?: string;
}

/* ---------------------------------- Income --------------------------------- */
export interface Income {
  _id: string;
  amount: number;
  source: string;
  date: string;
  createdAt: string;
}

export interface CreateIncomeInput {
  amount: number;
  source?: string;
  date?: string;
}

/* -------------------------------- Recurring -------------------------------- */
export type RecurringType = 'expense' | 'income';
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Recurring {
  _id: string;
  type: RecurringType;
  frequency: RecurringFrequency;
  amount: number;
  bucketId?: string;
  source?: string;
  note?: string;
  serviceName?: string;
  url?: string;
  /** Day of month (1-28) — used when frequency is monthly */
  dayOfMonth: number;
  /** Day of week (0=Sun … 5=Fri … 6=Sat) — used when frequency is weekly/biweekly */
  dayOfWeek?: number;
  active: boolean;
  lastApplied: string;
  createdAt: string;
  reminderDays?: number;
}

export interface CreateRecurringInput {
  type: RecurringType;
  frequency?: RecurringFrequency;
  amount: number;
  bucketId?: string;
  source?: string;
  note?: string;
  serviceName?: string;
  url?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  reminderDays?: number;
}

export interface UpdateRecurringInput {
  frequency?: RecurringFrequency;
  amount?: number;
  bucketId?: string;
  source?: string;
  note?: string;
  serviceName?: string;
  url?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  active?: boolean;
  reminderDays?: number;
}

/* ----------------------------- Summary / Insights -------------------------- */
export type AlertLevel = 'info' | 'warning' | 'danger';

export interface Alert {
  level: AlertLevel;
  message: string;
}

export interface DailySpend {
  day: number; // 1-31
  actual: number; // cumulative spend up to that day
  budget: number; // linear budget target for that day
}

export interface UpcomingBill {
  _id: string;
  serviceName?: string;
  note?: string;
  amount: number;
  dueDay: number;
  daysUntilDue: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  daysInMonth: number;
  dayOfMonth: number;

  salary: number;
  savingsGoal: number;
  extraIncome: number; // one-off + applied recurring income this month
  totalIncome: number; // salary + extraIncome

  totalAllocated: number; // sum of bucket monthly limits
  totalSpent: number; // sum of expenses this month
  unallocated: number; // salary - savingsGoal - totalAllocated
  available: number; // totalIncome - savingsGoal - totalSpent (money left to spend)

  projectedSpend: number; // pace projection for full month
  projectedSavings: number; // totalIncome - projectedSpend

  overAllocated: boolean; // savingsGoal + totalAllocated > salary
  onTrack: boolean; // projectedSpend <= totalAllocated (or income)

  topCategories: { name: string; color: string; spent: number }[];
  dailySpend: DailySpend[]; // cumulative daily spend vs linear budget pace
  prevMonthSpent: number;
  alerts: Alert[];
  upcomingBills: UpcomingBill[];
  spendingStreak: number; // consecutive weeks under weekly budget
}


/* ------------------------------ Savings Goals ------------------------------ */
export interface SavingsGoal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  deadline?: string;
  createdAt: string;
}

export interface CreateSavingsGoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  color?: string;
  deadline?: string;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  color?: string;
  deadline?: string;
}

/* ----------------------------- Net Worth ----------------------------------- */
export interface NetWorthEntry { label: string; amount: number }
export interface NetWorthSnapshot {
  _id: string
  date: string
  assets: NetWorthEntry[]
  liabilities: NetWorthEntry[]
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  createdAt: string
}
export interface CreateNetWorthInput {
  date?: string
  assets: NetWorthEntry[]
  liabilities: NetWorthEntry[]
}
export interface UpdateNetWorthInput {
  date?: string
  assets?: NetWorthEntry[]
  liabilities?: NetWorthEntry[]
}

/* --------------------------- Budget Templates ------------------------------ */
export interface BudgetTemplateCategory { name: string; monthlyLimit: number; color: string }
export interface BudgetTemplate {
  _id: string
  name: string
  categories: BudgetTemplateCategory[]
  createdAt: string
}
export interface CreateBudgetTemplateInput { name: string; categories: BudgetTemplateCategory[] }

/* ---------------------------- Split Transactions --------------------------- */
export interface SplitExpenseInput {
  splits: Array<{ bucketId: string; amount: number; note?: string }>;
  date?: string;
}

/* ----------------------------------- Misc ---------------------------------- */
export interface ApiError {
  error: string;
  status: number;
}
