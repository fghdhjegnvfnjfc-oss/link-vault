import { useCallback, useRef, useEffect, useState } from "react";
import { Socket } from "socket.io-client";

export interface EditConflict {
  resourceType: "link" | "folder";
  resourceId: number;
  fieldName?: string;
  editingUser: {
    userName: string;
    userColor: string;
  };
}

interface UseEditTrackingOptions {
  socket: Socket | null;
  userId: number;
  enabled?: boolean;
}

/**
 * Hook to manage edit state tracking and conflict detection
 * Handles starting/ending edits and detecting when another user is editing the same resource
 */
export function useEditTracking({
  socket,
  userId,
  enabled = true,
}: UseEditTrackingOptions) {
  const [editConflict, setEditConflict] = useState<EditConflict | null>(null);
  const editingRef = useRef<
    Set<string> // Track active edits by "resourceType:resourceId:fieldName"
  >(new Set());

  // Start editing a resource
  const startEdit = useCallback(
    (
      resourceType: "link" | "folder",
      resourceId: number,
      fieldName?: string
    ) => {
      if (!socket || !enabled) return;

      const editKey = `${resourceType}:${resourceId}:${fieldName || ""}`;
      editingRef.current.add(editKey);

      socket.emit("edit:start", {
        resourceType,
        resourceId,
        fieldName,
      });
    },
    [socket, enabled]
  );

  // Update field value while editing
  const updateField = useCallback(
    (
      resourceType: "link" | "folder",
      resourceId: number,
      fieldName: string,
      value: string
    ) => {
      if (!socket || !enabled) return;

      socket.emit("edit:field", {
        resourceType,
        resourceId,
        fieldName,
        value,
      });
    },
    [socket, enabled]
  );

  // End editing a resource
  const endEdit = useCallback(
    (
      resourceType: "link" | "folder",
      resourceId: number,
      fieldName?: string
    ) => {
      if (!socket || !enabled) return;

      const editKey = `${resourceType}:${resourceId}:${fieldName || ""}`;
      editingRef.current.delete(editKey);

      socket.emit("edit:end", {
        resourceType,
        resourceId,
        fieldName,
      });
    },
    [socket, enabled]
  );

  // Listen for edit conflicts
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleEditConflict = (conflict: EditConflict) => {
      console.warn("[EditTracking] Edit conflict detected:", conflict);
      setEditConflict(conflict);

      // Auto-clear conflict after 5 seconds
      const timeout = setTimeout(() => {
        setEditConflict(null);
      }, 5000);

      return () => clearTimeout(timeout);
    };

    socket.on("edit:conflict", handleEditConflict);

    return () => {
      socket.off("edit:conflict", handleEditConflict);
    };
  }, [socket, enabled]);

  // Cleanup on unmount - end all active edits
  useEffect(() => {
    return () => {
      editingRef.current.forEach((editKey) => {
        const [resourceType, resourceId, fieldName] = editKey.split(":");
        endEdit(
          resourceType as "link" | "folder",
          parseInt(resourceId),
          fieldName || undefined
        );
      });
    };
  }, [endEdit]);

  return {
    startEdit,
    updateField,
    endEdit,
    editConflict,
    clearConflict: () => setEditConflict(null),
    isEditing: editingRef.current.size > 0,
  };
}

/**
 * Hook to manage a single collaborative input field
 * Combines edit tracking with local state management
 */
export function useCollaborativeField(
  resourceType: "link" | "folder",
  resourceId: number,
  fieldName: string,
  initialValue: string,
  options: {
    socket: Socket | null;
    userId: number;
    enabled?: boolean;
  }
) {
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const { startEdit, updateField, endEdit, editConflict } = useEditTracking({
    socket: options.socket,
    userId: options.userId,
    enabled: options.enabled,
  });

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    startEdit(resourceType, resourceId, fieldName);
  }, [startEdit, resourceType, resourceId, fieldName]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    endEdit(resourceType, resourceId, fieldName);
  }, [endEdit, resourceType, resourceId, fieldName]);

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
      if (isFocused) {
        updateField(resourceType, resourceId, fieldName, newValue);
      }
    },
    [isFocused, updateField, resourceType, resourceId, fieldName]
  );

  // Update local value when initialValue changes (from sync)
  useEffect(() => {
    if (!isFocused) {
      setValue(initialValue);
    }
  }, [initialValue, isFocused]);

  return {
    value,
    setValue: handleChange,
    isFocused,
    onFocus: handleFocus,
    onBlur: handleBlur,
    hasConflict:
      editConflict?.resourceType === resourceType &&
      editConflict?.resourceId === resourceId &&
      editConflict?.fieldName === fieldName,
    conflictUser: editConflict?.editingUser,
  };
}
