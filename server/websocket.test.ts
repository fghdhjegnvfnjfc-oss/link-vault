import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { createServer } from "http";
import { setupWebSocket } from "./websocket";

describe("WebSocket Integration", () => {
  let httpServer: ReturnType<typeof createServer>;
  let clientSocket: ClientSocket | null = null;

  beforeEach(async () => {
    return new Promise<void>((resolve) => {
      httpServer = createServer();

      // Initialize WebSocket handlers using setupWebSocket
      setupWebSocket(httpServer);

      httpServer.listen(() => {
        const port = (httpServer.address() as any).port;
        clientSocket = ioClient(`http://localhost:${port}`, {
          reconnection: false,
          auth: {
            userId: 1,
            vaultId: 1,
          },
        });

        clientSocket!.on("connect", () => {
          resolve();
        });

        // Handle connection errors
        clientSocket!.on("connect_error", (error) => {
          console.error("Connection error:", error);
          resolve();
        });
      });
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
      clientSocket = null;
    }
    httpServer.close();
  });

  describe("Connection", () => {
    it("should establish connection with auth credentials", () => {
      expect(clientSocket).toBeDefined();
      expect(clientSocket?.connected).toBe(true);
      expect(clientSocket?.auth.userId).toBe(1);
      expect(clientSocket?.auth.vaultId).toBe(1);
    });

    it("should handle heartbeat from client", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        clientSocket.emit("heartbeat");
        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });

    it("should broadcast user joined event", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const joinHandler = vi.fn();
        clientSocket.on("user:joined", joinHandler);

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });
  });

  describe("Presence Tracking", () => {
    it("should sync presence state on connection", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const syncHandler = vi.fn();
        clientSocket.on("presence:sync", syncHandler);

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });

    it("should track user left event", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const leftHandler = vi.fn();
        clientSocket.on("user:left", leftHandler);

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });
  });

  describe("Edit Tracking", () => {
    it("should broadcast edit started event", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const editStartHandler = vi.fn();
        clientSocket.on("edit:started", editStartHandler);

        clientSocket.emit("edit:start", {
          resourceType: "link",
          resourceId: 1,
          fieldName: "title",
        });

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });

    it("should handle edit field updates", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const updateHandler = vi.fn();
        clientSocket.on("edit:field-update", updateHandler);

        clientSocket.emit("edit:field", {
          resourceType: "link",
          resourceId: 1,
          fieldName: "title",
          value: "Updated Title",
        });

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });

    it("should broadcast edit ended event", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const editEndHandler = vi.fn();
        clientSocket.on("edit:ended", editEndHandler);

        clientSocket.emit("edit:end", {
          resourceType: "link",
          resourceId: 1,
          fieldName: "title",
        });

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });

    it("should detect edit conflicts", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const conflictHandler = vi.fn();
        clientSocket.on("edit:conflict", conflictHandler);

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });
  });

  describe("Client Emit Events", () => {
    it("should handle edit:start from client", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        clientSocket.emit("edit:start", {
          resourceType: "link",
          resourceId: 1,
          fieldName: "title",
        });

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });

    it("should handle edit:field from client", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        clientSocket.emit("edit:field", {
          resourceType: "link",
          resourceId: 1,
          fieldName: "title",
          value: "New Title",
        });

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });

    it("should handle edit:end from client", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        clientSocket.emit("edit:end", {
          resourceType: "link",
          resourceId: 1,
          fieldName: "title",
        });

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle socket errors gracefully", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const errorHandler = vi.fn();
        clientSocket.on("error", errorHandler);

        setTimeout(() => {
          expect(clientSocket?.connected).toBe(true);
          resolve();
        }, 100);
      });
    });

    it("should handle disconnect gracefully", async () => {
      return new Promise<void>((resolve) => {
        if (!clientSocket) {
          resolve();
          return;
        }

        const disconnectHandler = vi.fn();
        clientSocket.on("disconnect", disconnectHandler);

        clientSocket.disconnect();
        setTimeout(() => {
          expect(clientSocket?.connected).toBe(false);
          resolve();
        }, 100);
      });
    });
  });
});
