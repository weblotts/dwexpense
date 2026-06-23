import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserDoc } from '../models/User';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { Recurring } from '../models/Recurring';
import { seedDefaultBuckets } from '../db';
import { signToken, signRefreshToken, verifyRefreshToken, requireAuth, AuthedRequest } from '../lib/auth';
import { asyncHandler } from '../lib/asyncHandler';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  User as UserDTO,
} from '@dwexpense/types';

export const authRouter = Router();

function toDTO(u: UserDoc): UserDTO {
  return {
    _id: u._id.toString(),
    email: u.email,
    name: u.name,
    monthlySalary: u.monthlySalary,
    savingsGoal: u.savingsGoal,
    theme: u.theme,
    currency: u.currency ?? 'USD',
    createdAt: u.createdAt.toISOString(),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/auth/register */
authRouter.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body as RegisterInput;

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required', status: 400 });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters', status: 400 });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists', status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: email.toLowerCase(), passwordHash, name: name || '' });

  // New users start with the predefined starter categories.
  await seedDefaultBuckets(user._id);

  const uid = user._id.toString();
  const body: AuthResponse = { token: signToken(uid), refreshToken: signRefreshToken(uid), user: toDTO(user) };
  res.status(201).json(body);
}));

/** POST /api/auth/login */
authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required', status: 400 });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password', status: 401 });
  }

  const uid = user._id.toString();
  const body: AuthResponse = { token: signToken(uid), refreshToken: signRefreshToken(uid), user: toDTO(user) };
  res.json(body);
}));

/** POST /api/auth/refresh — issue a new access token from a valid refresh token */
authRouter.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required', status: 400 });
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.uid);
    if (!user) return res.status(401).json({ error: 'User not found', status: 401 });
    const uid = user._id.toString();
    res.json({ token: signToken(uid), refreshToken: signRefreshToken(uid), user: toDTO(user) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token', status: 401 });
  }
}));

/** GET /api/auth/me */
authRouter.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById((req as AuthedRequest).userId);
  if (!user) return res.status(404).json({ error: 'User not found', status: 404 });
  res.json(toDTO(user));
}));

/** PATCH /api/auth/me → update name / monthlySalary / savingsGoal */
authRouter.patch('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateProfileInput;
  const update: UpdateProfileInput = {};
  if (typeof body.name === 'string') update.name = body.name.trim();
  if (typeof body.monthlySalary === 'number' && body.monthlySalary >= 0) {
    update.monthlySalary = body.monthlySalary;
  }
  if (typeof body.savingsGoal === 'number' && body.savingsGoal >= 0) {
    update.savingsGoal = body.savingsGoal;
  }
  if (body.theme === 'light' || body.theme === 'dark') update.theme = body.theme;
  if (typeof body.currency === 'string' && body.currency.length === 3) update.currency = body.currency.toUpperCase();

  const user = await User.findByIdAndUpdate((req as AuthedRequest).userId, update, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found', status: 404 });
  res.json(toDTO(user));
}));

/** PATCH /api/auth/me/password → change password (requires current password) */
authRouter.patch('/me/password', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required', status: 400 });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters', status: 400 });
  }
  const user = await User.findById((req as AuthedRequest).userId);
  if (!user) return res.status(404).json({ error: 'User not found', status: 404 });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: 'Current password is incorrect', status: 401 });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true });
}));

/** PATCH /api/auth/me/email → change email (requires password) */
authRouter.patch('/me/email', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { newEmail, password } = req.body as { newEmail: string; password: string };
  if (!newEmail || !password) {
    return res.status(400).json({ error: 'newEmail and password are required', status: 400 });
  }
  const EMAIL_RE2 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE2.test(newEmail)) {
    return res.status(400).json({ error: 'Invalid email address', status: 400 });
  }
  const user = await User.findById((req as AuthedRequest).userId);
  if (!user) return res.status(404).json({ error: 'User not found', status: 404 });
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Password is incorrect', status: 401 });
  }
  const taken = await User.findOne({ email: newEmail.toLowerCase() });
  if (taken) return res.status(409).json({ error: 'That email is already in use', status: 409 });
  user.email = newEmail.toLowerCase();
  await user.save();
  res.json(toDTO(user));
}));

/** DELETE /api/auth/me → delete account and all data (requires password) */
authRouter.delete('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body as { password: string };
  if (!password) return res.status(400).json({ error: 'password is required', status: 400 });
  const userId = (req as AuthedRequest).userId!;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found', status: 404 });
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Password is incorrect', status: 401 });
  }
  await Promise.all([
    Bucket.deleteMany({ userId }),
    Expense.deleteMany({ userId }),
    Income.deleteMany({ userId }),
    Recurring.deleteMany({ userId }),
    User.findByIdAndDelete(userId),
  ]);
  res.json({ success: true });
}));
