// src/services/chat.service.ts
// Chat business logic (Prisma / PostgreSQL queries).

import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { ChatResponse, MemberInfo } from '../types';

type ChatWithMembers = Prisma.ChatGetPayload<{
  include: { members: { include: { user: true } } };
}>;

export function toChatResponse(chat: ChatWithMembers): ChatResponse {
  const members: MemberInfo[] = chat.members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    role: m.role,
  }));

  return {
    chatId: chat.id,
    type: chat.type,
    name: chat.name,
    members,
    createdAt: chat.createdAt,
  };
}

const includeMembers = { members: { include: { user: true } } } as const;

async function findExistingDirectChat(
  tx: Prisma.TransactionClient,
  userAId: string,
  userBId: string
): Promise<ChatResponse | null> {
  const candidates = await tx.chat.findMany({
    where: {
      type: 'ONE_TO_ONE',
      AND: [
        { members: { some: { userId: userAId } } },
        { members: { some: { userId: userBId } } },
        // no third member allowed in a 1:1 chat
        { members: { every: { userId: { in: [userAId, userBId] } } } },
      ],
    },
    include: includeMembers,
  });

  const exact = candidates.find((chat) => chat.members.length === 2);
  return exact ? toChatResponse(exact) : null;
}

function isWriteConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === 'P2034' || err.code === 'P2028')
  );
}

/**
 * Duplicate prevention:
 * 1. Inside a SERIALIZABLE transaction, look for an existing 1:1 chat with exactly these two users.
 * 2. If found -> return it. If not -> create Chat + 2 ChatMembers atomically.
 * 3. Concurrent conflicting transactions are retried (write-conflict safe).
 */
export async function createOrGetChat(userAId: string, userBId: string): Promise<ChatResponse> {
  if (userAId === userBId) {
    throw new AppError(400, 'userAId and userBId must be different users');
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [userAId, userBId] } },
    select: { id: true },
  });
  if (users.length !== 2) {
    throw new AppError(404, 'One or both users not found');
  }

  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await findExistingDirectChat(tx, userAId, userBId);
          if (existing) return existing;

          const chat = await tx.chat.create({ data: { type: 'ONE_TO_ONE' } });
          await tx.chatMember.createMany({
            data: [
              { chatId: chat.id, userId: userAId, role: 'MEMBER' },
              { chatId: chat.id, userId: userBId, role: 'MEMBER' },
            ],
          });

          const created = await tx.chat.findUniqueOrThrow({
            where: { id: chat.id },
            include: includeMembers,
          });
          return toChatResponse(created);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 10_000,
        }
      );
    } catch (err) {
      // Retry only on transaction write-conflicts; rethrow everything else.
      if (!isWriteConflict(err) || attempt === MAX_ATTEMPTS) throw err;
    }
  }

  // Unreachable in practice - the loop always returns or throws.
  throw new AppError(500, 'Could not create chat due to concurrent writes, please retry');
}

export async function createGroupChat(
  name: string,
  creatorId: string,
  memberIds: string[]
): Promise<ChatResponse> {
  const uniqueMemberIds = Array.from(new Set(memberIds.filter((id) => id !== creatorId)));
  if (uniqueMemberIds.length < 2) {
    throw new AppError(400, 'Group requires at least 2 memberIds (excluding creator)');
  }

  const allIds = [creatorId, ...uniqueMemberIds];
  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true },
  });
  if (users.length !== allIds.length) {
    const found = new Set(users.map((u) => u.id));
    const missing = allIds.filter((id) => !found.has(id));
    throw new AppError(404, `User(s) not found: ${missing.join(', ')}`);
  }

  const chat = await prisma.$transaction(async (tx) => {
    const created = await tx.chat.create({ data: { type: 'GROUP', name } });
    await tx.chatMember.createMany({
      data: [
        { chatId: created.id, userId: creatorId, role: 'ADMIN' },
        ...uniqueMemberIds.map((userId) => ({
          chatId: created.id,
          userId,
          role: 'MEMBER' as const,
        })),
      ],
    });
    return tx.chat.findUniqueOrThrow({
      where: { id: created.id },
      include: includeMembers,
    });
  });

  return toChatResponse(chat);
}

export async function getUserChats(userId: string): Promise<ChatResponse[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new AppError(404, 'User not found');

  const chats = await prisma.chat.findMany({
    where: { members: { some: { userId } } },
    include: includeMembers,
    orderBy: { createdAt: 'desc' },
  });

  return chats.map(toChatResponse);
}

/** Returns true when the user belongs to the chat. */
export async function isMember(chatId: string, userId: string): Promise<boolean> {
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    select: { id: true },
  });
  return membership !== null;
}

/**
 * Throws 404 if the chat doesn't exist, 403 if the user is not a member.
 * Returns the chat (with members) when authorized - used by Firestore services
 * before any message/receipt/last-seen operation.
 */
export async function assertMember(chatId: string, userId: string): Promise<ChatResponse> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: includeMembers,
  });

  if (!chat) throw new AppError(404, 'Chat not found');
  if (!chat.members.some((m) => m.userId === userId)) {
    throw new AppError(403, 'User is not a member of this chat');
  }

  return toChatResponse(chat);
}
