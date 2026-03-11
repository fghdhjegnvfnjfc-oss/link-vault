import React, { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

interface ConflictWarningProps {
  resourceName: string;
  editingUser: {
    userName: string;
    userColor: string;
  } | null;
  onDismiss: () => void;
  autoHideDuration?: number;
}

/**
 * Component to display a warning when multiple users are editing the same resource
 */
export function ConflictWarning({
  resourceName,
  editingUser,
  onDismiss,
  autoHideDuration = 5000,
}: ConflictWarningProps) {
  const [isVisible, setIsVisible] = useState(!!editingUser);

  useEffect(() => {
    if (!editingUser) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [editingUser, autoHideDuration, onDismiss]);

  if (!isVisible || !editingUser) {
    return null;
  }

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border animate-fade-in"
      style={{
        backgroundColor: `${editingUser.userColor}15`,
        borderColor: `${editingUser.userColor}40`,
        color: editingUser.userColor,
      }}
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {editingUser.userName} is editing <strong>{resourceName}</strong>
        </p>
        <p className="text-xs mt-1 opacity-75">
          Changes may conflict. Coordinate with this user before saving.
        </p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          onDismiss();
        }}
        className="flex-shrink-0 p-1 hover:opacity-75 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Component to show multiple users editing the same resource
 */
export function MultiUserEditingWarning({
  resourceName,
  editingUsers,
  onDismiss,
}: {
  resourceName: string;
  editingUsers: Array<{
    userName: string;
    userColor: string;
  }>;
  onDismiss: () => void;
}) {
  if (editingUsers.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border animate-fade-in"
      style={{
        backgroundColor: "oklch(0.62 0.22 25 / 15%)",
        borderColor: "oklch(0.62 0.22 25 / 40%)",
        color: "oklch(0.70 0.20 25)",
      }}
    >
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {editingUsers.length} user{editingUsers.length > 1 ? "s are" : " is"}{" "}
          editing <strong>{resourceName}</strong>
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          {editingUsers.map((user) => (
            <div
              key={user.userName}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{
                backgroundColor: `${user.userColor}20`,
                color: user.userColor,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: user.userColor }}
              />
              {user.userName}
            </div>
          ))}
        </div>
        <p className="text-xs mt-2 opacity-75">
          Coordinate with these users before saving to avoid conflicts.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 hover:opacity-75 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Component to show real-time field update from another user
 */
export function FieldUpdateIndicator({
  fieldName,
  editingUser,
  currentValue,
}: {
  fieldName: string;
  editingUser: {
    userName: string;
    userColor: string;
  };
  currentValue?: string;
}) {
  return (
    <div
      className="text-xs px-2 py-1 rounded flex items-center gap-1.5"
      style={{
        backgroundColor: `${editingUser.userColor}15`,
        color: editingUser.userColor,
        border: `1px solid ${editingUser.userColor}30`,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ backgroundColor: editingUser.userColor }}
      />
      <span>
        {editingUser.userName} is updating <strong>{fieldName}</strong>
      </span>
      {currentValue && (
        <span className="ml-auto opacity-75 truncate max-w-xs">
          "{currentValue}"
        </span>
      )}
    </div>
  );
}
