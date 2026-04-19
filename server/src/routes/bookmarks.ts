import { Router } from 'express';
import { prisma } from '../database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validate.js';
import { bookmarkCreateSchema, bookmarkBatchSchema, type BookmarkCreate } from '../schemas.js';

export const bookmarksRouter = Router();

function serializeBookmark<T extends { createdAt: bigint }>(b: T) {
  return { ...b, createdAt: Number(b.createdAt) };
}

bookmarksRouter.get('/', asyncHandler(async (_req, res) => {
  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(bookmarks.map(serializeBookmark));
}));

bookmarksRouter.post('/', validateBody(bookmarkCreateSchema), asyncHandler(async (req, res) => {
  const b = req.body as BookmarkCreate;
  const bookmark = await prisma.bookmark.create({
    data: {
      id: b.id,
      messageId: b.messageId,
      windowId: b.windowId,
      subTopicId: b.subTopicId,
      messagePreview: b.messagePreview,
      messageRole: b.messageRole,
      windowTitle: b.windowTitle,
      createdAt: BigInt(b.createdAt),
    },
  });
  res.status(201).json(serializeBookmark(bookmark));
}));

bookmarksRouter.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.bookmark.delete({ where: { id: String(req.params.id) } });
  res.json({ success: true });
}));

bookmarksRouter.delete('/', asyncHandler(async (_req, res) => {
  await prisma.bookmark.deleteMany({});
  res.json({ success: true });
}));

bookmarksRouter.get('/by-message/:messageId', asyncHandler(async (req, res) => {
  const bookmark = await prisma.bookmark.findFirst({
    where: { messageId: String(req.params.messageId) },
  });
  if (!bookmark) return res.json(null);
  res.json(serializeBookmark(bookmark));
}));

bookmarksRouter.post('/batch', validateBody(bookmarkBatchSchema), asyncHandler(async (req, res) => {
  const { bookmarks } = req.body as { bookmarks: BookmarkCreate[] };
  await prisma.$transaction(async (tx) => {
    await tx.bookmark.deleteMany({});
    for (const b of bookmarks) {
      await tx.bookmark.create({
        data: {
          id: b.id,
          messageId: b.messageId,
          windowId: b.windowId,
          subTopicId: b.subTopicId,
          messagePreview: b.messagePreview,
          messageRole: b.messageRole,
          windowTitle: b.windowTitle,
          createdAt: BigInt(b.createdAt),
        },
      });
    }
  });
  res.json({ success: true, count: bookmarks.length });
}));
