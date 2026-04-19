import { Router } from 'express';
import { prisma } from '../database.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validate.js';
import {
  chatWindowCreateSchema,
  chatWindowUpdateSchema,
  chatWindowBatchSchema,
  type ChatWindowCreate,
  type ChatWindowUpdate,
  type SubTopicInput,
} from '../schemas.js';

export const chatWindowsRouter = Router();

function serializeBigInt<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  )) as T;
}

function buildSubTopicCreate(subTopics: SubTopicInput[] | undefined) {
  return (subTopics ?? []).map(st => ({
    id: st.id,
    title: st.title,
    messages: st.messages as never,
    createdAt: BigInt(st.createdAt),
    updatedAt: BigInt(st.updatedAt),
  }));
}

chatWindowsRouter.get('/', asyncHandler(async (_req, res) => {
  const windows = await prisma.chatWindow.findMany({
    include: { subTopics: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(serializeBigInt(windows));
}));

chatWindowsRouter.get('/:id', asyncHandler(async (req, res) => {
  const window = await prisma.chatWindow.findUnique({
    where: { id: String(req.params.id) },
    include: { subTopics: true },
  });
  if (!window) throw new HttpError(404, 'Not found');
  res.json(serializeBigInt(window));
}));

chatWindowsRouter.post('/', validateBody(chatWindowCreateSchema), asyncHandler(async (req, res) => {
  const body = req.body as ChatWindowCreate;
  const window = await prisma.chatWindow.create({
    data: {
      id: body.id,
      title: body.title,
      config: body.config as never,
      activeSubTopicId: body.activeSubTopicId,
      titleGenerated: body.titleGenerated ?? false,
      createdAt: BigInt(body.createdAt),
      updatedAt: BigInt(body.updatedAt),
      subTopics: { create: buildSubTopicCreate(body.subTopics) },
    },
    include: { subTopics: true },
  });
  res.status(201).json(serializeBigInt(window));
}));

async function upsertChatWindow(id: string, body: ChatWindowUpdate | ChatWindowCreate) {
  return prisma.$transaction(async (tx) => {
    await tx.subTopic.deleteMany({ where: { chatWindowId: id } });
    const updatedAt = BigInt(body.updatedAt ?? Date.now());
    const createdAt = 'createdAt' in body && body.createdAt ? BigInt(body.createdAt) : updatedAt;
    return tx.chatWindow.upsert({
      where: { id },
      update: {
        title: body.title,
        config: body.config as never,
        activeSubTopicId: body.activeSubTopicId,
        titleGenerated: body.titleGenerated ?? false,
        updatedAt,
        subTopics: { create: buildSubTopicCreate(body.subTopics) },
      },
      create: {
        id,
        title: body.title,
        config: body.config as never,
        activeSubTopicId: body.activeSubTopicId,
        titleGenerated: body.titleGenerated ?? false,
        createdAt,
        updatedAt,
        subTopics: { create: buildSubTopicCreate(body.subTopics) },
      },
      include: { subTopics: true },
    });
  });
}

chatWindowsRouter.put('/:id', validateBody(chatWindowUpdateSchema), asyncHandler(async (req, res) => {
  const window = await upsertChatWindow(String(req.params.id), req.body as ChatWindowUpdate);
  res.json(serializeBigInt(window));
}));

chatWindowsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.chatWindow.delete({ where: { id: String(req.params.id) } });
  res.json({ success: true });
}));

chatWindowsRouter.post('/batch', validateBody(chatWindowBatchSchema), asyncHandler(async (req, res) => {
  const { chatWindows } = req.body as { chatWindows: ChatWindowCreate[] };
  await prisma.$transaction(async (tx) => {
    for (const cw of chatWindows) {
      await tx.subTopic.deleteMany({ where: { chatWindowId: cw.id } });
      const updatedAt = BigInt(cw.updatedAt);
      const createdAt = BigInt(cw.createdAt);
      await tx.chatWindow.upsert({
        where: { id: cw.id },
        update: {
          title: cw.title,
          config: cw.config as never,
          activeSubTopicId: cw.activeSubTopicId,
          titleGenerated: cw.titleGenerated ?? false,
          updatedAt,
          subTopics: { create: buildSubTopicCreate(cw.subTopics) },
        },
        create: {
          id: cw.id,
          title: cw.title,
          config: cw.config as never,
          activeSubTopicId: cw.activeSubTopicId,
          titleGenerated: cw.titleGenerated ?? false,
          createdAt,
          updatedAt,
          subTopics: { create: buildSubTopicCreate(cw.subTopics) },
        },
      });
    }
  });
  res.json({ success: true, count: chatWindows.length });
}));
