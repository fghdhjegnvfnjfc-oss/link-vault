import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Server as SocketIOServer, Socket as ServerSocket } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { createServer } from "http";
import { initializeWebSocket } from "./websocket";

describe("WebSocket Integration", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let serverSocket: ServerSocket;

  beforeEach((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
    });

    // Initialize WebSocket handlers
    initializeWebSocket(io);

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = ioClient(`http://localhost:${port}`, {
        reconnection: false,
        auth: {
          userId: 1,
          vaultId: 1,
        },
      });

      io.on("connection", (socket) => {
        serverSocket = socket;
        done();
      });
    });
  });

  afterEach(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  describe("Connection", () => {
    it("should establish connection with auth credentials", (done) => {
      clientSocket.on("connect", () => {
        expect(serverSocket).toBeDefined();
        expect(serverSocket.handshake.auth.userId).toBe(1);
        expect(serverSocket.handshake.auth.vaultId).toBe(1);
        done();
      });
    });

    it("should handle heartbeat from client", (done) => {
      const heartbeatHandler = vi.fn();
      serverSocket.on("heartbeat", heartbeatHandler);

      clientSocket.emit("heartbeat");

      setTimeout(() => {
        expect(heartbeatHandler).toHaveBeenCalled();
        done();
      }, 100);
    });

    it("should broadcast user joined event", (done) => {
      const joinHandler = vi.fn();
      clientSocket.on("user:joined", joinHandler);

      // Simulate another user joining
      serverSocket.emit("user:joined", {
        userId: 2,
        sessionId: "session-2",
        userName: "Alice",
        userEmail: "alice@example.com",
        userColor: "oklch(0.65 0.18 200)",
      });

      setTimeout(() => {
        expect(joinHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 2,
            userName: "Alice",
          })
        );
        done();
      }, 100);
    });
  });

  describe("Presence Tracking", () => {
    it("should sync presence state on connection", (done) => {
      const syncHandler = vi.fn();
      clientSocket.on("presence:sync", syncHandler);

      // Simulate server sending presence sync
      serverSocket.emit("presence:sync", {
        onlineUsers: [
          {
            userId: 1,
            sessionId: "session-1",
            userName: "Bob",
            userEmail: "bob@example.com",
            userColor: "oklch(0.65 0.18 200)",
            isOnline: true,
          },
        ],
        editingUsers: [],
      });

      setTimeout(() => {
        expect(syncHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            onlineUsers: expect.arrayContaining([
              expect.objectContaining({ userName: "Bob" }),
            ]),
          })
        );
        done();
      }, 100);
    });

    it("should track user left event", (done) => {
      const leftHandler = vi.fn();
      clientSocket.on("user:left", leftHandler);

      serverSocket.emit("user:left", {
        userId: 2,
        sessionId: "session-2",
      });

      setTimeout(() => {
        expect(leftHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 2,
          })
        );
        done();
      }, 100);
    });
  });

  describe("Edit Tracking", () => {
    it("should broadcast edit started event", (done) => {
      const editStartHandler = vi.fn();
      clientSocket.on("edit:started", editStartHandler);

      serverSocket.emit("edit:started", {
        userId: 2,
        sessionId: "session-2",
        userName: "Alice",
        userColor: "oklch(0.65 0.18 200)",
        resourceType: "link",
        resourceId: 1,
        fieldName: "title",
      });

      setTimeout(() => {
        expect(editStartHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceType: "link",
            resourceId: 1,
            fieldName: "title",
          })
        );
        done();
      }, 100);
    });

    it("should handle edit field updates", (done) => {
      const updateHandler = vi.fn();
      clientSocket.on("edit:field-update", updateHandler);

      serverSocket.emit("edit:field-update", {
        userId: 2,
        sessionId: "session-2",
        resourceType: "link",
        resourceId: 1,
        fieldName: "title",
        value: "Updated Title",
      });

      setTimeout(() => {
        expect(updateHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            fieldName: "title",
            value: "Updated Title",
          })
        );
        done();
      }, 100);
    });

    it("should broadcast edit ended event", (done) => {
      const editEndHandler = vi.fn();
      clientSocket.on("edit:ended", editEndHandler);

      serverSocket.emit("edit:ended", {
        userId: 2,
        sessionId: "session-2",
        resourceType: "link",
        resourceId: 1,
        fieldName: "title",
      });

      setTimeout(() => {
        expect(editEndHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceType: "link",
            resourceId: 1,
          })
        );
        done();
      }, 100);
    });

    it("should detect edit conflicts", (done) => {
      const conflictHandler = vi.fn();
      clientSocket.on("edit:conflict", conflictHandler);

      serverSocket.emit("edit:conflict", {
        resourceType: "link",
        resourceId: 1,
        fieldName: "title",
        editingUser: {
          userName: "Alice",
          userColor: "oklch(0.65 0.18 200)",
        },
      });

      setTimeout(() => {
        expect(conflictHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceType: "link",
            editingUser: expect.objectContaining({
              userName: "Alice",
            }),
          })
        );
        done();
      }, 100);
    });
  });

  describe("Client Emit Events", () => {
    it("should handle edit:start from client", (done) => {
      const editStartHandler = vi.fn();
      serverSocket.on("edit:start", editStartHandler);

      clientSocket.emit("edit:start", {
        resourceType: "link",
        resourceId: 1,
        fieldName: "title",
      });

      setTimeout(() => {
        expect(editStartHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceType: "link",
            resourceId: 1,
          })
        );
        done();
      }, 100);
    });

    it("should handle edit:field from client", (done) => {
      const fieldHandler = vi.fn();
      serverSocket.on("edit:field", fieldHandler);

      clientSocket.emit("edit:field", {
        resourceType: "link",
        resourceId: 1,
        fieldName: "title",
        value: "New Title",
      });

      setTimeout(() => {
        expect(fieldHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            fieldName: "title",
            value: "New Title",
          })
        );
        done();
      }, 100);
    });

    it("should handle edit:end from client", (done) => {
      const editEndHandler = vi.fn();
      serverSocket.on("edit:end", editEndHandler);

      clientSocket.emit("edit:end", {
        resourceType: "link",
        resourceId: 1,
        fieldName: "title",
      });

      setTimeout(() => {
        expect(editEndHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceType: "link",
            resourceId: 1,
          })
        );
        done();
      }, 100);
    });
  });

  describe("Error Handling", () => {
    it("should handle socket errors gracefully", (done) => {
      const errorHandler = vi.fn();
      clientSocket.on("error", errorHandler);

      serverSocket.emit("error", new Error("Test error"));

      setTimeout(() => {
        expect(errorHandler).toHaveBeenCalled();
        done();
      }, 100);
    });

    it("should handle disconnect gracefully", (done) => {
      const disconnectHandler = vi.fn();
      clientSocket.on("disconnect", disconnectHandler);

      serverSocket.disconnect();

      setTimeout(() => {
        expect(disconnectHandler).toHaveBeenCalled();
        done();
      }, 100);
    });
  });
});
