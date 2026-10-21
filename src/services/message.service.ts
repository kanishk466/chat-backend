// src/services/message.service.ts
// Firestore message CRUD operations under chats/{chatId}/messages.

import { FieldValue, Timestamp } from '@google-cloud/firestore';
import { db } from '../config/firebase';
import { AppError } from '../utils/AppError';
import { assertMember } from './chat.service';
import { GetMessagesResponse, MessageResponse } from '../types';

const messagesCol = (chatId: string) => db.collection('chats').doc(chatId).collection('messages');

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  return null;
}

/** Maps a Firestore message document to the API response shape. */
function toMessageResponse(id: string, data: Record<string, unknown>): MessageResponse {
  return {
    id,
    senderId: String(data.senderId ?? ''),
    text: String(data.text ?? ''),
    timestamp: toDate(data.timestamp) ?? new Date(0),
    edited: Boolean(data.edited),
    editedAt: toDate(data.editedAt),
    deleted: Boolean(data.deleted),
  };
}

async function getMessageOrThrow(
  chatId: string,
  messageId: string
): Promise<{ senderId: string; text: string; deleted: boolean; timestamp: Date | null }> {
  const snap = await messagesCol(chatId).doc(messageId).get();
  if (!snap.exists) throw new AppError(404, 'Message not found');
  const data = snap.data() as Record<string, unknown>;
  return {
    senderId: String(data.senderId ?? ''),
    text: String(data.text ?? ''),
    deleted: Boolean(data.deleted),
    timestamp: toDate(data.timestamp),
  };
}

/** Verifies chat membership, then writes the message to Firestore. */
export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string
): Promise<MessageResponse> {
  await assertMember(chatId, senderId);

  const docRef = messagesCol(chatId).doc();
  await docRef.set({
    id: docRef.id,
    senderId,
    text,
    // Firestore assigns the timestamp on commit -> consistent ordering for all clients
    timestamp: FieldValue.serverTimestamp(),
    edited: false,
    editedAt: null,
    deleted: false,
    deletedAt: null,
  });

  return {
    id: docRef.id,
    senderId,
    text,
    timestamp: new Date(),
    edited: false,
    editedAt: null,
    deleted: false,
  };
}

/**
 * Latest messages first. Firestore orders by timestamp desc (served by the
 * automatic single-field index - no composite index needed); the document id
 * keeps ordering stable when two messages land in the same millisecond.
 * Soft-deleted messages are filtered in memory for the same reason.
 * Pass userId to enforce chat membership.
 */
export async function getMessages(
  chatId: string,
  limit: number,
  cursor?: string,
  userId?: string
): Promise<GetMessagesResponse> {
  if (userId) await assertMember(chatId, userId);

  let query: FirebaseFirestore.Query = messagesCol(chatId)
    .orderBy('timestamp', 'desc')
    .limit(limit);

  if (cursor) {
    const cursorDoc = await messagesCol(chatId).doc(cursor).get();
    if (!cursorDoc.exists) throw new AppError(400, 'Invalid pagination cursor');
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();

  // Filter deleted in memory (instead of .where('deleted','==',false)) so the
  // composite index is NOT required. Cursor still advances by the last fetched
  // doc, so pagination never skips messages.
  const messages = snapshot.docs
    .filter((doc) => !doc.data().deleted)
    .map((doc) => toMessageResponse(doc.id, doc.data()));

  const nextCursor =
    snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

  return { messages, nextCursor };
}

/** Only the original sender can edit, and only while the message is not deleted. */
export async function editMessage(
  chatId: string,
  messageId: string,
  userId: string,
  newText: string
): Promise<MessageResponse> {
  await assertMember(chatId, userId);
  const message = await getMessageOrThrow(chatId, messageId);

  if (message.deleted) throw new AppError(410, 'Cannot edit a deleted message');
  if (message.senderId !== userId) {
    throw new AppError(403, 'Only the sender can edit this message');
  }

  const docRef = messagesCol(chatId).doc(messageId);
  await docRef.update({
    text: newText,
    edited: true,
    editedAt: Timestamp.now(),
  });

  return {
    id: messageId,
    senderId: userId,
    text: newText,
    timestamp: message.timestamp ?? new Date(),
    edited: true,
    editedAt: new Date(),
    deleted: false,
  };
}

/** Soft delete - the document stays for audit, but disappears from listings. */
export async function deleteMessage(
  chatId: string,
  messageId: string,
  userId: string
): Promise<MessageResponse> {
  await assertMember(chatId, userId);
  const message = await getMessageOrThrow(chatId, messageId);

  if (message.deleted) throw new AppError(410, 'Message is already deleted');
  if (message.senderId !== userId) {
    throw new AppError(403, 'Only the sender can delete this message');
  }

  const docRef = messagesCol(chatId).doc(messageId);
  await docRef.update({
    deleted: true,
    deletedAt: Timestamp.now(),
    edited: false,
    editedAt: null,
  });

  return {
    id: messageId,
    senderId: userId,
    text: message.text,
    timestamp: message.timestamp ?? new Date(),
    edited: false,
    editedAt: null,
    deleted: true,
  };
}
