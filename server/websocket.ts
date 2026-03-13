import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
  onlineUsers: UserPresence[];
  editingUsers: EditingUser[];
}

// In-memory store for active presence (single vault)
const vaultPresence: VaultPresence = {
  onlineUsers: [],
  editingUsers: [],
};

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
      const sessionId = socket.id;

      if (!userId) {
        return next(new Error("Missing userId"));
      }

      // Store metadata on socket
      socket.data.userId = userId;
      socket.data.sessionId = sessionId;

      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as number;
    const sessionId = socket.data.sessionId as string;

    console.log(`[WebSocket] User ${userId} connected`);

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

      // Add user to online list
      const userPresence: UserPresence = {
        userId,
        sessionId,
        userName,
        userEmail,
        userColor,
        isOnline: true,
      };

      vaultPresence.onlineUsers.push(userPresence);

      // Notify all users about new presence
      io.emit("user:joined", {
        userId,
        sessionId,
        userName,
        userColor,
      });

      // Send current presence state to newly connected user
      io.to(socket.id).emit("presence:sync", {
        onlineUsers: vaultPresence.onlineUsers,
        editingUsers: vaultPresence.editingUsers,
      });

      // ─── Edit State Events ───────────────────────────────────────

      socket.on("edit:start", async (data: {
        resourceType: "link" | "folder";
        resourceId: number;
        fieldName?: string;
      }) => {
        const { resourceType, resourceId, fieldName } = data;

        try {
          // Check if someone else is already editing this
          const existingEdit = vaultPresence.editingUsers.find(
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

          vaultPresence.editingUsers.push(editingUser);

          // Broadcast to all users
          io.emit("edit:started", {
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
        const editingUser = vaultPresence.editingUsers.find(
          (e) =>
            e.userId === userId &&
            e.resourceType === resourceType &&
            e.resourceId === resourceId &&
            e.fieldName === fieldName
        );

        if (editingUser) {
          editingUser.currentValue = value;
        }

        // Broadcast field change to all users
        io.emit("edit:field-update", {
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
          vaultPresence.editingUsers = vaultPresence.editingUsers.filter(
            (e) =>
              !(
                e.userId === userId &&
                e.resourceType === resourceType &&
                e.resourceId === resourceId &&
                e.fieldName === fieldName
              )
          );

          // Broadcast to all users
          io.emit("edit:ended", {
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

      // ─── Flash Identification ──────────────────────────────────────

      socket.on("flash:identify", async (data: { targetSessionId: string }) => {
        try {
          // Send white screen flash to target user
          io.to(data.targetSessionId).emit("flash:trigger", {
            flashColor: "white",
            duration: 500,
          });
          console.log(`[WebSocket] Flash sent to session ${data.targetSessionId}`);
        } catch (error) {
          console.error("[WebSocket] Error sending flash:", error);
          socket.emit("error", { message: "Failed to send flash" });
        }
      });

      // ─── Kick User ──────────────────────────────────────────────────

      socket.on("user:kick", async (data: { targetSessionId: string }) => {
        try {
          // Disconnect the target user
          io.to(data.targetSessionId).emit("user:kicked", {
            reason: "You have been kicked from the vault",
          });
          
          // Force disconnect after a short delay
          setTimeout(() => {
            const targetSocket = io.sockets.sockets.get(data.targetSessionId);
            if (targetSocket) {
              targetSocket.disconnect(true);
            }
          }, 100);

          console.log(`[WebSocket] User kicked from session ${data.targetSessionId}`);
          socket.emit("kick:success", { targetSessionId: data.targetSessionId });
        } catch (error) {
          console.error("[WebSocket] Error kicking user:", error);
          socket.emit("error", { message: "Failed to kick user" });
        }
      });

      //      // ─── Vault Data Sync Events ──────────────────────────────────

      socket.on("vault:link-added", (data: { link: any }) => {
        io.emit("vault:link-added", data);
      });

      socket.on("vault:link-updated", (data: { linkId: number; updates: any }) => {
        io.emit("vault:link-updated", data);
      });

      socket.on("vault:link-deleted", (data: { linkId: number }) => {
        io.emit("vault:link-deleted", data);
      });

      socket.on("vault:folder-added", (data: { folder: any }) => {
        io.emit("vault:folder-added", data);
      });

      socket.on("vault:folder-updated", (data: { folderId: number; updates: any }) => {
        io.emit("vault:folder-updated", data);
      });

      socket.on("vault:folder-deleted", (data: { folderId: number }) => {
        io.emit("vault:folder-deleted", data);
      });

      socket.on("vault:reorder-links", (data: { linkIds: number[] }) => {
        io.emit("vault:reorder-links", data);
      });

      socket.on("vault:reorder-folders", (data: { folderIds: number[] }) => {
        io.emit("vault:reorder-folders", data);
      });

      // ─── Heartbeat ────────────────────────────────────

      socket.on("heartbeat", async () => {
        socket.emit("heartbeat:ack");
      });

      // ─── Disconnect ──────────────────────────────────────────────

      socket.on("disconnect", async () => {
        console.log(`[WebSocket] User ${userId} disconnected`);

        try {
          // Remove from online users
          vaultPresence.onlineUsers = vaultPresence.onlineUsers.filter(
            (u) => u.sessionId !== sessionId
          );

          // Remove from editing users
          vaultPresence.editingUsers = vaultPresence.editingUsers.filter(
            (e) => e.sessionId !== sessionId
          );

          // Notify others
          io.emit("user:left", {
            userId,
            sessionId,
          });
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

export function getVaultPresence() {
  return vaultPresence;
}
