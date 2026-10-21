

import express, { Request, Response } from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';
import userRoutes from './routes/user.routes';

const app = express();

// Global middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Chat API is running', timestamp: new Date() });
});

// Routes
app.use('/chat', chatRoutes);
app.use('/chat', messageRoutes); // /chat/:chatId/message/*, /chat/:chatId/messages, /chat/:chatId/lastseen
app.use('/user', userRoutes);

// 404 + global error handler (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
