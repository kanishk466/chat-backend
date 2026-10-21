// src/types/index.ts
// All TypeScript interfaces & types for the API.

// ===== Request Types =====
export interface CreateChatRequest {
  userAId: string;
  userBId: string;
}

export interface CreateGroupChatRequest {
  name: string;
  creatorId: string;
  memberIds: string[]; // min 2 members + creator
}

export interface CreateUserRequest {
  email: string;
  name: string;
  avatar?: string;
}

export interface SendMessageRequest {
  senderId: string;
  text: string;
}

export interface MarkReadRequest {
  userId: string;
}

export interface LastSeenRequest {
  userId: string;
  messageId: string;
}

export interface EditMessageRequest {
  userId: string;
  text: string;
}

export interface DeleteMessageRequest {
  userId: string;
}

export interface GetMessagesQuery {
  limit?: number;
  cursor?: string;
  userId?: string; // optional membership enforcement
}

export interface OptionalUserQuery {
  userId?: string;
}

export interface UserQuery {
  userId: string;
}

// ===== Response Types =====
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: unknown;
}

export interface ChatResponse {
  chatId: string;
  type: 'ONE_TO_ONE' | 'GROUP';
  name: string | null;
  members: MemberInfo[];
  createdAt: Date;
}

export interface MemberInfo {
  userId: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: Date;
}

export interface MessageResponse {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  edited: boolean;
  editedAt: Date | null;
  deleted: boolean;
}

export interface GetMessagesResponse {
  messages: MessageResponse[];
  nextCursor: string | null;
}

export interface ReadReceiptResponse {
  userId: string;
  readAt: Date;
}

export interface LastSeenResponse {
  userId: string;
  lastSeenMessageId: string;
  seenAt: Date;
}

export interface SuccessResponse {
  success: true;
}

// ===== Firestore Document Shapes (raw stored data) =====
export interface MessageDocument {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  edited: boolean;
  editedAt: Date | null;
  deleted: boolean;
  deletedAt: Date | null;
}

export interface ReadReceiptDocument {
  userId: string;
  readAt: Date;
}

export interface LastSeenDocument {
  userId: string;
  lastSeenMessageId: string;
  seenAt: Date;
}
