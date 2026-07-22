import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ShoppingList } from '../models/ShoppingList';
import { ShoppingItem } from '../models/ShoppingItem';
import { Bucket } from '../models/Bucket';
import { Expense } from '../models/Expense';
import { asyncHandler } from '../lib/asyncHandler';
import { AuthedRequest } from '../lib/auth';
import type {
  CreateShoppingListInput,
  UpdateShoppingListInput,
  ConvertShoppingListInput,
  CreateShoppingItemInput,
  UpdateShoppingItemInput,
  CheckShoppingItemInput,
  ReorderShoppingItemsInput,
  ShoppingItemFrequency,
} from '@dwexpense/types';

export const shoppingRouter = Router();

const uid = (req: Request) => (req as AuthedRequest).userId!;

/** GET /api/shopping/lists */
shoppingRouter.get('/lists', asyncHandler(async (req: Request, res: Response) => {
  const lists = await ShoppingList.find({ userId: uid(req) }).sort({ pinned: -1, createdAt: -1 }).lean();
  res.json(lists);
}));

/** POST /api/shopping/lists */
shoppingRouter.post('/lists', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { name, bucketId } = req.body as CreateShoppingListInput;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required', status: 400 });
  }
  if (bucketId) {
    if (!mongoose.isValidObjectId(bucketId)) {
      return res.status(400).json({ error: 'Invalid bucketId', status: 400 });
    }
    const bucket = await Bucket.findOne({ _id: bucketId, userId }).lean();
    if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });
  }
  const list = await ShoppingList.create({ userId, name: name.trim(), bucketId: bucketId || undefined });
  res.status(201).json(list);
}));

/** PATCH /api/shopping/lists/:id — e.g. toggle pinned */
shoppingRouter.patch('/lists/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }
  const { pinned } = req.body as UpdateShoppingListInput;
  const update: Record<string, unknown> = {};
  if (pinned !== undefined) update.pinned = pinned;

  const list = await ShoppingList.findOneAndUpdate({ _id: id, userId }, update, { new: true });
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });
  res.json(list);
}));

/** POST /api/shopping/lists/:id/convert — log the whole list as one flat-price expense (one-time) */
shoppingRouter.post('/lists/:id/convert', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }

  const list = await ShoppingList.findOne({ _id: id, userId });
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });
  if (list.convertedExpenseId) {
    return res.status(409).json({ error: 'List has already been converted to an expense', status: 409 });
  }
  if (!list.bucketId) {
    return res.status(400).json({ error: 'List has no category to log the expense under', status: 400 });
  }

  const { amount, date } = req.body as ConvertShoppingListInput;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number', status: 400 });
  }

  const expenseDate = date
    ? (() => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d); })()
    : new Date();

  const expense = await Expense.create({
    userId,
    bucketId: list.bucketId,
    amount,
    note: list.name,
    date: expenseDate,
  });

  list.convertedExpenseId = expense._id;
  await list.save();

  res.status(201).json({ list, expense });
}));

/** POST /api/shopping/lists/:id/duplicate — copy a list and its items as a fresh, unconverted list */
shoppingRouter.post('/lists/:id/duplicate', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }

  const list = await ShoppingList.findOne({ _id: id, userId }).lean();
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });

  const items = await ShoppingItem.find({ listId: id, userId }).sort({ order: 1, createdAt: 1 }).lean();

  const newList = await ShoppingList.create({
    userId,
    name: `${list.name} (copy)`,
    bucketId: list.bucketId,
  });

  if (items.length > 0) {
    await ShoppingItem.insertMany(
      items.map((item) => ({
        userId,
        listId: newList._id,
        name: item.name,
        estimatedPrice: item.estimatedPrice,
        bucketId: item.bucketId,
        quantity: item.quantity,
        order: item.order,
        checked: false,
      }))
    );
  }

  res.status(201).json(newList);
}));

/** GET /api/shopping/frequency — how often each product name has been bought, across all lists */
shoppingRouter.get('/frequency', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);

  const rows = await ShoppingItem.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), checked: true } },
    {
      $group: {
        _id: { $toLower: '$name' },
        name: { $first: '$name' },
        timesBought: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalSpent: { $sum: { $multiply: [{ $ifNull: ['$estimatedPrice', 0] }, '$quantity'] } },
        lastBoughtAt: { $max: '$checkedAt' },
        bucketId: { $last: '$bucketId' },
      },
    },
    { $sort: { timesBought: -1, lastBoughtAt: -1 } },
  ]);

  const bucketIds = [...new Set(rows.map((r) => r.bucketId).filter(Boolean).map(String))];
  const buckets = await Bucket.find({ _id: { $in: bucketIds }, userId }).lean();
  const bucketMap = new Map(buckets.map((b) => [String(b._id), b]));

  const result: ShoppingItemFrequency[] = rows.map((r) => {
    const bucket = r.bucketId ? bucketMap.get(String(r.bucketId)) : undefined;
    return {
      name: r.name,
      timesBought: r.timesBought,
      totalQuantity: r.totalQuantity,
      totalSpent: r.totalSpent,
      lastBoughtAt: r.lastBoughtAt ?? undefined,
      bucketName: bucket?.name,
      bucketColor: bucket?.color,
    };
  });

  res.json(result);
}));

/** DELETE /api/shopping/lists/:id — also removes all items in the list */
shoppingRouter.delete('/lists/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }
  const list = await ShoppingList.findOneAndDelete({ _id: id, userId });
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });
  await ShoppingItem.deleteMany({ listId: id, userId });
  res.json({ success: true });
}));

/** GET /api/shopping/lists/:id/items */
shoppingRouter.get('/lists/:id/items', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }
  const list = await ShoppingList.findOne({ _id: id, userId }).lean();
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });

  const items = await ShoppingItem.find({ listId: id, userId }).sort({ order: 1, createdAt: 1 }).lean();
  res.json(items);
}));

/** PATCH /api/shopping/lists/:id/items/reorder — persist a new display order for items in a list */
shoppingRouter.patch('/lists/:id/items/reorder', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }

  const { itemIds } = req.body as ReorderShoppingItemsInput;
  if (!Array.isArray(itemIds) || itemIds.some((i) => !mongoose.isValidObjectId(i))) {
    return res.status(400).json({ error: 'itemIds must be an array of valid ids', status: 400 });
  }

  await Promise.all(
    itemIds.map((itemId, index) =>
      ShoppingItem.updateOne({ _id: itemId, listId: id, userId }, { order: index })
    )
  );

  const items = await ShoppingItem.find({ listId: id, userId }).sort({ order: 1, createdAt: 1 }).lean();
  res.json(items);
}));

/** POST /api/shopping/lists/:id/items */
shoppingRouter.post('/lists/:id/items', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid list id', status: 400 });
  }
  const list = await ShoppingList.findOne({ _id: id, userId }).lean();
  if (!list) return res.status(404).json({ error: 'List not found', status: 404 });

  const { name, estimatedPrice, bucketId, quantity } = req.body as CreateShoppingItemInput;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'name is required', status: 400 });
  }
  if (estimatedPrice !== undefined && (typeof estimatedPrice !== 'number' || estimatedPrice < 0)) {
    return res.status(400).json({ error: 'estimatedPrice must be a non-negative number', status: 400 });
  }
  if (bucketId) {
    if (!mongoose.isValidObjectId(bucketId)) {
      return res.status(400).json({ error: 'Invalid bucketId', status: 400 });
    }
    const bucket = await Bucket.findOne({ _id: bucketId, userId }).lean();
    if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });
  }

  const lastItem = await ShoppingItem.findOne({ listId: id, userId }).sort({ order: -1 }).lean();
  const item = await ShoppingItem.create({
    userId,
    listId: id,
    name: name.trim(),
    estimatedPrice,
    bucketId: bucketId || undefined,
    quantity: quantity ?? 1,
    order: (lastItem?.order ?? -1) + 1,
  });
  res.status(201).json(item);
}));

/** PATCH /api/shopping/items/:id */
shoppingRouter.patch('/items/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid item id', status: 400 });
  }
  const { name, estimatedPrice, bucketId, quantity } = req.body as UpdateShoppingItemInput;

  if (bucketId) {
    if (!mongoose.isValidObjectId(bucketId)) {
      return res.status(400).json({ error: 'Invalid bucketId', status: 400 });
    }
    const bucket = await Bucket.findOne({ _id: bucketId, userId }).lean();
    if (!bucket) return res.status(404).json({ error: 'Bucket not found', status: 404 });
  }

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name.trim();
  if (estimatedPrice !== undefined) update.estimatedPrice = estimatedPrice;
  if (bucketId !== undefined) update.bucketId = bucketId || null;
  if (quantity !== undefined) update.quantity = quantity;

  const item = await ShoppingItem.findOneAndUpdate({ _id: id, userId }, update, { new: true });
  if (!item) return res.status(404).json({ error: 'Item not found', status: 404 });
  res.json(item);
}));

/** DELETE /api/shopping/items/:id */
shoppingRouter.delete('/items/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid item id', status: 400 });
  }
  const item = await ShoppingItem.findOneAndDelete({ _id: id, userId });
  if (!item) return res.status(404).json({ error: 'Item not found', status: 404 });
  res.json({ success: true });
}));

/** POST /api/shopping/items/:id/check — toggle checked; optionally create an expense */
shoppingRouter.post('/items/:id/check', asyncHandler(async (req: Request, res: Response) => {
  const userId = uid(req);
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid item id', status: 400 });
  }

  const item = await ShoppingItem.findOne({ _id: id, userId });
  if (!item) return res.status(404).json({ error: 'Item not found', status: 404 });

  const nowChecking = !item.checked;
  item.checked = nowChecking;
  item.checkedAt = nowChecking ? new Date() : undefined;
  await item.save();

  let expense = null;
  if (nowChecking) {
    const { createExpense, amount, date } = req.body as CheckShoppingItemInput;
    const expenseAmount = amount ?? item.estimatedPrice;

    if (createExpense && item.bucketId && expenseAmount && expenseAmount > 0) {
      const bucket = await Bucket.findOne({ _id: item.bucketId, userId }).lean();
      if (bucket) {
        const expenseDate = date
          ? (() => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d); })()
          : new Date();
        expense = await Expense.create({
          userId,
          bucketId: item.bucketId,
          amount: expenseAmount * item.quantity,
          note: item.name,
          date: expenseDate,
        });
      }
    }
  }

  res.json({ item, expense });
}));
