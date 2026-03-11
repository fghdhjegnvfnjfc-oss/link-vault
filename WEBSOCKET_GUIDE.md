# WebSocket Collaborative Editing Guide

This document describes the real-time collaborative editing system for Link Vault, enabling multiple users to work together with presence awareness, conflict detection, and live field synchronization.

## Architecture Overview

The system consists of three main components:

1. **WebSocket Server** (`server/websocket.ts`) - Manages connections, presence tracking, and conflict detection
2. **Frontend Hooks** - React hooks for managing WebSocket state and events
3. **UI Components** - React components for displaying presence and edit status

## Features

### Phase 1: Presence Awareness ✅
- **Online User Tracking**: See who's currently online with avatars and colors
- **User Avatars**: Colored circles with initials for visual identification
- **Online Count**: Real-time count of active users
- **Session Management**: Automatic cleanup when users disconnect

### Phase 2: Real-time Editing ✅
- **Edit Tracking**: See who's editing which resource
- **Field Synchronization**: Live updates as users type
- **Editing Indicators**: Visual feedback showing which user is editing what
- **Cursor Position**: Track which field is being edited

### Phase 3: Conflict Resolution (Ready for Implementation)
- **Conflict Detection**: Alert when multiple users edit the same field
- **Conflict Warnings**: Visual warnings with user information
- **Last-Write-Wins**: Simple conflict resolution strategy
- **Merge Strategies**: Extensible system for custom conflict handling

## Frontend Integration

### 1. Initialize WebSocket Connection

```typescript
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePresence } from "@/hooks/usePresence";

function MyComponent() {
  const { socket, isConnected } = useWebSocket({
    userId: currentUser.id,
    vaultId: vaultId,
    enabled: true,
  });

  const presence = usePresence({ socket });

  return (
    <div>
      {isConnected && <span>Connected</span>}
      <p>Online users: {presence.onlineUsers.length}</p>
    </div>
  );
}
```

### 2. Track Edits

```typescript
import { useEditTracking } from "@/hooks/useEditTracking";

function EditLinkModal({ link }) {
  const { startEdit, updateField, endEdit, editConflict } = useEditTracking({
    socket,
    userId: currentUser.id,
  });

  const handleTitleChange = (newValue) => {
    updateField("link", link.id, "title", newValue);
  };

  const handleFocus = () => {
    startEdit("link", link.id, "title");
  };

  const handleBlur = () => {
    endEdit("link", link.id, "title");
  };

  return (
    <div>
      <input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {editConflict && (
        <p>⚠️ {editConflict.editingUser.userName} is also editing this</p>
      )}
    </div>
  );
}
```

### 3. Use Collaborative Input Hook

```typescript
import { useCollaborativeField } from "@/hooks/useEditTracking";

function EditLinkModal({ link }) {
  const title = useCollaborativeField(
    "link",
    link.id,
    "title",
    link.title,
    { socket, userId: currentUser.id }
  );

  return (
    <input
      value={title.value}
      onChange={(e) => title.setValue(e.target.value)}
      onFocus={title.onFocus}
      onBlur={title.onBlur}
      style={{
        borderColor: title.hasConflict ? "red" : "normal",
      }}
    />
  );
}
```

### 4. Display Presence Indicators

```typescript
import { PresenceIndicator, EditingIndicator } from "@/components/PresenceIndicator";
import { ConflictWarning } from "@/components/ConflictWarning";

function VaultPage() {
  const presence = usePresence({ socket });

  return (
    <div>
      {/* Show online users */}
      <PresenceIndicator onlineUsers={presence.onlineUsers} />

      {/* Show who's editing each link */}
      {presence.editingUsers.map((edit) => (
        <EditingIndicator
          key={`${edit.userId}-${edit.resourceId}`}
          editingUsers={[edit]}
          resourceType={edit.resourceType}
          resourceId={edit.resourceId}
          fieldName={edit.fieldName}
        />
      ))}

      {/* Show conflict warnings */}
      {editConflict && (
        <ConflictWarning
          resourceName="Link Title"
          editingUser={editConflict.editingUser}
          onDismiss={() => clearConflict()}
        />
      )}
    </div>
  );
}
```

## WebSocket Events

### Server → Client Events

#### Presence Events
- `presence:sync` - Initial presence state sync
- `user:joined` - New user connected
- `user:left` - User disconnected

#### Edit Events
- `edit:started` - User started editing a resource
- `edit:field-update` - User updated a field value
- `edit:ended` - User finished editing
- `edit:conflict` - Conflict detected (multiple users editing same field)

### Client → Server Events

#### Edit Events
- `edit:start` - Notify server user started editing
- `edit:field` - Send field update to server
- `edit:end` - Notify server user finished editing

#### Connection Events
- `heartbeat` - Keep-alive signal (sent every 30 seconds)

## Event Data Structures

### UserPresence
```typescript
interface UserPresence {
  userId: number;
  sessionId: string;
  userName: string;
  userEmail: string;
  userColor: string;
  isOnline: boolean;
}
```

### EditingUser
```typescript
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
```

### EditConflict
```typescript
interface EditConflict {
  resourceType: "link" | "folder";
  resourceId: number;
  fieldName?: string;
  editingUser: {
    userName: string;
    userColor: string;
  };
}
```

## Color Assignment

Users are assigned colors from a predefined palette:
```typescript
const USER_COLORS = [
  "oklch(0.65 0.18 200)",  // Blue
  "oklch(0.75 0.18 145)",  // Green
  "oklch(0.70 0.20 25)",   // Red
  "oklch(0.68 0.20 320)",  // Purple
  "oklch(0.75 0.18 85)",   // Yellow
];
```

Colors are assigned based on user ID to ensure consistency across sessions.

## Database Integration

The WebSocket system integrates with the database through:

1. **User Lookup**: Fetch user details (name, email) from database
2. **Vault Access**: Verify users have access to the vault
3. **Audit Logging**: Log all edit events to database
4. **Conflict Detection**: Query database for concurrent edits

## Testing

Run the WebSocket tests:

```bash
pnpm test server/websocket.test.ts
```

Tests cover:
- Connection establishment
- Presence tracking
- Edit tracking
- Conflict detection
- Error handling

## Performance Considerations

1. **Message Batching**: Group multiple updates into single messages
2. **Debouncing**: Debounce field updates to reduce network traffic
3. **Cleanup**: Automatically remove disconnected users from tracking
4. **Memory**: Limit edit history to recent changes only

## Security

1. **Authentication**: All connections require valid user credentials
2. **Authorization**: Users can only edit resources they have access to
3. **Validation**: All incoming data is validated on the server
4. **Rate Limiting**: Limit edit events per user to prevent spam

## Troubleshooting

### Connection Issues
- Check browser console for connection errors
- Verify server is running and WebSocket port is accessible
- Check firewall/proxy settings

### Missing Presence Updates
- Ensure `usePresence` hook is initialized with socket
- Check that socket is connected (`isConnected === true`)
- Verify server is broadcasting events correctly

### Conflict Detection Not Working
- Ensure both users are editing the same resource
- Check that `fieldName` matches exactly
- Verify server is receiving edit events

## Future Enhancements

1. **Cursor Tracking**: Show cursor positions of other users
2. **Selection Awareness**: Highlight selected text from other users
3. **Undo/Redo**: Collaborative undo with conflict resolution
4. **Version History**: Track all changes with timestamps
5. **Permissions**: Fine-grained access control per resource
6. **Notifications**: In-app notifications for edit conflicts
7. **Mobile Support**: Optimize for mobile devices

## API Reference

### useWebSocket Hook

```typescript
const { socket, isConnected, isConnecting, error } = useWebSocket({
  userId: number;
  vaultId: number;
  enabled?: boolean;
});
```

### usePresence Hook

```typescript
const presence = usePresence({
  socket: Socket | null;
  enabled?: boolean;
});
// Returns: { onlineUsers: UserPresence[], editingUsers: EditingUser[] }
```

### useEditTracking Hook

```typescript
const {
  startEdit,
  updateField,
  endEdit,
  editConflict,
  clearConflict,
  isEditing,
} = useEditTracking({
  socket: Socket | null;
  userId: number;
  enabled?: boolean;
});
```

### useCollaborativeField Hook

```typescript
const field = useCollaborativeField(
  resourceType: "link" | "folder",
  resourceId: number,
  fieldName: string,
  initialValue: string,
  options: {
    socket: Socket | null;
    userId: number;
    enabled?: boolean;
  }
);
// Returns: {
//   value: string;
//   setValue: (value: string) => void;
//   isFocused: boolean;
//   onFocus: () => void;
//   onBlur: () => void;
//   hasConflict: boolean;
//   conflictUser?: { userName: string; userColor: string };
// }
```

## Related Files

- `server/websocket.ts` - WebSocket server implementation
- `server/websocket.test.ts` - WebSocket tests
- `client/src/hooks/useWebSocket.ts` - WebSocket connection hook
- `client/src/hooks/usePresence.ts` - Presence tracking hook
- `client/src/hooks/useEditTracking.ts` - Edit tracking hook
- `client/src/components/PresenceIndicator.tsx` - Presence UI components
- `client/src/components/ConflictWarning.tsx` - Conflict warning components
