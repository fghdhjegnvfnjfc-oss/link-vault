import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseWebSocketOptions {
  userId: number;
  vaultId: number;
  enabled?: boolean;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

/**
 * Hook to manage Socket.IO connection for real-time collaboration
 * Handles connection lifecycle, reconnection, and error states
 */
export function useWebSocket({
  userId,
  vaultId,
  enabled = true,
}: UseWebSocketOptions): WebSocketContextType {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !userId || !vaultId) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Determine socket server URL
      const socketUrl =
        process.env.NODE_ENV === "production"
          ? window.location.origin
          : "http://localhost:3000";

      // Create socket with auth credentials
      const socket = io(socketUrl, {
        auth: {
          userId,
          vaultId,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Connection event handlers
      socket.on("connect", () => {
        console.log("[WebSocket] Connected to server");
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      });

      socket.on("disconnect", (reason) => {
        console.log("[WebSocket] Disconnected:", reason);
        setIsConnected(false);
        if (reason === "io server disconnect") {
          // Server disconnected, try to reconnect
          socket.connect();
        }
      });

      socket.on("connect_error", (err: Error) => {
        console.error("[WebSocket] Connection error:", err);
        setError(err);
        setIsConnecting(false);
      });

      socket.on("error", (err: Error) => {
        console.error("[WebSocket] Socket error:", err);
        setError(err);
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsConnecting(false);
    }
  }, [enabled, userId, vaultId]);

  // Heartbeat to keep session alive
  useEffect(() => {
    if (!isConnected || !socketRef.current) {
      return;
    }

    const heartbeatInterval = setInterval(() => {
      socketRef.current?.emit("heartbeat");
    }, 30000); // Send heartbeat every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
  };
}

/**
 * Helper to emit events with type safety
 */
export function useSocketEmit(socket: Socket | null) {
  return useCallback(
    (event: string, data?: unknown) => {
      if (socket?.connected) {
        socket.emit(event, data);
      } else {
        console.warn(`[WebSocket] Cannot emit "${event}" - socket not connected`);
      }
    },
    [socket]
  );
}

/**
 * Helper to listen to socket events with cleanup
 */
export function useSocketOn(
  socket: Socket | null,
  event: string,
  handler: (...args: unknown[]) => void
) {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
