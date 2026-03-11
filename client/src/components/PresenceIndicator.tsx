import React from "react";
import { UserPresence } from "@/hooks/usePresence";
import { Users } from "lucide-react";

interface PresenceIndicatorProps {
  onlineUsers: UserPresence[];
  currentUserId?: number;
}

/**
 * Component to display online users with their avatars and colors
 */
export function PresenceIndicator({
  onlineUsers,
  currentUserId,
}: PresenceIndicatorProps) {
  if (onlineUsers.length === 0) {
    return null;
  }

  // Filter out current user and get unique users
  const otherUsers = onlineUsers.filter((u) => u.userId !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Users size={14} style={{ color: "oklch(0.55 0.02 220)" }} />
      <div className="flex items-center -space-x-2">
        {otherUsers.slice(0, 3).map((user) => (
          <div
            key={user.sessionId}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-slate-700"
            style={{
              backgroundColor: user.userColor,
              color: "#0F172A",
            }}
            title={`${user.userName} (${user.userEmail})`}
          >
            {user.userName.charAt(0).toUpperCase()}
          </div>
        ))}
        {otherUsers.length > 3 && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border border-slate-700"
            style={{
              backgroundColor: "oklch(0.55 0.02 220)",
              color: "#0F172A",
            }}
            title={`+${otherUsers.length - 3} more`}
          >
            +{otherUsers.length - 3}
          </div>
        )}
      </div>
      <span
        className="text-xs"
        style={{ color: "oklch(0.55 0.02 220)" }}
      >
        {otherUsers.length} online
      </span>
    </div>
  );
}

/**
 * Component to display a single user's presence indicator
 */
export function UserAvatar({
  user,
  size = "sm",
}: {
  user: UserPresence;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "w-5 h-5 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold border border-slate-700`}
      style={{
        backgroundColor: user.userColor,
        color: "#0F172A",
      }}
      title={`${user.userName} (${user.userEmail})`}
    >
      {user.userName.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Component to show editing status for a specific resource
 */
export function EditingIndicator({
  editingUsers,
  resourceType,
  resourceId,
  fieldName,
}: {
  editingUsers: Array<{
    userId: number;
    userName: string;
    userColor: string;
  }>;
  resourceType: "link" | "folder";
  resourceId: number;
  fieldName?: string;
}) {
  if (editingUsers.length === 0) {
    return null;
  }

  const user = editingUsers[0];

  return (
    <div
      className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5"
      style={{
        backgroundColor: `${user.userColor}20`,
        color: user.userColor,
        border: `1px solid ${user.userColor}40`,
      }}
    >
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: user.userColor }}
      />
      <span>{user.userName} is editing</span>
    </div>
  );
}
