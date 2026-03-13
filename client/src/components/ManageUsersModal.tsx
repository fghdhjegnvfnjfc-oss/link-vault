import { useState, useEffect } from "react";
import { Eye, EyeOff, X, Check, AlertCircle, Zap } from "lucide-react";

interface OnlineUser {
  userId: number;
  sessionId: string;
  userName: string;
  userColor: string;
}

interface BannedUser {
  id: number;
  userId: number;
  userName?: string;
  bannedAt: string;
  reason?: string;
}

interface ManageUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: OnlineUser[];
  bannedUsers: BannedUser[];
  onIdentify: (sessionId: string) => void;
  onKick: (sessionId: string) => void;
  onBan: (sessionId: string, userId: number, reason?: string) => void;
  onUnban: (bannedUserId: number) => void;
}

type ModalState = "list" | "identify" | "confirm-kick" | "confirm-ban" | "banned-list";

export function ManageUsersModal({
  isOpen,
  onClose,
  onlineUsers,
  bannedUsers,
  onIdentify,
  onKick,
  onBan,
  onUnban,
}: ManageUsersModalProps) {
  const [modalState, setModalState] = useState<ModalState>("list");
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [flashSent, setFlashSent] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setModalState("list");
      setSelectedUser(null);
      setBanReason("");
      setFlashSent(false);
    }
  }, [isOpen]);

  const handleIdentifyClick = (user: OnlineUser) => {
    setSelectedUser(user);
    setFlashSent(false);
    setModalState("identify");
  };

  const handleSendFlash = () => {
    if (selectedUser) {
      onIdentify(selectedUser.sessionId);
      setFlashSent(true);
    }
  };

  const handleKickClick = () => {
    if (selectedUser) {
      setModalState("confirm-kick");
    }
  };

  const handleConfirmKick = () => {
    if (selectedUser) {
      onKick(selectedUser.sessionId);
      setModalState("list");
      setSelectedUser(null);
    }
  };

  const handleBanClick = () => {
    if (selectedUser) {
      setBanReason("");
      setModalState("confirm-ban");
    }
  };

  const handleConfirmBan = () => {
    if (selectedUser) {
      onBan(selectedUser.sessionId, selectedUser.userId, banReason || undefined);
      setModalState("list");
      setSelectedUser(null);
      setBanReason("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-2xl my-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
            >
              {modalState === "list" && "Manage Users"}
              {modalState === "identify" && "Identify User"}
              {modalState === "confirm-kick" && "Kick User"}
              {modalState === "confirm-ban" && "Ban User"}
              {modalState === "banned-list" && "Banned Users"}
            </h2>
            <p className="text-sm mt-1" style={{ color: "oklch(0.60 0.02 220)" }}>
              {modalState === "list" && `${onlineUsers.length} user${onlineUsers.length !== 1 ? "s" : ""} online`}
              {modalState === "identify" && "Send a white flash to identify the user"}
              {modalState === "confirm-kick" && "This user will be removed from the vault"}
              {modalState === "confirm-ban" && "This user will be banned and cannot re-enter"}
              {modalState === "banned-list" && `${bannedUsers.length} user${bannedUsers.length !== 1 ? "s" : ""} banned`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all"
            style={{
              background: "oklch(1 0 0 / 8%)",
              color: "oklch(0.55 0.02 220)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Online Users List */}
        {modalState === "list" && (
          <div className="space-y-3 mb-6">
            {onlineUsers.length === 0 ? (
              <p
                className="text-sm text-center py-8"
                style={{ color: "oklch(0.55 0.02 220)" }}
              >
                No users currently online
              </p>
            ) : (
              onlineUsers.map((user) => (
                <div
                  key={user.sessionId}
                  className="p-4 rounded-lg border flex items-center justify-between"
                  style={{
                    background: "oklch(1 0 0 / 5%)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ background: user.userColor }}
                    >
                      {user.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
                      >
                        {user.userName}
                      </p>
                      <p className="text-xs" style={{ color: "oklch(0.55 0.02 220)" }}>
                        Session: {user.sessionId.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleIdentifyClick(user)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: "oklch(0.65 0.18 200 / 20%)",
                      color: "oklch(0.75 0.18 200)",
                      fontFamily: "Sora, sans-serif",
                    }}
                  >
                    Identify
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Identify User State */}
        {modalState === "identify" && selectedUser && (
          <div className="space-y-4 mb-6">
            <div
              className="p-4 rounded-lg border"
              style={{
                background: "oklch(0.65 0.18 200 / 10%)",
                border: "1px solid oklch(0.65 0.18 200 / 30%)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ background: selectedUser.userColor }}
                >
                  {selectedUser.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
                  >
                    {selectedUser.userName}
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.55 0.02 220)" }}>
                    {selectedUser.sessionId}
                  </p>
                </div>
              </div>

              {!flashSent && (
                <p className="text-xs mb-3" style={{ color: "oklch(0.60 0.02 220)" }}>
                  Click the button below to send a white screen flash to this user. This will help you identify them.
                </p>
              )}

              {flashSent && (
                <div
                  className="p-3 rounded-lg flex items-center gap-2"
                  style={{
                    background: "oklch(0.65 0.18 145 / 15%)",
                    color: "oklch(0.75 0.18 145)",
                  }}
                >
                  <Check size={14} />
                  <span className="text-xs font-semibold">Flash sent successfully</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalState("list")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.65 0.02 220)",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Pick Another User
              </button>
              {!flashSent && (
                <button
                  onClick={handleSendFlash}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
                    color: "#0F172A",
                    fontFamily: "Sora, sans-serif",
                  }}
                >
                  <Zap size={14} />
                  Send Flash
                </button>
              )}
              {flashSent && (
                <>
                  <button
                    onClick={handleKickClick}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: "oklch(0.65 0.18 200 / 20%)",
                      color: "oklch(0.75 0.18 200)",
                      fontFamily: "Sora, sans-serif",
                    }}
                  >
                    Kick
                  </button>
                  <button
                    onClick={handleBanClick}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: "oklch(0.62 0.22 25 / 20%)",
                      color: "oklch(0.70 0.20 25)",
                      fontFamily: "Sora, sans-serif",
                    }}
                  >
                    Ban
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Confirm Kick State */}
        {modalState === "confirm-kick" && selectedUser && (
          <div className="space-y-4 mb-6">
            <div
              className="p-4 rounded-lg flex items-start gap-3"
              style={{
                background: "oklch(0.65 0.18 200 / 10%)",
                border: "1px solid oklch(0.65 0.18 200 / 30%)",
              }}
            >
              <AlertCircle
                size={18}
                style={{ color: "oklch(0.75 0.18 200)", flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "#E2E8F0", fontFamily: "Sora, sans-serif" }}
                >
                  Kick {selectedUser.userName}?
                </p>
                <p className="text-xs" style={{ color: "oklch(0.60 0.02 220)" }}>
                  This user will be removed from the vault immediately. They can re-enter with the vault password.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalState("identify")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.65 0.02 220)",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmKick}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: "oklch(0.65 0.18 200)",
                  color: "#0F172A",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Confirm Kick
              </button>
            </div>
          </div>
        )}

        {/* Confirm Ban State */}
        {modalState === "confirm-ban" && selectedUser && (
          <div className="space-y-4 mb-6">
            <div
              className="p-4 rounded-lg flex items-start gap-3"
              style={{
                background: "oklch(0.62 0.22 25 / 10%)",
                border: "1px solid oklch(0.62 0.22 25 / 30%)",
              }}
            >
              <AlertCircle
                size={18}
                style={{ color: "oklch(0.70 0.20 25)", flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "#E2E8F0", fontFamily: "Sora, sans-serif" }}
                >
                  Ban {selectedUser.userName}?
                </p>
                <p className="text-xs" style={{ color: "oklch(0.60 0.02 220)" }}>
                  This user will be permanently banned and cannot re-enter with the vault password.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: "oklch(0.65 0.02 220)" }}>
                Ban Reason (optional)
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Why are you banning this user?"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all resize-none"
                style={{
                  background: "oklch(1 0 0 / 6%)",
                  border: "1px solid oklch(1 0 0 / 12%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid oklch(0.65 0.18 200 / 60%)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid oklch(1 0 0 / 12%)";
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalState("identify")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.65 0.02 220)",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBan}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: "oklch(0.62 0.22 25)",
                  color: "#fff",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Confirm Ban
              </button>
            </div>
          </div>
        )}

        {/* Banned Users List */}
        {modalState === "banned-list" && (
          <div className="space-y-3 mb-6">
            {bannedUsers.length === 0 ? (
              <p
                className="text-sm text-center py-8"
                style={{ color: "oklch(0.55 0.02 220)" }}
              >
                No banned users
              </p>
            ) : (
              bannedUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 rounded-lg border"
                  style={{
                    background: "oklch(1 0 0 / 5%)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
                      >
                        {user.userName || `User ${user.userId}`}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 220)" }}>
                        Banned: {new Date(user.bannedAt).toLocaleString()}
                      </p>
                      {user.reason && (
                        <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.02 220)" }}>
                          Reason: {user.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onUnban(user.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                      style={{
                        background: "oklch(0.65 0.18 145 / 20%)",
                        color: "oklch(0.75 0.18 145)",
                        fontFamily: "Sora, sans-serif",
                      }}
                    >
                      Unban
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex gap-2 pt-4 border-t" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          {modalState === "list" && (
            <>
              <button
                onClick={() => setModalState("banned-list")}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "oklch(0.62 0.22 25 / 15%)",
                  color: "oklch(0.70 0.20 25)",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                View Banned Users
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.65 0.02 220)",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Close
              </button>
            </>
          )}
          {modalState === "banned-list" && (
            <button
              onClick={() => setModalState("list")}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "oklch(1 0 0 / 8%)",
                color: "oklch(0.65 0.02 220)",
                fontFamily: "Sora, sans-serif",
              }}
            >
              Back to Online Users
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
