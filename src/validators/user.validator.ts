// src/validators/user.validator.ts
// Zod schemas for user APIs.

import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email').max(254),
  name: z.string().trim().min(1, 'name is required').max(80, 'name too long'),
  avatar: z.string().url('avatar must be a valid URL').optional(),
});
