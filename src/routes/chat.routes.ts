

import { Router } from 'express';
import { validate } from '../middlewares/validateRequest';
import { createChatSchema, createGroupChatSchema } from '../validators/chat.validator';
import { handleCreateChat, handleCreateGroupChat } from '../controllers/chat.controller';

const router = Router();

router.post('/create', validate({ body: createChatSchema }), handleCreateChat);
router.post('/group/create', validate({ body: createGroupChatSchema }), handleCreateGroupChat);

export default router;
