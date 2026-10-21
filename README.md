# Chat Backend API
 Chat Backend API built with **Node.js + Express + TypeScript** for user & chat management (**PostgreSQL via Prisma 5.2**), and **Firebase Firestore** for real-time messages, read receipts, and last-seen tracking.

Supports **1:1 chats, group chats, message CRUD, read receipts, and last-seen tracking**.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Language | TypeScript (strict mode) |
| Framework | Express.js 4 |
| Relational DB | PostgreSQL |
| ORM | Prisma 5.2 |
| NoSQL / Realtime | Firebase Firestore (Admin SDK) |
| Validation | Zod |
| Dev tools | tsx, nodemon |

---

##  Data Split Strategy

| PostgreSQL (Prisma) | Firebase Firestore |
|---|---|
| `users` — id, email, name, avatar | `chats/{chatId}/messages/{messageId}` — text, sender, timestamp, edited, deleted |
| `chats` — id, type (1:1 / group), name | `.../messages/{messageId}/readReceipts/{userId}` — read receipts |
| `chat_members` — chatId, userId, role, joinedAt | `chats/{chatId}/lastSeen/{userId}` — last-seen pointer |

**Why this split?**

- **PostgreSQL** = structured data, relationships, uniqueness constraints, complex queries
- **Firestore** = real-time sync, fast writes, scalable reads for chat volume

### Firestore structure

```
chats (collection)
  └── {chatId} (document)
        ├── messages (sub-collection)
        │     └── {messageId} (document)
        │           ├── senderId, text
        │           ├── timestamp  (serverTimestamp)
        │           ├── edited, editedAt
        │           ├── deleted, deletedAt   (soft delete)
        │           └── readReceipts (sub-collection)
        │                 └── {userId} → { userId, readAt }
        └── lastSeen (sub-collection)
              └── {userId} → { userId, lastSeenMessageId, seenAt }
```

---

##  Getting Started

### 1. Install

```bash
npm install
npm run prisma:generate
```

### 2. Environment (`.env`)

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/chat_db?schema=public"

# Firebase - service account JSON file path
FIREBASE_SERVICE_ACCOUNT_PATH="./firebase-service-account.json"


```



### 3. Migrate & run

```bash
npm run prisma:migrate     # creates tables (npx prisma migrate dev --name init)
npm run dev                # http://localhost:3000
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload (tsx + nodemon) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled `dist/index.js` |
| `npm run typecheck` | `tsc --noEmit` strict check |
| `npm run prisma:migrate` | Create/apply migrations (dev) |
| `npm run prisma:deploy` | Apply migrations (prod) |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:studio` | DB browser |

---

##  API Reference

Base URL: `http://localhost:3000`

All responses follow the standard envelope:

```json
{ "success": true,  "data": { ... }, "message": "..." }
{ "success": false, "error": "Validation failed", "details": [ ... ] }
```

| # | Method | Endpoint | DB | Returns |
|---|---|---|---|---|
| 1 | POST | `/chat/create` | Prisma | chat (chatId, members…) |
| 2 | POST | `/chat/group/create` | Prisma | chat (201) |
| 3 | POST | `/chat/:chatId/message/send` | Firestore | message (201) |
| 4 | GET | `/chat/:chatId/messages?limit=50&cursor=&userId=` | Firestore | `{ messages, nextCursor }` |
| 5 | PUT | `/chat/:chatId/message/:messageId/edit` | Firestore | message |
| 6 | DELETE | `/chat/:chatId/message/:messageId/delete` | Firestore | message (deleted) |
| 7 | POST | `/chat/:chatId/message/:messageId/read` | Firestore | receipt |
| 8 | GET | `/chat/:chatId/message/:messageId/receipts?userId=` | Firestore | `{ receipts }` |
| 9 | POST | `/chat/:chatId/lastseen` | Firestore | lastSeen |
| 10 | GET | `/chat/:chatId/lastseen?userId=` | Firestore | lastSeen \| null |
| 11 | GET | `/user/:userId/chats` | Prisma | `{ chats }` |
| 12 | POST | `/user/create` | Prisma | user (201) |
| — | GET | `/health` | — | status |

### Examples

**Create / get a 1:1 chat** (idempotent — returns the existing chat if present)

```bash
curl -X POST http://localhost:3000/chat/create \
  -H "Content-Type: application/json" \
  -d '{"userAId":"<uuid>","userBId":"<uuid>"}'
```

**Create a group chat**

```bash
curl -X POST http://localhost:3000/chat/group/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Team","creatorId":"<uuid>","memberIds":["<uuid>","<uuid>"]}'
```

**Send a message**

```bash
curl -X POST http://localhost:3000/chat/<chatId>/message/send \
  -H "Content-Type: application/json" \
  -d '{"senderId":"<uuid>","text":"Hello!"}'
```

**Get messages (newest first, cursor pagination)**

```bash
curl "http://localhost:3000/chat/<chatId>/messages?limit=50"
curl "http://localhost:3000/chat/<chatId>/messages?limit=50&cursor=<lastMessageId>&userId=<uuid>"
```

**Edit / delete a message** (only the sender)

```bash
curl -X PUT  http://localhost:3000/chat/<chatId>/message/<messageId>/edit \
  -H "Content-Type: application/json" -d '{"userId":"<uuid>","text":"updated text"}'

curl -X DELETE http://localhost:3000/chat/<chatId>/message/<messageId>/delete \
  -H "Content-Type: application/json" -d '{"userId":"<uuid>"}'
```

**Mark read / fetch read receipts**

```bash
curl -X POST http://localhost:3000/chat/<chatId>/message/<messageId>/read \
  -H "Content-Type: application/json" -d '{"userId":"<uuid>"}'

curl "http://localhost:3000/chat/<chatId>/message/<messageId>/receipts?userId=<uuid>"
```

**Last seen**

```bash
curl -X POST http://localhost:3000/chat/<chatId>/lastseen \
  -H "Content-Type: application/json" -d '{"userId":"<uuid>","messageId":"<messageId>"}'

curl "http://localhost:3000/chat/<chatId>/lastseen?userId=<uuid>"
```

**List user chats / create user**

```bash
curl "http://localhost:3000/user/<userId>/chats"

curl -X POST http://localhost:3000/user/create \
  -H "Content-Type: application/json" \
  -d '{"email":"ram@example.com","name":"Ram"}'
```

---

##  Key Logic

### Duplicate prevention (1:1 chats)

`createOrGetChat` runs inside a **Serializable** Prisma transaction:

1. Find a `ONE_TO_ONE` chat where **both** users are members and there is **no third member**
2. Found → return existing chat
3. Not found → create `Chat` + 2 `ChatMember` rows atomically
4. Concurrent write conflicts  are retried up to 3 times

### Message ordering

Firestore orders by `timestamp` (server time) `desc`; the document id acts as a stable
secondary key. Pagination uses a `cursor` (last message id) via `startAfter`.

### Membership checks

Every Firestore write (send / edit / delete / read / last-seen) first verifies via Prisma
that the user belongs to the chat → `404` if chat missing, `403` if not a member.
`GET` endpoints enforce it when `userId` is provided.

### Deletes are soft

`deleted: true` + `deletedAt` — the document stays for audit but disappears from listings
(filtered in memory in `getMessages`).

---

##  Project Structure

```
chat-backend/
├── prisma/schema.prisma          # Users, Chats, ChatMembers
├── src/
│   ├── index.ts                  # Server start + graceful shutdown
│   ├── app.ts                    # Express app, middleware, routes
│   ├── config/                   # env (Zod-validated), prisma, firebase
│   ├── routes/                   # chat, message, user routes
│   ├── controllers/              # request → service wiring
│   ├── services/                 # chat (Prisma), message, readReceipt, lastSeen (Firestore)
│   ├── middlewares/              # errorHandler, validateRequest
│   ├── validators/               # Zod schemas
│   ├── types/                    # TypeScript interfaces
│   └── utils/                    # response helpers, AppError
├── .env / .env.example
├── firestore.indexes.json        # Optional - future composite index
├── tsconfig.json
└── package.json
```

---

## ⚠️ Notes

- **Auth is out of scope** in this blueprint: callers pass `senderId` / `userId` in the body.
  In production, put JWT auth in front and derive the user from the token instead of the body.
- **No Firestore composite index needed right now** — `getMessages` uses only
  `orderBy('timestamp','desc')`, which is served by Firestore's automatic single-field
  index. Soft-deleted messages are filtered in memory.
  - Trade-off: a page may return slightly fewer than `limit` messages when some are
    deleted (cursor still advances correctly, so pagination never skips messages).
  - Future optimization: create the composite index from `firestore.indexes.json`
    (`messages`: `deleted ASC, timestamp DESC`) and switch `getMessages` back to
    `.where('deleted','==',false).orderBy('timestamp','desc')` to filter in the query.
  - `readReceipts` / `lastSeen` use point reads and small fetches → no indexes needed.
- **First boot fails fast** until a real `firebase-service-account.json` (or inline
  credentials) is configured — by design.
- Bonus endpoints beyond the core spec: `POST /user/create`,
  `GET .../message/:messageId/receipts`, `GET .../lastseen`, cursor pagination.

### Troubleshooting

- `FATAL: the database system is in recovery mode` → your local PostgreSQL is finishing
  crash recovery (or stuck). Restart the `postgresql-x64-18` Windows service, then re-run
  `npm run prisma:migrate`.
- Prisma migration was **not applied yet** in this environment for that reason — run
  `npm run prisma:migrate` once your DB is healthy.
- `Firebase service account file not found` → put your real service account JSON at the
  path in `FIREBASE_SERVICE_ACCOUNT_PATH`, or switch to inline credentials (Option B in
  `.env.example`).
