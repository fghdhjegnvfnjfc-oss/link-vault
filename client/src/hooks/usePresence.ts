import { useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

export interface UserPresence {
  userId: number;
  sessionId: string;
  userName: string;
  userEmail: string;
  userColor: string;
  isOnline: boolean;
}

export interface PresenceState {
  onlineUsers: UserPresence[];
  editingUsers: EditingUser[];
}

export interface EditingUser {
  userId: number;
  sessionId: string;
  userName: string;
  userColor: string;
  resourceType: "link" | "folder";
  resourceId: number;
  fieldName?: string;
  currentValue?: string;
}

interface UsePresenceOptions {
  socket: Socket | null;
  enabled?: boolean;
}

/**
 * Hook to track presence state (online users and who's editing what)
 */
export function usePresence({
  socket,
  enabled = true,
}: UsePresenceOptions): PresenceState {
  const [presence, setPresence] = useState<PresenceState>({
    onlineUsers: [],
    editingUsers: [],
  });

  // Sync initial presence state
  useEffect(() => {
    if (!socket || !enabled) return;

    const handlePresenceSync = (data: PresenceState) => {
      console.log("[Presence] Synced presence state:", data);
      setPresence(data);
    };

    socket.on("presence:sync", handlePresenceSync);

    return () => {
      socket.off("presence:sync", handlePresenceSync);
    };
  }, [socket, enabled]);

  // Handle user joined
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleUserJoined = (user: Omit<UserPresence, "isOnline">) => {
      console.log("[Presence] User joined:", user);
      setPresence((prev) => ({
        ...prev,
        onlineUsers: [
          ...prev.onlineUsers.filter((u) => u.sessionId !== user.sessionId),
          { ...user, isOnline: true },
        ],
      }));
    };

    socket.on("user:joined", handleUserJoined);

    return () => {
      socket.off("user:joined", handleUserJoined);
    };
  }, [socket, enabled]);

  // Handle user left
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleUserLeft = (data: { userId: number; sessionId: string }) => {
      console.log("[Presence] User left:", data);
      setPresence((prev) => ({
        ...prev,
        onlineUsers: prev.onlineUsers.filter(
          (u) => u.sessionId !== data.sessionId
        ),
        editingUsers: prev.editingUsers.filter(
          (e) => e.sessionId !== data.sessionId
        ),
      }));
    };

    socket.on("user:left", handleUserLeft);

    return () => {
      socket.off("user:left", handleUserLeft);
    };
  }, [socket, enabled]);

  // Handle edit started
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleEditStarted = (user: EditingUser) => {
      console.log("[Presence] Edit started:", user);
      setPresence((prev) => ({
        ...prev,
        editingUsers: [
          ...prev.editingUsers.filter(
            (e) =>
              !(
                e.userId === user.userId &&
                e.resourceType === user.resourceType &&
                e.resourceId === user.resourceId &&
                e.fieldName === user.fieldName
              )
          ),
          user,
        ],
      }));
    };

    socket.on("edit:started", handleEditStarted);

    return () => {
      socket.off("edit:started", handleEditStarted);
    };
  }, [socket, enabled]);

  // Handle field update
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleFieldUpdate = (data: {
      userId: number;
      sessionId: string;
      resourceType: "link" | "folder";
      resourceId: number;
      fieldName: string;
      value: string;
    }) => {
      setPresence((prev) => ({
        ...prev,
        editingUsers: prev.editingUsers.map((e) =>
          e.userId === data.userId &&
          e.resourceType === data.resourceType &&
          e.resourceId === data.resourceId &&
          e.fieldName === data.fieldName
            ? { ...e, currentValue: data.value }
            : e
        ),
      }));
    };

    socket.on("edit:field-update", handleFieldUpdate);

    return () => {
      socket.off("edit:field-update", handleFieldUpdate);
    };
  }, [socket, enabled]);

  // Handle edit ended
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleEditEnded = (data: {
      userId: number;
      sessionId: string;
      resourceType: "link" | "folder";
      resourceId: number;
      fieldName?: string;
    }) => {
      console.log("[Presence] Edit ended:", data);
      setPresence((prev) => ({
        ...prev,
        editingUsers: prev.editingUsers.filter(
          (e) =>
            !(
              e.userId === data.userId &&
              e.resourceType === data.resourceType &&
              e.resourceId === data.resourceId &&
              e.fieldName === data.fieldName
            )
        ),
      }));
    };

    socket.on("edit:ended", handleEditEnded);

    return () => {
      socket.off("edit:ended", handleEditEnded);
    };
  }, [socket, enabled]);

  return presence;
}

/**
 * Get list of users currently editing a specific resource
 */
export function getEditingUsers(
  editingUsers: EditingUser[],
  resourceType: "link" | "folder",
  resourceId: number,
  fieldName?: string
): EditingUser[] {
  return editingUsers.filter(
    (e) =>
      e.resourceType === resourceType &&
      e.resourceId === resourceId &&
      (!fieldName || e.fieldName === fieldName)
  );
}

/**
 * Check if a resource is being edited by someone else
 */
export function isResourceBeingEdited(
  editingUsers: EditingUser[],
  currentUserId: number,
  resourceType: "link" | "folder",
  resourceId: number,
  fieldName?: string
): boolean {
  return editingUsers.some(
    (e) =>
      e.userId !== currentUserId &&
      e.resourceType === resourceType &&
      e.resourceId === resourceId &&
      (!fieldName || e.fieldName === fieldName)
  );
}

/**
 * Get the user currently editing a specific field
 */
export function getEditingUser(
  editingUsers: EditingUser[],
  resourceType: "link" | "folder",
  resourceId: number,
  fieldName?: string
): EditingUser | undefined {
  return editingUsers.find(
    (e) =>
      e.resourceType === resourceType &&
      e.resourceId === resourceId &&
      (!fieldName || e.fieldName === fieldName)
  );
}
