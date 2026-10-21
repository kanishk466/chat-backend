

import { Router } from 'express';
import { validate } from '../middlewares/validateRequest';
import { userParamsSchema } from '../validators/message.validator';
import { createUserSchema } from '../validators/user.validator';
import { handleCreateUser, handleListUserChats } from '../controllers/user.controller';

const router = Router();

router.post('/create', validate({ body: createUserSchema }), handleCreateUser);
router.get('/:userId/chats', validate({ params: userParamsSchema }), handleListUserChats);

export default router;
