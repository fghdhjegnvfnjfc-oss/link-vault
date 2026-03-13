import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { activeSessions, editState, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Color palette for user avatars
const USER_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Light Salmon
  "#98D8C8", // Mint
  "#F7DC6F", // Yellow
  "#BB8FCE", // Purple
  "#85C1E2", // Sky Blue
  "#F8B88B", // Peach
  "#A8E6CF", // Light Green
];

interface UserPresence {
  userId: number;
  sessionId: string;
  userName: string;
  userEmail: string;
  userColor: string;
  isOnline: boolean;
}

interface EditingUser {
  userId: number;
  sessionId: string;
  userName: string;
  userColor: string;
  resourceType: "link" | "folder";
  resourceId: number;
  fieldName?: string;
  currentValue?: string;
}

interface VaultPresence {
  [vaultId: number]: {
    onlineUsers: UserPresence[];
    editingUsers: EditingUser[];
  };
}

// In-memory store for active presence (will be synced with DB)
const vaultPresence: VaultPresence = {};

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" 
        ? process.env.VITE_FRONTEND_URL 
        : ["http://localhost:3000", "http://localhost:5173"],
      credentials: true,
    },
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth.userId;
      const vaultId = socket.handshake.auth.vaultId;
      const sessionId = socket.id;

      if (!userId || !vaultId) {
        return next(new Error("Missing userId or vaultId"));
      }

      // Store metadata on socket
      socket.data.userId = userId;
      socket.data.vaultId = vaultId;
      socket.data.sessionId = sessionId;

      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as number;
    const vaultId = socket.data.vaultId as number;
    const sessionId = socket.data.sessionId as string;

    console.log(`[WebSocket] User ${userId} connected to vault ${vaultId}`);

    try {
      const db = await getDb();
      
      // Get user info (optional if DB is unavailable)
      let userName = "Anonymous";
      let userEmail = "unknown@example.com";
      
      if (db) {
        try {
          const userResult = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          if (userResult.length > 0) {
            const user = userResult[0];
            userName = user.name || "Anonymous";
            userEmail = user.email || "unknown@example.com";
          }
        } catch (error) {
          console.warn("[WebSocket] Could not fetch user from DB:", error);
        }
      }

      // Assign user color
      const userColor = USER_COLORS[userId % USER_COLORS.length];

      // Initialize vault presence if needed
      if (!vaultPresence[vaultId]) {
        vaultPresence[vaultId] = {
          onlineUsers: [],
          editingUsers: [],
        };
      }

      // Add user to online list
      const userPresence: UserPresence = {
        userId,
        sessionId,
        userName,
        userEmail,
        userColor,
        isOnline: true,
      };

      vaultPresence[vaultId].onlineUsers.push(userPresence);

      // Save session to database (optional)
      if (db) {
        try {
          await db.insert(activeSessions).values({
            vaultId,
            userId,
            sessionId,
            userColor,
            isOnline: true,
          });
        } catch (error) {
          console.warn("[WebSocket] Could not save session to DB:", error);
        }
      }

      // Notify all users in vault about new presence
      io.to(`vault:${vaultId}`).emit("user:joined", {
        userId,
        sessionId,
        userName,
        userColor,
      });

      // Send current presence state to newly connected user
      io.to(socket.id).emit("presence:sync", {
        onlineUsers: vaultPresence[vaultId].onlineUsers,
        editingUsers: vaultPresence[vaultId].editingUsers,
      });

      // Join socket to vault room
      socket.join(`vault:${vaultId}`);

      // ─── Edit State Events ───────────────────────────────────────

      socket.on("edit:start", async (data: {
        resourceType: "link" | "folder";
        resourceId: number;
        fieldName?: string;
      }) => {
        const { resourceType, resourceId, fieldName } = data;

        try {
          // Check if someone else is already editing this
          const existingEdit = vaultPresence[vaultId].editingUsers.find(
            (e) =>
              e.resourceType === resourceType &&
              e.resourceId === resourceId &&
              e.fieldName === fieldName &&
              e.userId !== userId
          );

          if (existingEdit) {
            socket.emit("edit:conflict", {
              resourceType,
              resourceId,
              fieldName,
              editingUser: {
                userName: existingEdit.userName,
                userColor: existingEdit.userColor,
              },
            });
            return;
          }

          // Add to editing users
          const editingUser: EditingUser = {
            userId,
            sessionId,
            userName,
            userColor,
            resourceType,
            resourceId,
            fieldName,
          };

          vaultPresence[vaultId].editingUsers.push(editingUser);

          // Save to database (optional)
          if (db) {
            try {
              await db.insert(editState).values({
                vaultId,
                sessionId,
                userId,
                resourceType,
                resourceId,
                fieldName,
              });
            } catch (error) {
              console.warn("[WebSocket] Could not save edit state to DB:", error);
            }
          }

          // Broadcast to all users in vault
          io.to(`vault:${vaultId}`).emit("edit:started", {
            userId,
            sessionId,
            userName,
            userColor,
            resourceType,
            resourceId,
            fieldName,
          });
        } catch (error) {
          console.error("[WebSocket] Error starting edit:", error);
          socket.emit("error", { message: "Failed to start editing" });
        }
      });

      socket.on("edit:field", (data: {
        resourceType: "link" | "folder";
        resourceId: number;
        fieldName: string;
        value: string;
      }) => {
        const { resourceType, resourceId, fieldName, value } = data;

        // Update in-memory state
        const editingUser = vaultPresence[vaultId].editingUsers.find(
          (e) =>
            e.userId === userId &&
            e.resourceType === resourceType &&
            e.resourceId === resourceId &&
            e.fieldName === fieldName
        );

        if (editingUser) {
          editingUser.currentValue = value;
        }

        // Broadcast field change to all users in vault
        io.to(`vault:${vaultId}`).emit("edit:field-update", {
          userId,
          sessionId,
          resourceType,
          resourceId,
          fieldName,
          value,
        });
      });

      socket.on("edit:end", async (data: {
        resourceType: "link" | "folder";
        resourceId: number;
        fieldName?: string;
      }) => {
        const { resourceType, resourceId, fieldName } = data;

        try {
          // Remove from editing users
          vaultPresence[vaultId].editingUsers = vaultPresence[vaultId].editingUsers.filter(
            (e) =>
              !(
                e.userId === userId &&
                e.resourceType === resourceType &&
                e.resourceId === resourceId &&
                e.fieldName === fieldName
              )
          );

          // Remove from database (optional)
          if (db) {
            try {
              await db
                .delete(editState)
                .where(
                  and(
                    eq(editState.sessionId, sessionId),
                    eq(editState.resourceType, resourceType),
                    eq(editState.resourceId, resourceId)
                  )
                );
            } catch (error) {
              console.warn("[WebSocket] Could not delete edit state from DB:", error);
            }
          }

          // Broadcast to all users
          io.to(`vault:${vaultId}`).emit("edit:ended", {
            userId,
            sessionId,
            resourceType,
            resourceId,
            fieldName,
          });
        } catch (error) {
          console.error("[WebSocket] Error ending edit:", error);
        }
      });

      // ─── Heartbeat ───────────────────────────────────────────────

      socket.on("heartbeat", async () => {
        if (!db) return;
        
        try {
          await db
            .update(activeSessions)
            .set({ lastHeartbeat: new Date() })
            .where(eq(activeSessions.sessionId, sessionId));
        } catch (error) {
          console.warn("[WebSocket] Error updating heartbeat:", error);
        }
      });

      // ─── Disconnect ──────────────────────────────────────────────

      socket.on("disconnect", async () => {
        console.log(`[WebSocket] User ${userId} disconnected from vault ${vaultId}`);

        try {
          // Remove from online users
          vaultPresence[vaultId].onlineUsers = vaultPresence[vaultId].onlineUsers.filter(
            (u) => u.sessionId !== sessionId
          );

          // Remove from editing users
          vaultPresence[vaultId].editingUsers = vaultPresence[vaultId].editingUsers.filter(
            (e) => e.sessionId !== sessionId
          );

          // Remove from database (optional)
          if (db) {
            try {
              await db
                .delete(activeSessions)
                .where(eq(activeSessions.sessionId, sessionId));

              await db
                .delete(editState)
                .where(eq(editState.sessionId, sessionId));
            } catch (error) {
              console.warn("[WebSocket] Could not delete sessions from DB:", error);
            }
          }

          // Notify others
          io.to(`vault:${vaultId}`).emit("user:left", {
            userId,
            sessionId,
          });

          // Clean up empty vault presence
          if (
            vaultPresence[vaultId].onlineUsers.length === 0 &&
            vaultPresence[vaultId].editingUsers.length === 0
          ) {
            delete vaultPresence[vaultId];
          }
        } catch (error) {
          console.error("[WebSocket] Error handling disconnect:", error);
        }
      });
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      socket.disconnect();
    }
  });

  return io;
}

export function getVaultPresence(vaultId: number) {
  return vaultPresence[vaultId] || { onlineUsers: [], editingUsers: [] };
}
