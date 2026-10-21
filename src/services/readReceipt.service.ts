// src/services/readReceipt.service.ts
// Firestore read receipts under chats/{chatId}/messages/{messageId}/readReceipts/{userId}.

import { FieldValue, Timestamp } from '@google-cloud/firestore';
import { db } from '../config/firebase';
import { AppError } from '../utils/AppError';
import { assertMember } from './chat.service';
import { ReadReceiptResponse } from '../types';

const messageRef = (chatId: string, messageId: string) =>
  db.collection('chats').doc(chatId).collection('messages').doc(messageId);

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

/** Document id = userId -> idempotent (create or overwrite). */
export async function markAsRead(
  chatId: string,
  messageId: string,
  userId: string
): Promise<ReadReceiptResponse> {
  await assertMember(chatId, userId);

  const msgSnap = await messageRef(chatId, messageId).get();
  if (!msgSnap.exists) throw new AppError(404, 'Message not found');

  const receiptRef = messageRef(chatId, messageId).collection('readReceipts').doc(userId);
  await receiptRef.set({
    userId,
    readAt: FieldValue.serverTimestamp(),
  });

  return { userId, readAt: new Date() };
}

/** Everyone in the chat who has read this message. Pass userId to enforce membership. */
export async function getReadReceipts(
  chatId: string,
  messageId: string,
  userId?: string
): Promise<ReadReceiptResponse[]> {
  if (userId) await assertMember(chatId, userId);

  const msgSnap = await messageRef(chatId, messageId).get();
  if (!msgSnap.exists) throw new AppError(404, 'Message not found');

  const snapshot = await messageRef(chatId, messageId).collection('readReceipts').get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      userId: String(data.userId ?? doc.id),
      readAt: toDate(data.readAt) ?? new Date(0),
    };
  });
}
