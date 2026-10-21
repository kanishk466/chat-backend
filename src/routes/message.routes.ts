import { Router } from 'express';
import { validate } from '../middlewares/validateRequest';
import {
  chatParamsSchema,
  deleteMessageSchema,
  editMessageSchema,
  getMessagesQuerySchema,
  lastSeenSchema,
  markReadSchema,
  messageParamsSchema,
  optionalUserQuerySchema,
  sendMessageSchema,
  userQuerySchema,
} from '../validators/message.validator';
import {
  handleDeleteMessage,
  handleEditMessage,
  handleGetMessages,
  handleGetLastSeen,
  handleGetReadReceipts,
  handleMarkRead,
  handleSendMessage,
  handleUpdateLastSeen,
} from '../controllers/message.controller';

const router = Router();

// Messages
router.post(
  '/:chatId/message/send',
  validate({ body: sendMessageSchema, params: chatParamsSchema }),
  handleSendMessage
);
router.get(
  '/:chatId/messages',
  validate({ params: chatParamsSchema, query: getMessagesQuerySchema }),
  handleGetMessages
);
router.put(
  '/:chatId/message/:messageId/edit',
  validate({ body: editMessageSchema, params: messageParamsSchema }),
  handleEditMessage
);
router.delete(
  '/:chatId/message/:messageId/delete',
  validate({ body: deleteMessageSchema, params: messageParamsSchema }),
  handleDeleteMessage
);

// Read receipts
router.post(
  '/:chatId/message/:messageId/read',
  validate({ body: markReadSchema, params: messageParamsSchema }),
  handleMarkRead
);
router.get(
  '/:chatId/message/:messageId/receipts',
  validate({ params: messageParamsSchema, query: optionalUserQuerySchema }),
  handleGetReadReceipts
);

// Last seen
router.post(
  '/:chatId/lastseen',
  validate({ body: lastSeenSchema, params: chatParamsSchema }),
  handleUpdateLastSeen
);
router.get(
  '/:chatId/lastseen',
  validate({ params: chatParamsSchema, query: userQuerySchema }),
  handleGetLastSeen
);

export default router;
