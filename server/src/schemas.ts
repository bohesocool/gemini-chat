import { z } from 'zod';

const timestampSchema = z.union([z.number(), z.string()]).transform((v) => {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid timestamp');
  return n;
});

export const subTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  messages: z.unknown(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const chatWindowCreateSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  config: z.unknown(),
  activeSubTopicId: z.string(),
  titleGenerated: z.boolean().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  subTopics: z.array(subTopicSchema).optional().default([]),
});

export const chatWindowUpdateSchema = z.object({
  title: z.string(),
  config: z.unknown(),
  activeSubTopicId: z.string(),
  titleGenerated: z.boolean().optional(),
  updatedAt: timestampSchema.optional(),
  subTopics: z.array(subTopicSchema).optional().default([]),
});

export const chatWindowBatchSchema = z.object({
  chatWindows: z.array(chatWindowCreateSchema),
});

export const bookmarkCreateSchema = z.object({
  id: z.string().min(1),
  messageId: z.string().min(1),
  windowId: z.string().min(1),
  subTopicId: z.string().min(1),
  messagePreview: z.string(),
  messageRole: z.string(),
  windowTitle: z.string(),
  createdAt: timestampSchema,
});

export const bookmarkBatchSchema = z.object({
  bookmarks: z.array(bookmarkCreateSchema),
});

export const templateCreateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  systemInstruction: z.string(),
  isBuiltIn: z.boolean().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const templateUpdateSchema = z.object({
  name: z.string(),
  description: z.string(),
  systemInstruction: z.string(),
  updatedAt: timestampSchema.optional(),
});

export const templateBatchSchema = z.object({
  templates: z.array(templateCreateSchema),
});

export const imageCreateSchema = z.object({
  id: z.string().min(1),
  data: z.unknown(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
});

export const imageBatchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)),
});

export const migrateFromIndexedDBSchema = z.object({
  chatWindows: z.array(chatWindowCreateSchema).optional(),
  settings: z.unknown().optional(),
  modelConfigs: z.unknown().optional(),
  bookmarks: z.array(bookmarkCreateSchema).optional(),
  templates: z.array(templateCreateSchema).optional(),
  images: z.array(imageCreateSchema).optional(),
});

export const webdavConfigSchema = z.object({
  enabled: z.boolean().optional(),
  url: z.string().trim().optional(),
  username: z.string().trim().optional(),
  password: z.string().optional(),
  encryptionKey: z.string().optional(),
  syncInterval: z.number().int().min(10).max(86400).optional(),
  maxBackups: z.number().int().min(1).max(200).optional(),
});

export const webdavTestSchema = z.object({
  url: z.string().trim().min(1),
  username: z.string().trim(),
  password: z.string(),
  encryptionKey: z.string().optional(),
});

export type ChatWindowCreate = z.infer<typeof chatWindowCreateSchema>;
export type ChatWindowUpdate = z.infer<typeof chatWindowUpdateSchema>;
export type SubTopicInput = z.infer<typeof subTopicSchema>;
export type BookmarkCreate = z.infer<typeof bookmarkCreateSchema>;
export type TemplateCreate = z.infer<typeof templateCreateSchema>;
export type TemplateUpdate = z.infer<typeof templateUpdateSchema>;
export type ImageCreate = z.infer<typeof imageCreateSchema>;
export type MigrateFromIndexedDB = z.infer<typeof migrateFromIndexedDBSchema>;
export type WebDAVConfigInput = z.infer<typeof webdavConfigSchema>;
export type WebDAVTestInput = z.infer<typeof webdavTestSchema>;
