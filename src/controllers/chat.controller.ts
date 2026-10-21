

import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';
import { createGroupChat, createOrGetChat } from '../services/chat.service';
import { CreateChatRequest, CreateGroupChatRequest } from '../types';

/** POST /chat/create */
export const handleCreateChat = asyncHandler(async (req: Request, res: Response) => {
  const { userAId, userBId } = req.body as CreateChatRequest;
  const chat = await createOrGetChat(userAId, userBId);
  sendSuccess(res, chat, 'Chat ready');
});

/** POST /chat/group/create */
export const handleCreateGroupChat = asyncHandler(async (req: Request, res: Response) => {
  const { name, creatorId, memberIds } = req.body as CreateGroupChatRequest;
  const chat = await createGroupChat(name, creatorId, memberIds);
  sendSuccess(res, chat, 'Group chat created', 201);
});
