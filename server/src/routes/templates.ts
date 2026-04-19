import { Router } from 'express';
import { prisma } from '../database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validate.js';
import {
  templateCreateSchema,
  templateUpdateSchema,
  templateBatchSchema,
  type TemplateCreate,
  type TemplateUpdate,
} from '../schemas.js';

export const templatesRouter = Router();

function serializeTemplate<T extends { createdAt: bigint; updatedAt: bigint }>(t: T) {
  return { ...t, createdAt: Number(t.createdAt), updatedAt: Number(t.updatedAt) };
}

templatesRouter.get('/', asyncHandler(async (_req, res) => {
  const templates = await prisma.template.findMany({
    orderBy: { updatedAt: 'desc' },
  });
  res.json(templates.map(serializeTemplate));
}));

templatesRouter.post('/', validateBody(templateCreateSchema), asyncHandler(async (req, res) => {
  const t = req.body as TemplateCreate;
  const template = await prisma.template.create({
    data: {
      id: t.id,
      name: t.name,
      description: t.description,
      systemInstruction: t.systemInstruction,
      isBuiltIn: t.isBuiltIn ?? false,
      createdAt: BigInt(t.createdAt),
      updatedAt: BigInt(t.updatedAt),
    },
  });
  res.status(201).json(serializeTemplate(template));
}));

templatesRouter.put('/:id', validateBody(templateUpdateSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const t = req.body as TemplateUpdate;
  const now = BigInt(t.updatedAt ?? Date.now());
  const template = await prisma.template.upsert({
    where: { id },
    update: {
      name: t.name,
      description: t.description,
      systemInstruction: t.systemInstruction,
      updatedAt: now,
    },
    create: {
      id,
      name: t.name,
      description: t.description,
      systemInstruction: t.systemInstruction,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    },
  });
  res.json(serializeTemplate(template));
}));

templatesRouter.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.template.delete({ where: { id: String(req.params.id) } });
  res.json({ success: true });
}));

templatesRouter.delete('/', asyncHandler(async (_req, res) => {
  await prisma.template.deleteMany({});
  res.json({ success: true });
}));

templatesRouter.post('/batch', validateBody(templateBatchSchema), asyncHandler(async (req, res) => {
  const { templates } = req.body as { templates: TemplateCreate[] };
  await prisma.$transaction(async (tx) => {
    await tx.template.deleteMany({});
    for (const t of templates) {
      await tx.template.create({
        data: {
          id: t.id,
          name: t.name,
          description: t.description,
          systemInstruction: t.systemInstruction,
          isBuiltIn: t.isBuiltIn ?? false,
          createdAt: BigInt(t.createdAt),
          updatedAt: BigInt(t.updatedAt),
        },
      });
    }
  });
  res.json({ success: true, count: templates.length });
}));
