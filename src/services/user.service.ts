// src/services/user.service.ts
// User management (Prisma / PostgreSQL).

import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { CreateUserRequest, UserResponse } from '../types';

function toUserResponse(user: {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: Date;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

export async function createUser(data: CreateUserRequest): Promise<UserResponse> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'A user with this email already exists');

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      avatar: data.avatar,
    },
  });

  return toUserResponse(user);
}
