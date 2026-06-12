import { createServer } from "http";
import { Server } from "socket.io";
import postgres from "postgres";
import { randomUUID, createHmac } from "crypto";

// ─── Configuration ────────────────────────────────────────────────────────────
const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET) {
  console.error("FATAL: COOKIE_SECRET environment variable is not set for chat service");
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.CHAT_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL (or CHAT_DATABASE_URL) environment variable is not set for chat service");
  process.exit(1);
}

// ─── Database Setup (PostgreSQL) ─────────────────────────────────────────────
const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// ─── Cookie Verification ─────────────────────────────────────────────────────

function verifySignedCookie(signedValue: string): string | null {
  const dotIndex = signedValue.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const value = signedValue.substring(0, dotIndex);
  const signature = signedValue.substring(dotIndex + 1);

  const expectedSignature = createHmac("sha256", COOKIE_SECRET)
    .update(value)
    .digest("hex");

  if (signature !== expectedSignature) return null;
  return value;
}

function extractUserIdFromCookies(cookieHeader: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, ...rest] = cookie.trim().split("=");
      if (key && rest.length > 0) {
        acc[key.trim()] = rest.join("=").trim();
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const rawUserId = cookies["userId"];
  if (!rawUserId) return null;

  const userId = verifySignedCookie(rawUserId);
  return userId;
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const userMessageTimestamps = new Map<string, number[]>();
const MESSAGE_RATE_LIMIT = 20;
const RATE_WINDOW = 60000;

function checkSocketRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (userMessageTimestamps.get(userId) || []).filter(
    (t) => now - t < RATE_WINDOW,
  );
  if (timestamps.length >= MESSAGE_RATE_LIMIT) return false;
  timestamps.push(now);
  userMessageTimestamps.set(userId, timestamps);
  return true;
}

// ─── HTTP + Socket.io Server Setup ────────────────────────────────────────────
const PORT = 3003;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const connectedUsers = new Map<string, string>();

// ─── Socket Middleware: Authentication on Connection ──────────────────────────

io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const userId = extractUserIdFromCookies(cookieHeader);

    if (!userId) {
      console.warn(`[AUTH REJECTED] Socket ${socket.id} - no valid auth cookie`);
      return next(new Error("Authentication required"));
    }

    // Verify user exists in PostgreSQL database
    const users = await sql`
      SELECT id, name, avatar FROM users WHERE id = ${userId}
    `;
    if (users.length === 0) {
      console.warn(`[AUTH REJECTED] Socket ${socket.id} - user ${userId} not found`);
      return next(new Error("User not found"));
    }

    (socket as any).verifiedUserId = userId;
    console.log(`[AUTH OK] Socket ${socket.id} authenticated as user ${userId}`);
    next();
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    next(new Error("Authentication failed"));
  }
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function getUnreadCount(userId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*) as count
    FROM messages m
    INNER JOIN participants p ON m."conversationId" = p."conversationId"
    WHERE p."userId" = ${userId}
      AND m."senderId" != ${userId}
      AND m."isRead" = false
  `;
  return Number(result[0]?.count ?? 0);
}

async function joinUserConversations(socket: any, userId: string): Promise<void> {
  try {
    const conversations = await sql`
      SELECT "conversationId" FROM participants WHERE "userId" = ${userId}
    `;
    for (const conv of conversations) {
      socket.join(`conversation:${conv.conversationId}`);
      console.log(`[Socket ${socket.id}] User ${userId} joined conversation:${conv.conversationId}`);
    }
  } catch (err) {
    console.error(`Error joining conversations for user ${userId}:`, err);
  }
}

async function isUserParticipant(conversationId: string, userId: string): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM participants WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
  `;
  return result.length > 0;
}

// ─── Socket.io Event Handlers ─────────────────────────────────────────────────

io.on("connection", (socket) => {
  const verifiedUserId = (socket as any).verifiedUserId as string;

  console.log(`[CONNECT] Socket ${socket.id} connected as user ${verifiedUserId}`);

  connectedUsers.set(socket.id, verifiedUserId);

  // Auto-join all conversation rooms
  joinUserConversations(socket, verifiedUserId);

  // Send current unread count
  getUnreadCount(verifiedUserId).then((count) => {
    socket.emit("unread-count", { userId: verifiedUserId, count });
  });

  // ── Join a specific conversation room ──────────────────────────────────────
  socket.on("join-conversation", async (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;
      if (!conversationId) {
        socket.emit("error", { message: "conversationId is required" });
        return;
      }

      const isParticipant = await isUserParticipant(conversationId, verifiedUserId);
      if (!isParticipant) {
        socket.emit("error", { message: "Not a participant of this conversation" });
        return;
      }

      socket.join(`conversation:${conversationId}`);
      console.log(`[JOIN] Socket ${socket.id} (user ${verifiedUserId}) joined conversation:${conversationId}`);
    } catch (err) {
      console.error(`[JOIN ERROR]`, err);
      socket.emit("error", { message: "Failed to join conversation" });
    }
  });

  // ── Leave a specific conversation room ─────────────────────────────────────
  socket.on("leave-conversation", (data: { conversationId: string }) => {
    try {
      const { conversationId } = data;
      if (!conversationId) {
        socket.emit("error", { message: "conversationId is required" });
        return;
      }

      socket.leave(`conversation:${conversationId}`);
      console.log(`[LEAVE] Socket ${socket.id} (user ${verifiedUserId}) left conversation:${conversationId}`);
    } catch (err) {
      console.error(`[LEAVE ERROR]`, err);
      socket.emit("error", { message: "Failed to leave conversation" });
    }
  });

  // ── Send a new message ─────────────────────────────────────────────────────
  socket.on(
    "send-message",
    async (data: {
      conversationId: string;
      content: string;
      type: "TEXT" | "IMAGE";
      imageUrl?: string;
    }) => {
      try {
        const { conversationId, content, type, imageUrl } = data;
        const senderId = verifiedUserId;

        if (!conversationId || !content) {
          socket.emit("error", { message: "conversationId and content are required" });
          return;
        }

        if (!["TEXT", "IMAGE"].includes(type)) {
          socket.emit("error", { message: "type must be TEXT or IMAGE" });
          return;
        }

        if (!checkSocketRateLimit(senderId)) {
          socket.emit("error", { message: "Rate limit exceeded. Slow down." });
          return;
        }

        const isParticipant = await isUserParticipant(conversationId, senderId);
        if (!isParticipant) {
          socket.emit("error", { message: "Not a participant of this conversation" });
          return;
        }

        const messageId = randomUUID();

        // Save message to PostgreSQL
        await sql`
          INSERT INTO messages (id, content, type, "imageUrl", "conversationId", "senderId", "isRead", "createdAt")
          VALUES (${messageId}, ${content}, ${type}, ${imageUrl || null}, ${conversationId}, ${senderId}, false, NOW())
        `;

        const createdMessage = {
          id: messageId,
          content,
          type,
          imageUrl: imageUrl || null,
          conversationId,
          senderId,
          createdAt: new Date().toISOString(),
        };

        io.to(`conversation:${conversationId}`).emit("new-message", createdMessage);

        // Update unread counts for all other participants
        const participants = await sql`
          SELECT "userId" FROM participants WHERE "conversationId" = ${conversationId}
        `;
        for (const participant of participants) {
          if (participant.userId !== senderId) {
            const unreadCount = await getUnreadCount(participant.userId);
            for (const [socketId, uid] of connectedUsers.entries()) {
              if (uid === participant.userId) {
                io.to(socketId).emit("unread-count", {
                  userId: participant.userId,
                  count: unreadCount,
                });
              }
            }
          }
        }

        console.log(`[MESSAGE] ${senderId} sent ${type} message to conversation:${conversationId}`);
      } catch (err) {
        console.error(`[MESSAGE ERROR]`, err);
        socket.emit("error", { message: "Failed to send message" });
      }
    },
  );

  // ── Typing indicator ───────────────────────────────────────────────────────
  socket.on(
    "typing",
    async (data: { conversationId: string; isTyping: boolean }) => {
      try {
        const { conversationId, isTyping } = data;
        const userId = verifiedUserId;

        if (!conversationId) {
          socket.emit("error", { message: "conversationId is required" });
          return;
        }

        const isParticipant = await isUserParticipant(conversationId, userId);
        if (!isParticipant) {
          socket.emit("error", { message: "Not a participant of this conversation" });
          return;
        }

        socket.to(`conversation:${conversationId}`).emit("user-typing", {
          conversationId,
          userId,
          isTyping,
        });

        console.log(`[TYPING] User ${userId} ${isTyping ? "started" : "stopped"} typing in conversation:${conversationId}`);
      } catch (err) {
        console.error(`[TYPING ERROR]`, err);
        socket.emit("error", { message: "Failed to send typing indicator" });
      }
    },
  );

  // ── Mark messages as read ──────────────────────────────────────────────────
  socket.on(
    "mark-read",
    async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;
        const userId = verifiedUserId;

        if (!conversationId) {
          socket.emit("error", { message: "conversationId is required" });
          return;
        }

        const isParticipant = await isUserParticipant(conversationId, userId);
        if (!isParticipant) {
          socket.emit("error", { message: "Not a participant of this conversation" });
          return;
        }

        // Mark all unread messages as read
        await sql`
          UPDATE messages
          SET "isRead" = true
          WHERE "conversationId" = ${conversationId}
            AND "senderId" != ${userId}
            AND "isRead" = false
        `;

        // Update participant's lastReadAt
        await sql`
          UPDATE participants
          SET "lastReadAt" = NOW()
          WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        `;

        io.to(`conversation:${conversationId}`).emit("messages-read", {
          conversationId,
          userId,
        });

        const unreadCount = await getUnreadCount(userId);
        for (const [socketId, uid] of connectedUsers.entries()) {
          if (uid === userId) {
            io.to(socketId).emit("unread-count", {
              userId,
              count: unreadCount,
            });
          }
        }

        console.log(`[READ] User ${userId} marked messages as read in conversation:${conversationId}`);
      } catch (err) {
        console.error(`[READ ERROR]`, err);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    },
  );

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(socket.id);
      console.log(`[DISCONNECT] Socket ${socket.id} (user ${userId}) disconnected: ${reason}`);
    } else {
      console.log(`[DISCONNECT] Socket ${socket.id} disconnected: ${reason}`);
    }
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`🚀 Chat service (Socket.io) running on port ${PORT}`);
  console.log(`📁 Database: PostgreSQL`);
});

// Graceful shutdown
async function shutdown() {
  console.log("\n🛑 Shutting down chat service...");
  io.close();
  httpServer.close();
  await sql.end();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
