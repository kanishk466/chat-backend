// src/validators/message.validator.ts
// Zod schemas for message / read-receipt / last-seen APIs.

import { z } from 'zod';

export const uuid = z.string().uuid();

export const messageParamsSchema = z.object({
  chatId: z.string().uuid('chatId must be a valid UUID'),
  messageId: z.string().min(1, 'messageId is required'),
});

export const chatParamsSchema = z.object({
  chatId: z.string().uuid('chatId must be a valid UUID'),
});

export const userParamsSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

export const sendMessageSchema = z.object({
  senderId: uuid,
  text: z.string().trim().min(1, 'text must not be empty').max(4000, 'text too long (max 4000)'),
});

export const markReadSchema = z.object({
  userId: uuid,
});

export const lastSeenSchema = z.object({
  userId: uuid,
  messageId: z.string().min(1, 'messageId is required'),
});

export const editMessageSchema = z.object({
  userId: uuid,
  text: z.string().trim().min(1, 'text must not be empty').max(4000, 'text too long (max 4000)'),
});

export const deleteMessageSchema = z.object({
  userId: uuid,
});

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
  userId: uuid.optional(), // when provided, membership is enforced
});

export const optionalUserQuerySchema = z.object({
  userId: uuid.optional(),
});

export const userQuerySchema = z.object({
  userId: uuid,
});
