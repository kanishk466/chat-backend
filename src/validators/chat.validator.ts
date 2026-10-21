// src/validators/chat.validator.ts
// Zod schemas for chat APIs.

import { z } from 'zod';

export const createChatSchema = z
  .object({
    userAId: z.string().uuid('userAId must be a valid UUID'),
    userBId: z.string().uuid('userBId must be a valid UUID'),
  })
  .refine((data) => data.userAId !== data.userBId, {
    message: 'userAId and userBId must be different users',
    path: ['userBId'],
  });

export const createGroupChatSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(100, 'Group name too long'),
  creatorId: z.string().uuid('creatorId must be a valid UUID'),
  memberIds: z
    .array(z.string().uuid('memberIds must contain valid UUIDs'))
    .min(2, 'At least 2 memberIds are required (plus creator)'),
});

export const chatParamsSchema = z.object({
  chatId: z.string().uuid('chatId must be a valid UUID'),
});
