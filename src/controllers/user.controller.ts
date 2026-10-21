

import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler';
import { sendSuccess } from '../utils/response';
import { getUserChats } from '../services/chat.service';
import { createUser } from '../services/user.service';
import { CreateUserRequest, UserQuery } from '../types';

/** GET /user/:userId/chats */
export const handleListUserChats = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as unknown as UserQuery;

  const chats = await getUserChats(userId);
  sendSuccess(res, { chats }, 'User chats fetched');
});

/** POST /user/create */
export const handleCreateUser = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateUserRequest;

  const user = await createUser(body);
  sendSuccess(res, user, 'User created', 201);
});
