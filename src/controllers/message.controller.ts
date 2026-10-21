

import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';
import { deleteMessage, editMessage, getMessages, sendMessage } from '../services/message.service';
import { getReadReceipts, markAsRead } from '../services/readReceipt.service';
import { getLastSeen, updateLastSeen } from '../services/lastSeen.service';
import {
  DeleteMessageRequest,
  EditMessageRequest,
  GetMessagesQuery,
  LastSeenRequest,
  MarkReadRequest,
  OptionalUserQuery,
  SendMessageRequest,
  UserQuery,
} from '../types';

/** POST /chat/:chatId/message/send */
export const handleSendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { senderId, text } = req.body as SendMessageRequest;

  const message = await sendMessage(chatId, senderId, text);
  sendSuccess(res, message, 'Message sent', 201);
});

/** GET /chat/:chatId/messages?limit=50&cursor=...&userId=... */
export const handleGetMessages = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { limit, cursor, userId } = req.query as unknown as GetMessagesQuery;

  const result = await getMessages(chatId, limit ?? 50, cursor, userId);
  sendSuccess(res, result, 'Messages fetched');
});

/** PUT /chat/:chatId/message/:messageId/edit */
export const handleEditMessage = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, messageId } = req.params;
  const { userId, text } = req.body as EditMessageRequest;

  const message = await editMessage(chatId, messageId, userId, text);
  sendSuccess(res, message, 'Message updated');
});

/** DELETE /chat/:chatId/message/:messageId/delete */
export const handleDeleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, messageId } = req.params;
  const { userId } = req.body as DeleteMessageRequest;

  const message = await deleteMessage(chatId, messageId, userId);
  sendSuccess(res, message, 'Message deleted');
});

/** POST /chat/:chatId/message/:messageId/read */
export const handleMarkRead = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, messageId } = req.params;
  const { userId } = req.body as MarkReadRequest;

  const receipt = await markAsRead(chatId, messageId, userId);
  sendSuccess(res, receipt, 'Message marked as read');
});

/** GET /chat/:chatId/message/:messageId/receipts?userId=... */
export const handleGetReadReceipts = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, messageId } = req.params;
  const { userId } = req.query as unknown as OptionalUserQuery;

  const receipts = await getReadReceipts(chatId, messageId, userId);
  sendSuccess(res, { receipts }, 'Read receipts fetched');
});

/** POST /chat/:chatId/lastseen */
export const handleUpdateLastSeen = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId, messageId } = req.body as LastSeenRequest;

  const lastSeen = await updateLastSeen(chatId, userId, messageId);
  sendSuccess(res, lastSeen, 'Last seen updated');
});

/** GET /chat/:chatId/lastseen?userId=... */
export const handleGetLastSeen = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const { userId } = req.query as unknown as UserQuery;

  const lastSeen = await getLastSeen(chatId, userId);
  sendSuccess(res, lastSeen, 'Last seen fetched');
});
