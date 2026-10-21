// src/services/lastSeen.service.ts
// Firestore last-seen tracking under chats/{chatId}/lastSeen/{userId}.

import { FieldValue, Timestamp } from '@google-cloud/firestore';
import { db } from '../config/firebase';
import { AppError } from '../utils/AppError';
import { assertMember } from './chat.service';
import { LastSeenResponse } from '../types';

const lastSeenDoc = (chatId: string, userId: string) =>
  db.collection('chats').doc(chatId).collection('lastSeen').doc(userId);

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

/** Merge-upserts the user's last read message pointer for the chat. */
export async function updateLastSeen(
  chatId: string,
  userId: string,
  messageId: string
): Promise<LastSeenResponse> {
  await assertMember(chatId, userId);

  const msgSnap = await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .doc(messageId)
    .get();
  if (!msgSnap.exists) throw new AppError(404, 'Message not found');

  await lastSeenDoc(chatId, userId).set(
    {
      userId,
      lastSeenMessageId: messageId,
      seenAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { userId, lastSeenMessageId: messageId, seenAt: new Date() };
}

/** Returns null when the user has never opened the chat. */
export async function getLastSeen(
  chatId: string,
  userId: string
): Promise<LastSeenResponse | null> {
  await assertMember(chatId, userId);

  const snap = await lastSeenDoc(chatId, userId).get();
  if (!snap.exists) return null;

  const data = snap.data() ?? {};
  return {
    userId,
    lastSeenMessageId: String(data.lastSeenMessageId ?? ''),
    seenAt: toDate(data.seenAt) ?? new Date(0),
  };
}
