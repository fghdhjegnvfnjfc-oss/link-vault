/* =============================================================
   LINK VAULT — Password-Protected Links & Admin Manager
   Design: Neo-Noir / Glassmorphism Dark
   - Lock screen: password gate to access vault
   - Vault page: sidebar folder nav + main link card grid
   - Protected links: individual links can be password-locked
   - Edit mode: admin panel to edit links and set passwords
   - Password manager: view all locked link passwords (admin only)
   - Persistence: localStorage saves all changes
   ============================================================= */

import { useState, useRef, useEffect, useMemo } from "react";
import { Eye, EyeOff, Lock, Unlock, ExternalLink, Folder, Search, X, ChevronRight, Shield, LogOut, GripVertical, Edit2, Save, Trash2, Check, Key, Copy, AlertCircle, Plus, Trash, Settings, BarChart3 } from "lucide-react";

// ─── Configuration ────────────────────────────────────────────
let VAULT_PASSWORD = "vault2024";
let ADMIN_PASSWORD = "admin2024";
const OWNER_PASSWORD = "owner2024";
const RECOVERY_PASSWORD = "recovery2024";
const STORAGE_KEY = "link-vault-data";
const PROTECTED_LINKS_KEY = "link-vault-protected";
const PASSWORDS_KEY = "link-vault-passwords";
const CLICK_STATS_KEY = "link-vault-clicks";
const AUDIT_LOG_KEY = "link-vault-audit-log";
const ADMIN_EMAILS_KEY = "link-vault-admin-emails";
const PENDING_APPROVALS_KEY = "link-vault-pending-approvals";
const ADMIN_PASSWORDS_KEY = "link-vault-admin-passwords";

// ─── Link Data ────────────────────────────────────────────────
interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  favicon?: string;
}

interface FolderData {
  id: string;
  name: string;
  icon: string;
  color: string;
  links: LinkItem[];
}

interface ProtectedLink {
  linkId: string;
  password: string;
  folderName: string;
  linkTitle: string;
}

interface ClickStats {
  [linkId: string]: number;
}

interface StoredPasswords {
  vault: string;
  admin: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: number;
  email: string;
  action: "link_accessed" | "link_edited" | "link_deleted" | "link_added" | "folder_edited" | "folder_deleted" | "folder_added" | "link_password_set";
  resourceType: "link" | "folder";
  resourceName: string;
  details?: string;
}

interface AdminEmail {
  email: string;
  addedAt: number;
}

interface PendingApproval {
  id: string;
  email: string;
  requestedAt: number;
  status: "pending" | "approved" | "rejected";
}

interface AdminPasswordEntry {
  email: string;
  password: string;
  setAt: number;
}

const DEFAULT_VAULT_DATA: FolderData[] = [
  {
    id: "productivity",
    name: "Productivity",
    icon: "⚡",
    color: "oklch(0.75 0.18 85)",
    links: [
      { id: "notion", title: "Notion", url: "https://notion.so", description: "All-in-one workspace for notes and projects" },
      { id: "linear", title: "Linear", url: "https://linear.app", description: "Modern project management for software teams" },
      { id: "todoist", title: "Todoist", url: "https://todoist.com", description: "Task manager and to-do list app" },
      { id: "obsidian", title: "Obsidian", url: "https://obsidian.md", description: "Knowledge base and note-taking with markdown" },
    ],
  },
  {
    id: "development",
    name: "Development",
    icon: "🛠",
    color: "oklch(0.65 0.18 200)",
    links: [
      { id: "github", title: "GitHub", url: "https://github.com", description: "Code hosting and version control platform" },
      { id: "vercel", title: "Vercel", url: "https://vercel.com", description: "Deploy and host frontend applications" },
      { id: "devdocs", title: "DevDocs", url: "https://devdocs.io", description: "Unified API documentation browser" },
      { id: "codepen", title: "CodePen", url: "https://codepen.io", description: "Online code editor and front-end playground" },
      { id: "stackblitz", title: "StackBlitz", url: "https://stackblitz.com", description: "Online IDE for web development" },
    ],
  },
  {
    id: "design",
    name: "Design",
    icon: "🎨",
    color: "oklch(0.68 0.20 320)",
    links: [
      { id: "figma", title: "Figma", url: "https://figma.com", description: "Collaborative interface design tool" },
      { id: "dribbble", title: "Dribbble", url: "https://dribbble.com", description: "Design inspiration and portfolio community" },
      { id: "coolors", title: "Coolors", url: "https://coolors.co", description: "Color palette generator and explorer" },
      { id: "unsplash", title: "Unsplash", url: "https://unsplash.com", description: "Free high-resolution stock photography" },
    ],
  },
  {
    id: "learning",
    name: "Learning",
    icon: "📚",
    color: "oklch(0.70 0.18 145)",
    links: [
      { id: "mdn", title: "MDN Web Docs", url: "https://developer.mozilla.org", description: "Comprehensive web development documentation" },
      { id: "frontendmasters", title: "Frontend Masters", url: "https://frontendmasters.com", description: "Advanced JavaScript and frontend courses" },
      { id: "youtube", title: "YouTube", url: "https://youtube.com", description: "Video learning and tutorials" },
      { id: "coursera", title: "Coursera", url: "https://coursera.org", description: "Online courses from top universities" },
    ],
  },
  {
    id: "tools",
    name: "Tools",
    icon: "🔧",
    color: "oklch(0.68 0.18 50)",
    links: [
      { id: "regex101", title: "Regex101", url: "https://regex101.com", description: "Online regex tester and debugger" },
      { id: "jsonformatter", title: "JSON Formatter", url: "https://jsonformatter.curiousconcept.com", description: "Format and validate JSON data" },
      { id: "squoosh", title: "Squoosh", url: "https://squoosh.app", description: "Image compression and conversion tool" },
      { id: "transform", title: "Transform", url: "https://transform.tools", description: "Transform code between different formats" },
    ],
  },
  {
    id: "news",
    name: "News & Reads",
    icon: "📰",
    color: "oklch(0.65 0.15 25)",
    links: [
      { id: "hackernews", title: "Hacker News", url: "https://news.ycombinator.com", description: "Tech news and discussions from Y Combinator" },
      { id: "producthunt", title: "Product Hunt", url: "https://producthunt.com", description: "Discover new products and startups daily" },
      { id: "tldr", title: "TLDR Newsletter", url: "https://tldr.tech", description: "Byte-sized daily tech news digest" },
    ],
  },
];

// ─── Storage helpers ──────────────────────────────────────────
function loadVaultData(): FolderData[] {
  if (typeof window === "undefined") return DEFAULT_VAULT_DATA;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load vault data:", e);
  }
  return DEFAULT_VAULT_DATA;
}

function saveVaultData(data: FolderData[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save vault data:", e);
  }
}

function loadProtectedLinks(): Map<string, ProtectedLink> {
  if (typeof window === "undefined") return new Map();
  try {
    const stored = localStorage.getItem(PROTECTED_LINKS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.error("Failed to load protected links:", e);
  }
  return new Map();
}

function saveProtectedLinks(links: Map<string, ProtectedLink>): void {
  if (typeof window === "undefined") return;
  try {
    const obj = Object.fromEntries(links);
    localStorage.setItem(PROTECTED_LINKS_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error("Failed to save protected links:", e);
  }
}

function loadPasswords(): StoredPasswords {
  if (typeof window === "undefined") return { vault: "vault2024", admin: "admin2024" };
  try {
    const stored = localStorage.getItem(PASSWORDS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      VAULT_PASSWORD = data.vault;
      ADMIN_PASSWORD = data.admin;
      return data;
    }
  } catch (e) {
    console.error("Failed to load passwords:", e);
  }
  return { vault: "vault2024", admin: "admin2024" };
}

function savePasswords(vault: string, admin: string): void {
  if (typeof window === "undefined") return;
  try {
    VAULT_PASSWORD = vault;
    ADMIN_PASSWORD = admin;
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify({ vault, admin }));
  } catch (e) {
    console.error("Failed to save passwords:", e);
  }
}

function loadClickStats(): ClickStats {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(CLICK_STATS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load click stats:", e);
  }
  return {};
}

function saveClickStats(stats: ClickStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLICK_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to save click stats:", e);
  }
}

function recordLinkClick(linkId: string): void {
  const stats = loadClickStats();
  stats[linkId] = (stats[linkId] || 0) + 1;
  saveClickStats(stats);
}

function loadAuditLog(): AuditLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(AUDIT_LOG_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load audit log:", e);
  }
  return [];
}

function saveAuditLog(entries: AuditLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to save audit log:", e);
  }
}

function addAuditEntry(
  email: string,
  action: AuditLogEntry["action"],
  resourceType: "link" | "folder",
  resourceName: string,
  details?: string
): void {
  const log = loadAuditLog();
  const entry: AuditLogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    email,
    action,
    resourceType,
    resourceName,
    details,
  };
  log.push(entry);
  saveAuditLog(log);
}

function loadAdminEmails(): AdminEmail[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(ADMIN_EMAILS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load admin emails:", e);
  }
  return [];
}

function saveAdminEmails(emails: AdminEmail[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_EMAILS_KEY, JSON.stringify(emails));
  } catch (e) {
    console.error("Failed to save admin emails:", e);
  }
}

function addAdminEmail(email: string): void {
  const emails = loadAdminEmails();
  if (!emails.find((e) => e.email === email)) {
    emails.push({ email, addedAt: Date.now() });
    saveAdminEmails(emails);
  }
}

function removeAdminEmail(email: string): void {
  const emails = loadAdminEmails();
  const filtered = emails.filter((e) => e.email !== email);
  saveAdminEmails(filtered);
}

function loadPendingApprovals(): PendingApproval[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(PENDING_APPROVALS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load pending approvals:", e);
  }
  return [];
}

function savePendingApprovals(approvals: PendingApproval[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_APPROVALS_KEY, JSON.stringify(approvals));
  } catch (e) {
    console.error("Failed to save pending approvals:", e);
  }
}

function requestEmailApproval(email: string): void {
  const approvals = loadPendingApprovals();
  const approvedEmails = loadAdminEmails();
  if (approvedEmails.find((e) => e.email === email)) {
    return;
  }
  if (!approvals.find((a) => a.email === email && a.status === "pending")) {
    approvals.push({
      id: Math.random().toString(36).substr(2, 9),
      email,
      requestedAt: Date.now(),
      status: "pending",
    });
    savePendingApprovals(approvals);
  }
}

function approveEmailRequest(approvalId: string): void {
  const approvals = loadPendingApprovals();
  const approval = approvals.find((a) => a.id === approvalId);
  if (approval) {
    approval.status = "approved";
    addAdminEmail(approval.email);
    savePendingApprovals(approvals);
  }
}

function rejectEmailRequest(approvalId: string): void {
  const approvals = loadPendingApprovals();
  const approval = approvals.find((a) => a.id === approvalId);
  if (approval) {
    approval.status = "rejected";
    savePendingApprovals(approvals);
  }
}

function isEmailApproved(email: string): boolean {
  const approvedEmails = loadAdminEmails();
  return approvedEmails.some((e) => e.email === email);
}

function loadAdminPasswords(): AdminPasswordEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(ADMIN_PASSWORDS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load admin passwords:", e);
  }
  return [];
}

function saveAdminPasswords(passwords: AdminPasswordEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMIN_PASSWORDS_KEY, JSON.stringify(passwords));
  } catch (e) {
    console.error("Failed to save admin passwords:", e);
  }
}

function setAdminPassword(email: string, password: string): void {
  const passwords = loadAdminPasswords();
  const existing = passwords.findIndex((p) => p.email === email);
  if (existing >= 0) {
    passwords[existing] = { email, password, setAt: Date.now() };
  } else {
    passwords.push({ email, password, setAt: Date.now() });
  }
  saveAdminPasswords(passwords);
}

function getAdminPassword(email: string): string | null {
  const passwords = loadAdminPasswords();
  const entry = passwords.find((p) => p.email === email);
  return entry ? entry.password : null;
}

function removeAdminPassword(email: string): void {
  const passwords = loadAdminPasswords();
  const filtered = passwords.filter((p) => p.email !== email);
  saveAdminPasswords(filtered);
}

// ─── Favicon helper ───────────────────────────────────────────
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

// ─── Link Password Modal ───────────────────────────────────────
interface LinkPasswordModalProps {
  isOpen: boolean;
  linkTitle: string;
  onClose: () => void;
  onSuccess: () => void;
  requiredPassword: string;
}

function LinkPasswordModal({ isOpen, linkTitle, onClose, onSuccess, requiredPassword }: LinkPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setIsShaking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    if (password === requiredPassword) {
      setError("");
      setPassword("");
      onSuccess();
      onClose();
    } else {
      setError("Incorrect password.");
      setIsShaking(true);
      setPassword("");
      setTimeout(() => setIsShaking(false), 600);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className={`glass-card-strong rounded-2xl p-8 w-full max-w-md ${isShaking ? "shake" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <Lock size={18} style={{ color: "oklch(0.70 0.20 25)" }} />
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
          >
            Locked Link
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          This link is password-protected. Enter the password to access <strong>{linkTitle}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Link password"
              className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: error
                  ? "1px solid oklch(0.62 0.22 25 / 70%)"
                  : "1px solid oklch(1 0 0 / 12%)",
                color: "#E2E8F0",
                fontFamily: "DM Sans, sans-serif",
                boxShadow: error
                  ? "0 0 0 3px oklch(0.62 0.22 25 / 15%)"
                  : "none",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(0.65 0.18 200 / 60%)";
                  e.target.style.boxShadow = "0 0 0 3px oklch(0.65 0.18 200 / 15%)";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(1 0 0 / 12%)";
                  e.target.style.boxShadow = "none";
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors duration-150"
              style={{ color: "oklch(0.55 0.02 220)" }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p
              className="text-xs flex items-center gap-1.5"
              style={{ color: "oklch(0.70 0.20 25)" }}
            >
              <X size={12} />
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "oklch(1 0 0 / 8%)",
                color: "oklch(0.65 0.02 220)",
                fontFamily: "Sora, sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
                color: "#0F172A",
                fontFamily: "Sora, sans-serif",
                boxShadow: "0 4px 20px oklch(0.65 0.18 200 / 30%)",
              }}
            >
              <Unlock size={14} />
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Password Manager Modal ───────────────────────────────────
interface PasswordManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  protectedLinks: ProtectedLink[];
}

function PasswordManagerModal({ isOpen, onClose, protectedLinks }: PasswordManagerModalProps) {
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRecoveryPassword("");
      setError("");
      setIsUnlocked(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryPassword === RECOVERY_PASSWORD) {
      setIsUnlocked(true);
      setError("");
    } else {
      setError("Incorrect recovery password.");
    }
  };

  const copyToClipboard = (password: string, id: string) => {
    navigator.clipboard.writeText(password);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <Key size={20} style={{ color: "oklch(0.65 0.18 200)" }} />
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
          >
            Password Manager
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          View and manage all password-protected links
        </p>

        {!isUnlocked ? (
          <form onSubmit={handleUnlock} className="space-y-4 mb-6">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={recoveryPassword}
                onChange={(e) => {
                  setRecoveryPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Recovery password"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "oklch(1 0 0 / 6%)",
                  border: error
                    ? "1px solid oklch(0.62 0.22 25 / 70%)"
                    : "1px solid oklch(1 0 0 / 12%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: "oklch(0.55 0.02 220)" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <p className="text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
                <X size={12} className="inline mr-1" />
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
                color: "#0F172A",
                fontFamily: "Sora, sans-serif",
              }}
            >
              Unlock Password Manager
            </button>
          </form>
        ) : (
          <div className="space-y-3 mb-6">
            {protectedLinks.length === 0 ? (
              <p
                className="text-sm text-center py-8"
                style={{ color: "oklch(0.55 0.02 220)" }}
              >
                No password-protected links yet
              </p>
            ) : (
              protectedLinks.map((link) => (
                <div
                  key={link.linkId}
                  className="p-4 rounded-lg"
                  style={{
                    background: "oklch(1 0 0 / 5%)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold mb-1"
                        style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
                      >
                        {link.linkTitle}
                      </p>
                      <p className="text-xs" style={{ color: "oklch(0.55 0.02 220)" }}>
                        {link.folderName}
                      </p>
                      <div
                        className="mt-2 px-3 py-2 rounded-lg font-mono text-xs break-all"
                        style={{
                          background: "oklch(1 0 0 / 8%)",
                          color: "oklch(0.75 0.18 200)",
                        }}
                      >
                        {link.password}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(link.password, link.linkId)}
                      className="flex-shrink-0 p-2 rounded-lg transition-all duration-200"
                      style={{
                        background: copiedId === link.linkId
                          ? "oklch(0.65 0.18 145 / 20%)"
                          : "oklch(1 0 0 / 8%)",
                        color: copiedId === link.linkId
                          ? "oklch(0.75 0.18 145)"
                          : "oklch(0.55 0.02 220)",
                      }}
                      title="Copy password"
                    >
                      {copiedId === link.linkId ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-semibold"
          style={{
            background: "oklch(1 0 0 / 8%)",
            color: "oklch(0.65 0.02 220)",
            fontFamily: "Sora, sans-serif",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Admin Email Sign-In Modal ───────────────────────────────────
interface AdminEmailSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

function AdminEmailSignInModal({ isOpen, onClose, onSuccess }: AdminEmailSignInModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setError("");
      setStep("email");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (isEmailApproved(trimmedEmail)) {
      const adminPassword = getAdminPassword(trimmedEmail);
      if (adminPassword) {
        setStep("password");
        setError("");
      } else {
        setError("");
        onSuccess(trimmedEmail);
        onClose();
      }
    } else {
      requestEmailApproval(trimmedEmail);
      setError("");
      setEmail("");
      onClose();
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPassword = getAdminPassword(email.trim());
    if (password === adminPassword) {
      setError("");
      setPassword("");
      onSuccess(email.trim());
      onClose();
    } else {
      setError("Incorrect password.");
      setPassword("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          {step === "email" ? "Admin Sign In" : "Enter Admin Password"}
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          {step === "email"
            ? "Enter your email to request admin access. Owner approval required for new emails."
            : `Enter the password for ${email}`}
        </p>

        <form onSubmit={step === "email" ? handleEmailSubmit : handlePasswordSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type={step === "email" ? "email" : "password"}
              value={step === "email" ? email : password}
              onChange={(e) => {
                if (step === "email") {
                  setEmail(e.target.value);
                } else {
                  setPassword(e.target.value);
                }
                if (error) setError("");
              }}
              placeholder={step === "email" ? "your.email@example.com" : "Enter password"}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: error
                  ? "1px solid oklch(0.62 0.22 25 / 70%)"
                  : "1px solid oklch(1 0 0 / 12%)",
                color: "#E2E8F0",
                fontFamily: "DM Sans, sans-serif",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(0.65 0.18 200 / 60%)";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(1 0 0 / 12%)";
                }
              }}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
              <X size={12} className="inline mr-1" />
              {error}
            </p>
          )}

          <div className="flex gap-3">
            {step === "password" && (
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setPassword("");
                  setError("");
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.65 0.02 220)",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Back
              </button>
            )}
            {step === "email" && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.65 0.02 220)",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={step === "email" ? !email.trim() : !password.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
                color: "#0F172A",
                fontFamily: "Sora, sans-serif",
              }}
            >
              <Unlock size={14} />
              {step === "email" ? "Continue" : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pending Approvals Modal ─────────────────────────────────────
interface PendingApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingApprovals: PendingApproval[];
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
}

function PendingApprovalsModal({
  isOpen,
  onClose,
  pendingApprovals,
  onApprove,
  onReject,
}: PendingApprovalsModalProps) {
  const pendingOnly = useMemo(
    () => pendingApprovals.filter((a) => a.status === "pending"),
    [pendingApprovals]
  );

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
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
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Pending Admin Approvals
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          Review and approve new admin email requests
        </p>

        <div className="space-y-3">
          {pendingOnly.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "oklch(0.55 0.02 220)" }}
            >
              No pending approvals.
            </p>
          ) : (
            pendingOnly.map((approval) => (
              <div
                key={approval.id}
                className="p-4 rounded-lg border"
                style={{
                  background: "oklch(1 0 0 / 5%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
                    >
                      {approval.email}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 220)" }}>
                      Requested: {formatTime(approval.requestedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onApprove(approval.id)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    style={{
                      background: "oklch(0.65 0.18 145 / 20%)",
                      color: "oklch(0.75 0.18 145)",
                      fontFamily: "Sora, sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 30%)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 20%)";
                    }}
                  >
                    <Check size={14} />
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(approval.id)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                    style={{
                      background: "oklch(0.62 0.22 25 / 15%)",
                      color: "oklch(0.70 0.20 25)",
                      fontFamily: "Sora, sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.62 0.22 25 / 25%)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.62 0.22 25 / 15%)";
                    }}
                  >
                    <X size={14} />
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "oklch(1 0 0 / 8%)",
            color: "oklch(0.65 0.02 220)",
            fontFamily: "Sora, sans-serif",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Audit Log Modal ───────────────────────────────────────────
interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLog: AuditLogEntry[];
}

function AuditLogModal({ isOpen, onClose, auditLog }: AuditLogModalProps) {
  const sortedLog = useMemo(() => {
    return [...auditLog].sort((a, b) => b.timestamp - a.timestamp);
  }, [auditLog]);

  const getActionLabel = (action: AuditLogEntry["action"]): string => {
    const labels: Record<AuditLogEntry["action"], string> = {
      link_accessed: "Accessed Link",
      link_edited: "Edited Link",
      link_deleted: "Deleted Link",
      link_added: "Added Link",
      folder_edited: "Edited Folder",
      folder_deleted: "Deleted Folder",
      folder_added: "Added Folder",
      link_password_set: "Set Link Password",
    };
    return labels[action];
  };

  const getActionColor = (action: AuditLogEntry["action"]): string => {
    if (action.includes("deleted")) return "oklch(0.70 0.20 25)";
    if (action.includes("added")) return "oklch(0.75 0.18 145)";
    if (action.includes("edited")) return "oklch(0.75 0.18 200)";
    return "oklch(0.65 0.02 220)";
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-3xl my-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Audit Log
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          Complete history of vault changes
        </p>

        <div className="space-y-2">
          {sortedLog.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "oklch(0.55 0.02 220)" }}
            >
              No audit entries yet.
            </p>
          ) : (
            sortedLog.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-lg border"
                style={{
                  background: "oklch(1 0 0 / 5%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-md"
                        style={{
                          background: `${getActionColor(entry.action)}20`,
                          color: getActionColor(entry.action),
                          fontFamily: "Sora, sans-serif",
                        }}
                      >
                        {getActionLabel(entry.action)}
                      </span>
                    </div>
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
                    >
                      {entry.resourceName}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 220)" }}>
                      By: {entry.email}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: "oklch(0.55 0.02 220)" }}>
                      {formatTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
                {entry.details && (
                  <p className="text-xs mt-2" style={{ color: "oklch(0.50 0.02 220)" }}>
                    {entry.details}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "oklch(1 0 0 / 8%)",
            color: "oklch(0.65 0.02 220)",
            fontFamily: "Sora, sans-serif",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Owner Sign-In Modal ──────────────────────────────────────
interface OwnerSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function OwnerSignInModal({ isOpen, onClose, onSuccess }: OwnerSignInModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setIsShaking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    if (password === OWNER_PASSWORD) {
      setError("");
      setPassword("");
      onSuccess();
      onClose();
    } else {
      setError("Incorrect owner password.");
      setIsShaking(true);
      setPassword("");
      setTimeout(() => setIsShaking(false), 600);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className={`glass-card-strong rounded-2xl p-8 w-full max-w-md ${isShaking ? "shake" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Owner Access
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          Sign in as owner to manage settings and view analytics
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Owner password"
              className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: error
                  ? "1px solid oklch(0.62 0.22 25 / 70%)"
                  : "1px solid oklch(1 0 0 / 12%)",
                color: "#E2E8F0",
                fontFamily: "DM Sans, sans-serif",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(0.65 0.18 200 / 60%)";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(1 0 0 / 12%)";
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: "oklch(0.55 0.02 220)" }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
              <X size={12} className="inline mr-1" />
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "oklch(1 0 0 / 8%)",
                color: "oklch(0.65 0.02 220)",
                fontFamily: "Sora, sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
                color: "#0F172A",
                fontFamily: "Sora, sans-serif",
              }}
            >
              <Unlock size={14} />
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Admin Management Modal ────────────────────────────────────
interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmails: AdminEmail[];
  onUpdatePassword: (email: string, newPassword: string) => void;
  onRemoveAdmin: (email: string) => void;
  ownerPassword: string;
}

function AdminManagementModal({
  isOpen,
  onClose,
  adminEmails,
  onUpdatePassword,
  onRemoveAdmin,
  ownerPassword,
}: AdminManagementModalProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ownerPasswordInput, setOwnerPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"list" | "edit" | "remove">("list");

  const handleEditPassword = (email: string) => {
    setSelectedEmail(email);
    setNewPassword("");
    setConfirmPassword("");
    setOwnerPasswordInput("");
    setError("");
    setMode("edit");
  };

  const handleRemoveAdmin = (email: string) => {
    setSelectedEmail(email);
    setOwnerPasswordInput("");
    setError("");
    setMode("remove");
  };

  const handleSavePassword = () => {
    if (ownerPasswordInput !== ownerPassword) {
      setError("Incorrect owner password.");
      return;
    }
    if (!newPassword.trim()) {
      setError("Password cannot be empty.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (selectedEmail) {
      onUpdatePassword(selectedEmail, newPassword);
      setMode("list");
      setSelectedEmail(null);
      setNewPassword("");
      setConfirmPassword("");
      setOwnerPasswordInput("");
      setError("");
    }
  };

  const handleConfirmRemove = () => {
    if (ownerPasswordInput !== ownerPassword) {
      setError("Incorrect owner password.");
      return;
    }
    if (selectedEmail) {
      onRemoveAdmin(selectedEmail);
      setMode("list");
      setSelectedEmail(null);
      setOwnerPasswordInput("");
      setError("");
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
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          {mode === "list" ? "Manage Admins" : mode === "edit" ? "Change Admin Password" : "Remove Admin"}
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          {mode === "list"
            ? "View and manage approved admin accounts"
            : mode === "edit"
            ? `Set a new password for ${selectedEmail}`
            : `Remove ${selectedEmail} from admin access`}
        </p>

        {mode === "list" && (
          <div className="space-y-3 mb-6">
            {adminEmails.length === 0 ? (
              <p style={{ color: "oklch(0.55 0.02 220)" }} className="text-sm text-center py-8">
                No approved admins.
              </p>
            ) : (
              adminEmails.map((admin) => (
                <div
                  key={admin.email}
                  className="p-4 rounded-lg border flex items-center justify-between"
                  style={{
                    background: "oklch(1 0 0 / 5%)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                  }}
                >
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
                    >
                      {admin.email}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 220)" }}>
                      Added: {new Date(admin.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPassword(admin.email)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: "oklch(0.65 0.18 200 / 20%)",
                        color: "oklch(0.75 0.18 200)",
                        fontFamily: "Sora, sans-serif",
                      }}
                    >
                      Edit Password
                    </button>
                    <button
                      onClick={() => handleRemoveAdmin(admin.email)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: "oklch(0.62 0.22 25 / 15%)",
                        color: "oklch(0.70 0.20 25)",
                        fontFamily: "Sora, sans-serif",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {mode === "edit" && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-semibold" style={{ color: "oklch(0.75 0.18 200)" }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter new password"
                className="w-full px-4 py-2 rounded-lg text-sm mt-1 outline-none transition-all"
                style={{
                  background: "oklch(1 0 0 / 6%)",
                  border: error ? "1px solid oklch(0.62 0.22 25 / 70%)" : "1px solid oklch(1 0 0 / 12%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "oklch(0.75 0.18 200)" }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Confirm new password"
                className="w-full px-4 py-2 rounded-lg text-sm mt-1 outline-none transition-all"
                style={{
                  background: "oklch(1 0 0 / 6%)",
                  border: error ? "1px solid oklch(0.62 0.22 25 / 70%)" : "1px solid oklch(1 0 0 / 12%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "oklch(0.75 0.18 200)" }}>
                Owner Password (to confirm)
              </label>
              <input
                type="password"
                value={ownerPasswordInput}
                onChange={(e) => {
                  setOwnerPasswordInput(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter owner password"
                className="w-full px-4 py-2 rounded-lg text-sm mt-1 outline-none transition-all"
                style={{
                  background: "oklch(1 0 0 / 6%)",
                  border: error ? "1px solid oklch(0.62 0.22 25 / 70%)" : "1px solid oklch(1 0 0 / 12%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg" style={{ background: "oklch(0.62 0.22 25 / 15%)", color: "oklch(0.70 0.20 25)" }}>
                <p className="text-xs font-semibold">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("list")}
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
                onClick={handleSavePassword}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: "oklch(0.65 0.18 200)",
                  color: "#0F172A",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Save Password
              </button>
            </div>
          </div>
        )}

        {mode === "remove" && (
          <div className="space-y-4 mb-6">
            <p style={{ color: "oklch(0.70 0.20 25)" }} className="text-sm">
              This will permanently remove {selectedEmail} from admin access.
            </p>
            <div>
              <label className="text-xs font-semibold" style={{ color: "oklch(0.75 0.18 200)" }}>
                Owner Password (to confirm)
              </label>
              <input
                type="password"
                value={ownerPasswordInput}
                onChange={(e) => {
                  setOwnerPasswordInput(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter owner password"
                className="w-full px-4 py-2 rounded-lg text-sm mt-1 outline-none transition-all"
                style={{
                  background: "oklch(1 0 0 / 6%)",
                  border: error ? "1px solid oklch(0.62 0.22 25 / 70%)" : "1px solid oklch(1 0 0 / 12%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                }}
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg" style={{ background: "oklch(0.62 0.22 25 / 15%)", color: "oklch(0.70 0.20 25)" }}>
                <p className="text-xs font-semibold">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("list")}
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
                onClick={handleConfirmRemove}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: "oklch(0.62 0.22 25)",
                  color: "#fff",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                Remove Admin
              </button>
            </div>
          </div>
        )}

        {mode === "list" && (
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "oklch(1 0 0 / 8%)",
              color: "oklch(0.65 0.02 220)",
              fontFamily: "Sora, sans-serif",
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Owner Settings Modal ─────────────────────────────────────
interface OwnerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVaultPassword: string;
  currentAdminPassword: string;
  onSave: (vaultPassword: string, adminPassword: string) => void;
}

function OwnerSettingsModal({
  isOpen,
  onClose,
  currentVaultPassword,
  currentAdminPassword,
  onSave,
}: OwnerSettingsModalProps) {
  const [vaultPassword, setVaultPassword] = useState(currentVaultPassword);
  const [adminPassword, setAdminPassword] = useState(currentAdminPassword);
  const [showVaultPassword, setShowVaultPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setVaultPassword(currentVaultPassword);
      setAdminPassword(currentAdminPassword);
      setError("");
    }
  }, [isOpen, currentVaultPassword, currentAdminPassword]);

  const handleSave = () => {
    if (!vaultPassword.trim() || !adminPassword.trim()) {
      setError("Both passwords are required.");
      return;
    }
    onSave(vaultPassword.trim(), adminPassword.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-md my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Owner Settings
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          Manage vault and admin passwords
        </p>

        <div className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Vault Password
            </label>
            <div className="relative">
              <input
                type={showVaultPassword ? "text" : "password"}
                value={vaultPassword}
                onChange={(e) => {
                  setVaultPassword(e.target.value);
                  if (error) setError("");
                }}
                className="w-full px-4 py-2.5 pr-12 rounded-lg text-sm outline-none transition-all"
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
              <button
                type="button"
                onClick={() => setShowVaultPassword(!showVaultPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: "oklch(0.55 0.02 220)" }}
                tabIndex={-1}
              >
                {showVaultPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showAdminPassword ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  if (error) setError("");
                }}
                className="w-full px-4 py-2.5 pr-12 rounded-lg text-sm outline-none transition-all"
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
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: "oklch(0.55 0.02 220)" }}
                tabIndex={-1}
              >
                {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
              <X size={12} className="inline mr-1" />
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "oklch(1 0 0 / 8%)",
              color: "oklch(0.65 0.02 220)",
              fontFamily: "Sora, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
              color: "#0F172A",
              fontFamily: "Sora, sans-serif",
            }}
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Link Analytics Modal ─────────────────────────────────────
interface LinkAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultData: FolderData[];
  clickStats: ClickStats;
}

function LinkAnalyticsModal({ isOpen, onClose, vaultData, clickStats }: LinkAnalyticsModalProps) {
  const allLinksWithStats = useMemo(() => {
    const links: Array<{ id: string; title: string; folder: string; clicks: number }> = [];
    vaultData.forEach((folder) => {
      folder.links.forEach((link) => {
        links.push({
          id: link.id,
          title: link.title,
          folder: folder.name,
          clicks: clickStats[link.id] || 0,
        });
      });
    });
    return links.sort((a, b) => b.clicks - a.clicks);
  }, [vaultData, clickStats]);

  const totalClicks = useMemo(
    () => Object.values(clickStats).reduce((sum, count) => sum + count, 0),
    [clickStats]
  );

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
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Link Analytics
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          Track which resources are most popular
        </p>

        <div className="mb-6 p-4 rounded-lg" style={{ background: "oklch(0.65 0.18 200 / 10%)" }}>
          <div className="flex items-center justify-between">
            <span style={{ color: "oklch(0.60 0.02 220)", fontFamily: "DM Sans, sans-serif" }}>
              Total Clicks
            </span>
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.75 0.18 200)" }}
            >
              {totalClicks}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {allLinksWithStats.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: "oklch(0.55 0.02 220)" }}
            >
              No click data yet. Links will appear here as they are accessed.
            </p>
          ) : (
            allLinksWithStats.map((link, index) => (
              <div
                key={link.id}
                className="p-4 rounded-lg flex items-center justify-between"
                style={{
                  background: "oklch(1 0 0 / 5%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-md"
                      style={{
                        background: "oklch(0.65 0.18 200 / 15%)",
                        color: "oklch(0.75 0.18 200)",
                        fontFamily: "Sora, sans-serif",
                      }}
                    >
                      #{index + 1}
                    </span>
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
                    >
                      {link.title}
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: "oklch(0.55 0.02 220)" }}>
                    {link.folder}
                  </p>
                </div>
                <div
                  className="ml-4 px-3 py-2 rounded-lg text-center flex-shrink-0"
                  style={{
                    background: "oklch(0.65 0.18 200 / 20%)",
                    color: "oklch(0.75 0.18 200)",
                  }}
                >
                  <p
                    className="text-lg font-bold"
                    style={{ fontFamily: "Sora, sans-serif" }}
                  >
                    {link.clicks}
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.65 0.18 200)" }}>
                    clicks
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "oklch(1 0 0 / 8%)",
            color: "oklch(0.65 0.02 220)",
            fontFamily: "Sora, sans-serif",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Add New Link Modal ───────────────────────────────────────
interface AddNewLinkModalProps {
  isOpen: boolean;
  folderId: string;
  folderName: string;
  onClose: () => void;
  onSave: (link: LinkItem) => void;
}

function AddNewLinkModal({ isOpen, folderId, folderName, onClose, onSave }: AddNewLinkModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setUrl("");
      setDescription("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (title.trim() && url.trim()) {
      const newLink: LinkItem = {
        id: `link-${Date.now()}`,
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
      };
      onSave(newLink);
      setTitle("");
      setUrl("");
      setDescription("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Add New Link
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          Add a new link to <strong>{folderName}</strong>
        </p>

        <div className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Title
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Link title"
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
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

          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
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

          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the link"
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
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "oklch(1 0 0 / 8%)",
              color: "oklch(0.65 0.02 220)",
              fontFamily: "Sora, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !url.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
              color: "#0F172A",
              fontFamily: "Sora, sans-serif",
            }}
          >
            <Plus size={14} />
            Add Link
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Folder Modal ────────────────────────────────────────
interface EditFolderModalProps {
  isOpen: boolean;
  folder: FolderData | null;
  onClose: () => void;
  onSave: (folder: FolderData) => void;
  onDelete: () => void;
}

function EditFolderModal({ isOpen, folder, onClose, onSave, onDelete }: EditFolderModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const emojiSuggestions = ["⚡", "🛠", "🎨", "📚", "🔧", "📰", "🌟", "💡", "🚀", "📱", "🎯", "🔐", "📊", "🎬", "🎵", "📸", "🌐", "💼", "🏆", "⭐"];

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setIcon(folder.icon);
    }
  }, [folder, isOpen]);

  const handleSave = () => {
    if (folder && name.trim() && icon.trim()) {
      onSave({
        ...folder,
        name: name.trim(),
        icon: icon.trim(),
      });
      onClose();
    }
  };

  if (!isOpen || !folder) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-md my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Edit Folder
        </h2>

        <div className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
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

          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Folder Icon
            </label>
            <div className="mb-3">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Paste an emoji"
                maxLength={2}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all text-center text-lg"
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
            <div className="grid grid-cols-5 gap-2">
              {emojiSuggestions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className="p-2 rounded-lg text-lg transition-all"
                  style={{
                    background: icon === emoji ? "oklch(0.65 0.18 200 / 20%)" : "oklch(1 0 0 / 8%)",
                    border: icon === emoji ? "1px solid oklch(0.65 0.18 200 / 40%)" : "1px solid transparent",
                  }}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onDelete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: "oklch(0.62 0.22 25 / 15%)",
              color: "oklch(0.70 0.20 25)",
              fontFamily: "Sora, sans-serif",
            }}
          >
            <Trash size={14} />
            Delete
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
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !icon.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
              color: "#0F172A",
              fontFamily: "Sora, sans-serif",
            }}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Set Link Password Modal ───────────────────────────────────
interface SetLinkPasswordModalProps {
  isOpen: boolean;
  link: LinkItem | null;
  currentPassword: string | null;
  onClose: () => void;
  onSave: (password: string | null) => void;
}

function SetLinkPasswordModal({ isOpen, link, currentPassword, onClose, onSave }: SetLinkPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [removeProtection, setRemoveProtection] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword(currentPassword || "");
      setShowPassword(false);
      setRemoveProtection(false);
    }
  }, [isOpen, currentPassword]);

  const handleSave = () => {
    if (removeProtection) {
      onSave(null);
    } else if (password.trim()) {
      onSave(password.trim());
    }
    onClose();
  };

  if (!isOpen || !link) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Link Protection
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          Set a password for <strong>{link.title}</strong>
        </p>

        <div className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Password (leave empty to remove protection)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setRemoveProtection(false);
                }}
                placeholder="Enter password or leave blank"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: "oklch(0.55 0.02 220)" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {currentPassword && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={removeProtection}
                onChange={(e) => {
                  setRemoveProtection(e.target.checked);
                  if (e.target.checked) setPassword("");
                }}
                className="w-4 h-4 rounded"
                style={{
                  background: removeProtection ? "oklch(0.65 0.18 200)" : "oklch(1 0 0 / 8%)",
                  border: "1px solid oklch(1 0 0 / 12%)",
                  cursor: "pointer",
                }}
              />
              <span className="text-sm" style={{ color: "oklch(0.65 0.02 220)" }}>
                Remove password protection
              </span>
            </label>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: "oklch(1 0 0 / 8%)",
              color: "oklch(0.65 0.02 220)",
              fontFamily: "Sora, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
              color: "#0F172A",
              fontFamily: "Sora, sans-serif",
            }}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Password Modal ──────────────────────────────────────
interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AdminPasswordModal({ isOpen, onClose, onSuccess }: AdminPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setIsShaking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    if (password === ADMIN_PASSWORD) {
      setError("");
      setPassword("");
      onSuccess();
      onClose();
    } else {
      setError("Incorrect admin password.");
      setIsShaking(true);
      setPassword("");
      setTimeout(() => setIsShaking(false), 600);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className={`glass-card-strong rounded-2xl p-8 w-full max-w-md ${isShaking ? "shake" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Admin Access
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          Enter the admin password to edit links
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Admin password"
              className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: error
                  ? "1px solid oklch(0.62 0.22 25 / 70%)"
                  : "1px solid oklch(1 0 0 / 12%)",
                color: "#E2E8F0",
                fontFamily: "DM Sans, sans-serif",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(0.65 0.18 200 / 60%)";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(1 0 0 / 12%)";
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: "oklch(0.55 0.02 220)" }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
              <X size={12} className="inline mr-1" />
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: "oklch(1 0 0 / 8%)",
                color: "oklch(0.65 0.02 220)",
                fontFamily: "Sora, sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
                color: "#0F172A",
                fontFamily: "Sora, sans-serif",
              }}
            >
              <Unlock size={14} />
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Link Modal ───────────────────────────────────────────
interface EditLinkModalProps {
  isOpen: boolean;
  link: LinkItem | null;
  isProtected: boolean;
  onClose: () => void;
  onSave: (link: LinkItem) => void;
  onDelete: () => void;
  onSetPassword: () => void;
}

function EditLinkModal({ isOpen, link, isProtected, onClose, onSave, onDelete, onSetPassword }: EditLinkModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setDescription(link.description);
    }
  }, [link, isOpen]);

  const handleSave = () => {
    if (link && title.trim() && url.trim()) {
      onSave({
        ...link,
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
      });
      onClose();
    }
  };

  if (!isOpen || !link) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          Edit Link
        </h2>

        <div className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
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

          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
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

          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ fontFamily: "Sora, sans-serif", color: "oklch(0.65 0.02 220)" }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

          <button
            onClick={onSetPassword}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: isProtected
                ? "oklch(0.65 0.18 200 / 15%)"
                : "oklch(1 0 0 / 8%)",
              color: isProtected
                ? "oklch(0.75 0.18 200)"
                : "oklch(0.65 0.02 220)",
              fontFamily: "Sora, sans-serif",
              border: isProtected
                ? "1px solid oklch(0.65 0.18 200 / 30%)"
                : "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!isProtected) {
                (e.target as HTMLButtonElement).style.background = "oklch(1 0 0 / 12%)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isProtected) {
                (e.target as HTMLButtonElement).style.background = "oklch(1 0 0 / 8%)";
              }
            }}
          >
            <Lock size={14} />
            {isProtected ? "Password Protected" : "Set Password"}
          </button>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onDelete}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: "oklch(0.62 0.22 25 / 15%)",
              color: "oklch(0.70 0.20 25)",
              fontFamily: "Sora, sans-serif",
            }}
          >
            <Trash2 size={14} />
            Delete
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
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !url.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
              color: "#0F172A",
              fontFamily: "Sora, sans-serif",
            }}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Draggable Link Card ───────────────────────────────────────
interface LinkCardProps {
  link: LinkItem;
  folderName: string;
  isProtected: boolean;
  onDragStart: (e: React.DragEvent<HTMLAnchorElement>, linkId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLAnchorElement>) => void;
  onDrop: (e: React.DragEvent<HTMLAnchorElement>, linkId: string) => void;
  isDragging?: boolean;
  isEditMode?: boolean;
  onEdit?: (link: LinkItem) => void;
  onClickLocked?: () => void;
}

function LinkCard({
  link,
  folderName,
  isProtected,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isEditMode,
  onEdit,
  onClickLocked,
}: LinkCardProps) {
  const [imgError, setImgError] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isEditMode) {
      e.preventDefault();
      onEdit?.(link);
    } else if (isProtected) {
      e.preventDefault();
      onClickLocked?.();
    }
  };

  return (
    <a
      href={isEditMode || isProtected ? undefined : link.url}
      target={isEditMode || isProtected ? undefined : "_blank"}
      rel={isEditMode || isProtected ? undefined : "noopener noreferrer"}
      draggable={!isEditMode && !isProtected}
      onDragStart={(e) => !isEditMode && !isProtected && onDragStart(e, link.id)}
      onDragOver={(e) => !isEditMode && !isProtected && onDragOver(e)}
      onDrop={(e) => !isEditMode && !isProtected && onDrop(e, link.id)}
      onClick={handleClick}
      className="group block rounded-xl p-4 transition-all duration-200 animate-fade-in-up relative"
      style={{
        background: "oklch(1 0 0 / 4%)",
        border: isProtected
          ? "1px solid oklch(0.70 0.20 25 / 40%)"
          : "1px solid oklch(1 0 0 / 8%)",
        opacity: isDragging ? 0.5 : 1,
        cursor: isEditMode || isProtected ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "oklch(1 0 0 / 7%)";
        el.style.border = isProtected
          ? "1px solid oklch(0.70 0.20 25 / 60%)"
          : "1px solid oklch(0.65 0.18 200 / 35%)";
        el.style.boxShadow = isProtected
          ? "0 4px 20px oklch(0.70 0.20 25 / 12%)"
          : "0 4px 20px oklch(0.65 0.18 200 / 12%)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "oklch(1 0 0 / 4%)";
        el.style.border = isProtected
          ? "1px solid oklch(0.70 0.20 25 / 40%)"
          : "1px solid oklch(1 0 0 / 8%)";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Lock icon or drag handle */}
      <div
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{
          background: isProtected
            ? "oklch(0.70 0.20 25 / 20%)"
            : "oklch(0.65 0.18 200 / 15%)",
          color: isProtected
            ? "oklch(0.70 0.20 25)"
            : "oklch(0.65 0.18 200)",
        }}
        title={
          isEditMode
            ? "Click to edit"
            : isProtected
              ? "Click to unlock"
              : "Drag to reorder"
        }
      >
        {isProtected ? (
          <Lock size={14} />
        ) : isEditMode ? (
          <Edit2 size={14} />
        ) : (
          <GripVertical size={14} />
        )}
      </div>

      <div className="flex items-start gap-3">
        {/* Favicon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden"
          style={{ background: "oklch(1 0 0 / 8%)" }}
        >
          {!imgError ? (
            <img
              src={getFaviconUrl(link.url)}
              alt=""
              className="w-4 h-4 object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <ExternalLink size={14} style={{ color: "oklch(0.65 0.18 200)" }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-sm font-semibold truncate"
              style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
            >
              {link.title}
            </span>
            {!isEditMode && !isProtected && (
              <ExternalLink
                size={11}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ color: "oklch(0.65 0.18 200)" }}
              />
            )}
          </div>
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: "oklch(0.55 0.02 220)" }}
          >
            {link.description}
          </p>
        </div>
      </div>
    </a>
  );
}

// ─── Lock Screen ─────────────────────────────────────────────
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 350));

    if (password === VAULT_PASSWORD) {
      setError("");
      onUnlock();
    } else {
      setIsLoading(false);
      setError("Incorrect password. Access denied.");
      setIsShaking(true);
      setPassword("");
      setTimeout(() => setIsShaking(false), 600);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="min-h-screen mesh-bg flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663426870855/MTnGojgUB5HzdQARgKvcKo/vault-bg-LY49Eu2ppdyKFegFxJ8wq7.webp')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-[#0F172A]/60" />

      <div className="absolute top-1/4 left-1/6 w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #06B6D4, transparent)" }} />
      <div className="absolute bottom-1/4 right-1/6 w-80 h-80 rounded-full opacity-8 blur-3xl"
        style={{ background: "radial-gradient(circle, #312E81, transparent)" }} />

      <div className={`relative z-10 w-full max-w-md animate-fade-in-up ${isShaking ? "shake" : ""}`}>
        <div className="glass-card-strong rounded-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663426870855/MTnGojgUB5HzdQARgKvcKo/vault-lock-icon-6PZsayaWfgxkZyGh8B2aGr.webp"
                alt="Vault Lock"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1
              className="text-3xl font-bold tracking-tight mb-2"
              style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
            >
              Link Vault
            </h1>
            <p className="text-sm" style={{ color: "oklch(0.60 0.02 220)" }}>
              Enter your password to access the vault
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Password"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  background: "oklch(1 0 0 / 6%)",
                  border: error
                    ? "1px solid oklch(0.62 0.22 25 / 70%)"
                    : "1px solid oklch(1 0 0 / 12%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: error
                    ? "0 0 0 3px oklch(0.62 0.22 25 / 15%)"
                    : "none",
                }}
                onFocus={(e) => {
                  if (!error) {
                    e.target.style.border = "1px solid oklch(0.65 0.18 200 / 60%)";
                    e.target.style.boxShadow = "0 0 0 3px oklch(0.65 0.18 200 / 15%)";
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.target.style.border = "1px solid oklch(1 0 0 / 12%)";
                    e.target.style.boxShadow = "none";
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors duration-150"
                style={{ color: "oklch(0.55 0.02 220)" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p
                className="text-xs flex items-center gap-1.5 animate-fade-in"
                style={{ color: "oklch(0.70 0.20 25)" }}
              >
                <X size={12} />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading
                  ? "oklch(0.55 0.15 200)"
                  : "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
                color: "#0F172A",
                fontFamily: "Sora, sans-serif",
                boxShadow: "0 4px 20px oklch(0.65 0.18 200 / 30%)",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.target as HTMLButtonElement).style.boxShadow =
                    "0 4px 30px oklch(0.65 0.18 200 / 50%)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow =
                  "0 4px 20px oklch(0.65 0.18 200 / 30%)";
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {isLoading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#0F172A", borderTopColor: "transparent" }}
                  />
                  Unlocking…
                </>
              ) : (
                <>
                  <Unlock size={15} />
                  Unlock Vault
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t flex items-center justify-center gap-2"
            style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
            <Shield size={12} style={{ color: "oklch(0.50 0.02 220)" }} />
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 220)" }}>
              Protected by Link Vault
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vault Page ───────────────────────────────────────────────
function VaultPage({ onLock }: { onLock: () => void }) {
  const [vaultData, setVaultData] = useState<FolderData[]>(loadVaultData);
  const [protectedLinks, setProtectedLinks] = useState<Map<string, ProtectedLink>>(loadProtectedLinks);
  const [clickStats, setClickStats] = useState<ClickStats>(loadClickStats);
  const [storedPasswords, setStoredPasswords] = useState<StoredPasswords>(loadPasswords);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [lockedLinkId, setLockedLinkId] = useState<string | null>(null);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [showPasswordManager, setShowPasswordManager] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null);
  const [showOwnerSignIn, setShowOwnerSignIn] = useState(false);
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [showOwnerSettings, setShowOwnerSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(loadAuditLog);
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>(loadAdminEmails);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null);
  const [showAdminEmailSignIn, setShowAdminEmailSignIn] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(loadPendingApprovals);
  const [showPendingApprovals, setShowPendingApprovals] = useState(false);
  const [showAdminManagement, setShowAdminManagement] = useState(false);

  // Save to localStorage whenever vault data changes
  useEffect(() => {
    saveVaultData(vaultData);
  }, [vaultData]);

  useEffect(() => {
    saveProtectedLinks(protectedLinks);
  }, [protectedLinks]);

  useEffect(() => {
    saveAuditLog(auditLog);
  }, [auditLog]);

  useEffect(() => {
    saveAdminEmails(adminEmails);
  }, [adminEmails]);

  useEffect(() => {
    savePendingApprovals(pendingApprovals);
  }, [pendingApprovals]);

  const allLinks = useMemo(
    () => vaultData.flatMap((f) => f.links.map((l) => ({ ...l, folderId: f.id }))),
    [vaultData]
  );

  const filteredLinks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeFolder === "all") {
      if (!q) return allLinks;
      return allLinks.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q)
      );
    }
    const folder = vaultData.find((f) => f.id === activeFolder);
    if (!folder) return [];
    const links = folder.links.map((l) => ({ ...l, folderId: folder.id }));
    if (!q) return links;
    return links.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q)
    );
  }, [vaultData, activeFolder, searchQuery, allLinks]);

  const activeLabel =
    activeFolder === "all"
      ? "All Links"
      : vaultData.find((f) => f.id === activeFolder)?.name ?? "";

  const activeFolderData = vaultData.find((f) => f.id === activeFolder);

  // Handle admin unlock
  const handleAdminUnlock = () => {
    setIsEditMode(true);
    setShowAdminModal(false);
  };

  // Handle edit link
  const handleEditLink = (link: LinkItem) => {
    setEditingLink(link);
    setShowEditModal(true);
  };

  const handleSaveLink = (updatedLink: LinkItem) => {
    if (currentAdminEmail) {
      const newEntry: AuditLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        email: currentAdminEmail,
        action: "link_edited",
        resourceType: "link",
        resourceName: updatedLink.title,
      };
      setAuditLog([...auditLog, newEntry]);
    }
    const updatedFolders = vaultData.map((folder) => ({
      ...folder,
      links: folder.links.map((link) =>
        link.id === updatedLink.id ? updatedLink : link
      ),
    }));
    setVaultData(updatedFolders);
    setShowEditModal(false);
  };

  const handleDeleteLink = () => {
    if (!editingLink) return;
    if (currentAdminEmail) {
      const newEntry: AuditLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        email: currentAdminEmail,
        action: "link_deleted",
        resourceType: "link",
        resourceName: editingLink.title,
      };
      setAuditLog([...auditLog, newEntry]);
    }
    const updatedFolders = vaultData.map((folder) => ({
      ...folder,
      links: folder.links.filter((link) => link.id !== editingLink.id),
    }));
    setVaultData(updatedFolders);
    // Also remove from protected links
    const newProtected = new Map(protectedLinks);
    newProtected.delete(editingLink.id);
    setProtectedLinks(newProtected);
    setShowEditModal(false);
  };

  const handleSetPassword = () => {
    if (editingLink) {
      setLockedLinkId(editingLink.id);
      setShowSetPasswordModal(true);
    }
  };

  const handleSavePassword = (password: string | null) => {
    if (!editingLink) return;
    if (currentAdminEmail) {
      const newEntry: AuditLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        email: currentAdminEmail,
        action: "link_password_set",
        resourceType: "link",
        resourceName: editingLink.title,
        details: password ? "Password set" : "Password removed",
      };
      setAuditLog([...auditLog, newEntry]);
    }
    const newProtected = new Map(protectedLinks);
    if (password) {
      const folder = vaultData.find((f) =>
        f.links.some((l) => l.id === editingLink.id)
      );
      newProtected.set(editingLink.id, {
        linkId: editingLink.id,
        password,
        folderName: folder?.name || "Unknown",
        linkTitle: editingLink.title,
      });
    } else {
      newProtected.delete(editingLink.id);
    }
    setProtectedLinks(newProtected);
    setShowSetPasswordModal(false);
  };

  const handleClickLockedLink = (linkId: string) => {
    setLockedLinkId(linkId);
    setShowPasswordModal(true);
  };

  const handleUnlockLink = () => {
    if (lockedLinkId) {
      const link = allLinks.find((l) => l.id === lockedLinkId);
      if (link) {
        window.open(link.url, "_blank");
      }
    }
    setShowPasswordModal(false);
  };

  const handleAddNewLink = (link: LinkItem) => {
    if (currentAdminEmail) {
      const newEntry: AuditLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        email: currentAdminEmail,
        action: "link_added",
        resourceType: "link",
        resourceName: link.title,
      };
      setAuditLog([...auditLog, newEntry]);
    }
    const updatedFolders = vaultData.map((folder) =>
      folder.id === activeFolder
        ? { ...folder, links: [...folder.links, link] }
        : folder
    );
    setVaultData(updatedFolders);
    setShowAddLinkModal(false);
  };

  const handleEditFolder = (folder: FolderData) => {
    setEditingFolder(folder);
    setShowEditFolderModal(true);
  };

  const handleSaveFolder = (updatedFolder: FolderData) => {
    if (currentAdminEmail) {
      const newEntry: AuditLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        email: currentAdminEmail,
        action: "folder_edited",
        resourceType: "folder",
        resourceName: updatedFolder.name,
      };
      setAuditLog([...auditLog, newEntry]);
    }
    const updatedFolders = vaultData.map((folder) =>
      folder.id === updatedFolder.id ? updatedFolder : folder
    );
    setVaultData(updatedFolders);
    setShowEditFolderModal(false);
  };

  const handleDeleteFolder = () => {
    if (editingFolder) {
      if (currentAdminEmail) {
        const newEntry: AuditLogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          email: currentAdminEmail,
          action: "folder_deleted",
          resourceType: "folder",
          resourceName: editingFolder.name,
        };
        setAuditLog([...auditLog, newEntry]);
      }
      const updatedFolders = vaultData.filter((f) => f.id !== editingFolder.id);
      setVaultData(updatedFolders);
      setActiveFolder("all");
      setShowEditFolderModal(false);
    }
  };

  const handleOwnerSignIn = () => {
    setIsOwnerMode(true);
    setShowOwnerSignIn(false);
  };

  const handleSavePasswords = (vaultPassword: string, adminPassword: string) => {
    savePasswords(vaultPassword, adminPassword);
    setStoredPasswords({ vault: vaultPassword, admin: adminPassword });
  };

  const handleLinkClick = (link: LinkItem) => {
    recordLinkClick(link.id);
    const newStats = loadClickStats();
    setClickStats(newStats);
    if (currentAdminEmail) {
      const newEntry: AuditLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        email: currentAdminEmail,
        action: "link_accessed",
        resourceType: "link",
        resourceName: link.title,
      };
      setAuditLog([...auditLog, newEntry]);
    }
  };

  const handleAdminEmailSignIn = (email: string) => {
    setCurrentAdminEmail(email);
    setShowAdminEmailSignIn(false);
  };

  const handleAdminLogout = () => {
    setCurrentAdminEmail(null);
    setIsEditMode(false);
  };

  // Handle link drag and drop
  const handleLinkDragStart = (e: React.DragEvent<HTMLAnchorElement>, linkId: string) => {
    e.preventDefault();
    setDraggedLinkId(linkId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleLinkDragOver = (e: React.DragEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleLinkDrop = (e: React.DragEvent<HTMLAnchorElement>, targetLinkId: string) => {
    e.preventDefault();
    if (!draggedLinkId || draggedLinkId === targetLinkId) {
      setDraggedLinkId(null);
      return;
    }

    const folder = vaultData.find((f) => f.id === activeFolder);
    if (!folder) return;

    const draggedIndex = folder.links.findIndex((l) => l.id === draggedLinkId);
    const targetIndex = folder.links.findIndex((l) => l.id === targetLinkId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newLinks = [...folder.links];
      const [draggedLink] = newLinks.splice(draggedIndex, 1);
      newLinks.splice(targetIndex, 0, draggedLink);

      const updatedFolders = vaultData.map((f) =>
        f.id === activeFolder ? { ...f, links: newLinks } : f
      );
      setVaultData(updatedFolders);
    }

    setDraggedLinkId(null);
  };

  // Handle folder drag and drop
  const handleFolderDragStart = (e: React.DragEvent<HTMLButtonElement>, folderId: string) => {
    e.preventDefault();
    setDraggedFolderId(folderId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleFolderDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleFolderDrop = (e: React.DragEvent<HTMLButtonElement>, targetFolderId: string) => {
    e.preventDefault();
    if (!draggedFolderId || draggedFolderId === targetFolderId) {
      setDraggedFolderId(null);
      return;
    }

    const draggedIndex = vaultData.findIndex((f) => f.id === draggedFolderId);
    const targetIndex = vaultData.findIndex((f) => f.id === targetFolderId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newFolders = [...vaultData];
      const [draggedFolder] = newFolders.splice(draggedIndex, 1);
      newFolders.splice(targetIndex, 0, draggedFolder);
      setVaultData(newFolders);
    }

    setDraggedFolderId(null);
  };

  const lockedLink = lockedLinkId
    ? protectedLinks.get(lockedLinkId)
    : null;

  const protectedLinksList = Array.from(protectedLinks.values());

  return (
    <div
      className="min-h-screen flex animate-unlock-reveal"
      style={{ background: "#0F172A" }}
    >
      {/* Modals */}
      <AdminPasswordModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={handleAdminUnlock}
      />

      <EditLinkModal
        isOpen={showEditModal}
        link={editingLink}
        isProtected={editingLink ? protectedLinks.has(editingLink.id) : false}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveLink}
        onDelete={handleDeleteLink}
        onSetPassword={handleSetPassword}
      />

      <SetLinkPasswordModal
        isOpen={showSetPasswordModal}
        link={editingLink}
        currentPassword={editingLink ? protectedLinks.get(editingLink.id)?.password ?? null : null}
        onClose={() => setShowSetPasswordModal(false)}
        onSave={handleSavePassword}
      />

      <LinkPasswordModal
        isOpen={showPasswordModal}
        linkTitle={allLinks.find((l) => l.id === lockedLinkId)?.title || "Link"}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handleUnlockLink}
        requiredPassword={lockedLink?.password || ""}
      />

      <PasswordManagerModal
        isOpen={showPasswordManager}
        onClose={() => setShowPasswordManager(false)}
        protectedLinks={protectedLinksList}
      />

      <AddNewLinkModal
        isOpen={showAddLinkModal}
        folderId={activeFolder}
        folderName={activeFolderData?.name || ""}
        onClose={() => setShowAddLinkModal(false)}
        onSave={handleAddNewLink}
      />

      <EditFolderModal
        isOpen={showEditFolderModal}
        folder={editingFolder}
        onClose={() => setShowEditFolderModal(false)}
        onSave={handleSaveFolder}
        onDelete={handleDeleteFolder}
      />

      <OwnerSignInModal
        isOpen={showOwnerSignIn}
        onClose={() => setShowOwnerSignIn(false)}
        onSuccess={handleOwnerSignIn}
      />

      <OwnerSettingsModal
        isOpen={showOwnerSettings}
        onClose={() => setShowOwnerSettings(false)}
        currentVaultPassword={storedPasswords.vault}
        currentAdminPassword={storedPasswords.admin}
        onSave={handleSavePasswords}
      />

      <LinkAnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        vaultData={vaultData}
        clickStats={clickStats}
      />

      <AdminEmailSignInModal
        isOpen={showAdminEmailSignIn}
        onClose={() => setShowAdminEmailSignIn(false)}
        onSuccess={handleAdminEmailSignIn}
      />

      <AuditLogModal
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
        auditLog={auditLog}
      />

      <PendingApprovalsModal
        isOpen={showPendingApprovals}
        onClose={() => setShowPendingApprovals(false)}
        pendingApprovals={pendingApprovals}
        onApprove={(id) => {
          approveEmailRequest(id);
          setPendingApprovals(loadPendingApprovals());
        }}
        onReject={(id) => {
          rejectEmailRequest(id);
          setPendingApprovals(loadPendingApprovals());
        }}
      />

      <AdminManagementModal
        isOpen={showAdminManagement}
        onClose={() => setShowAdminManagement(false)}
        adminEmails={adminEmails}
        onUpdatePassword={(email, newPassword) => {
          setAdminPassword(email, newPassword);
        }}
        onRemoveAdmin={(email) => {
          removeAdminPassword(email);
          const updatedEmails = adminEmails.filter((a) => a.email !== email);
          setAdminEmails(updatedEmails);
          saveAdminEmails(updatedEmails);
        }}
        ownerPassword={OWNER_PASSWORD}
      />

      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? "260px" : "0px",
          overflow: "hidden",
          background: "oklch(1 0 0 / 3%)",
          borderRight: "1px solid oklch(1 0 0 / 8%)",
        }}
      >
        <div style={{ width: "260px" }}>
          <div className="p-5 pb-4">
            <div className="flex items-center gap-2.5 mb-6">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663426870855/MTnGojgUB5HzdQARgKvcKo/vault-lock-icon-6PZsayaWfgxkZyGh8B2aGr.webp"
                alt="Vault"
                className="w-7 h-7 object-contain"
              />
              <span
                className="text-base font-bold"
                style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
              >
                Website Library - Made by Brayden
              </span>
            </div>

            <button
              onClick={() => setActiveFolder("all")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mb-1"
              style={{
                background:
                  activeFolder === "all"
                    ? "oklch(0.65 0.18 200 / 15%)"
                    : "transparent",
                border:
                  activeFolder === "all"
                    ? "1px solid oklch(0.65 0.18 200 / 30%)"
                    : "1px solid transparent",
                color:
                  activeFolder === "all"
                    ? "oklch(0.75 0.18 200)"
                    : "oklch(0.65 0.02 220)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <Folder size={15} />
              <span className="font-medium">All Links</span>
              <span
                className="ml-auto text-xs px-1.5 py-0.5 rounded-md"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.55 0.02 220)",
                }}
              >
                {allLinks.length}
              </span>
            </button>

            <div
              className="my-3 text-xs font-semibold uppercase tracking-widest px-3"
              style={{ color: "oklch(0.45 0.02 220)", fontFamily: "Sora, sans-serif" }}
            >
              Folders
            </div>

            <nav className="space-y-0.5">
              {vaultData.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolder(folder.id)}
                  draggable={!isEditMode}
                  onDragStart={(e) => !isEditMode && handleFolderDragStart(e, folder.id)}
                  onDragOver={(e) => !isEditMode && handleFolderDragOver(e)}
                  onDrop={(e) => !isEditMode && handleFolderDrop(e, folder.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group"
                  style={{
                    background:
                      activeFolder === folder.id
                        ? "oklch(0.65 0.18 200 / 15%)"
                        : "transparent",
                    border:
                      activeFolder === folder.id
                        ? "1px solid oklch(0.65 0.18 200 / 30%)"
                        : "1px solid transparent",
                    color:
                      activeFolder === folder.id
                        ? "oklch(0.75 0.18 200)"
                        : "oklch(0.65 0.02 220)",
                    fontFamily: "DM Sans, sans-serif",
                    opacity: draggedFolderId === folder.id ? 0.5 : 1,
                  }}
                >
                  <span className="text-base leading-none">{folder.icon}</span>
                  <span className="font-medium truncate flex-1 text-left">{folder.name}</span>
                  <span
                    className="ml-auto text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      background: "oklch(1 0 0 / 8%)",
                      color: "oklch(0.55 0.02 220)",
                    }}
                  >
                    {folder.links.length}
                  </span>
                  {!isEditMode && (
                    <GripVertical
                      size={12}
                      className="opacity-0 group-hover:opacity-60 transition-opacity duration-150 flex-shrink-0"
                      style={{ color: "oklch(0.65 0.18 200)" }}
                    />
                  )}
                  {isEditMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditFolder(folder);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0 p-1 rounded"
                      style={{ color: "oklch(0.65 0.18 200)" }}
                      title="Edit folder"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div
            className="p-4 mt-auto border-t space-y-2"
            style={{ borderColor: "oklch(1 0 0 / 8%)" }}
          >
            {isEditMode && activeFolder !== "all" && (
              <button
                onClick={() => setShowAddLinkModal(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  background: "oklch(0.65 0.18 145 / 10%)",
                  color: "oklch(0.75 0.18 145)",
                  fontFamily: "DM Sans, sans-serif",
                  border: "1px solid oklch(0.65 0.18 145 / 20%)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 15%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 10%)";
                }}
              >
                <Plus size={15} />
                <span>Add New Link</span>
              </button>
            )}

            {isEditMode && (
              <button
                onClick={() => setShowPasswordManager(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  background: "oklch(0.65 0.18 200 / 10%)",
                  color: "oklch(0.75 0.18 200)",
                  fontFamily: "DM Sans, sans-serif",
                  border: "1px solid oklch(0.65 0.18 200 / 20%)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 200 / 15%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 200 / 10%)";
                }}
              >
                <Key size={15} />
                <span>Password Manager</span>
              </button>
            )}

            <button
              onClick={() => setShowOwnerSignIn(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                background: isOwnerMode ? "oklch(0.65 0.18 145 / 15%)" : "oklch(1 0 0 / 4%)",
                color: isOwnerMode ? "oklch(0.75 0.18 145)" : "oklch(0.55 0.02 220)",
                fontFamily: "DM Sans, sans-serif",
                border: isOwnerMode ? "1px solid oklch(0.65 0.18 145 / 30%)" : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isOwnerMode) {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(1 0 0 / 8%)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isOwnerMode) {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(1 0 0 / 4%)";
                }
              }}
            >
              <Shield size={15} />
              <span>{isOwnerMode ? "Owner Mode On" : "Owner Access"}</span>
            </button>

            {isOwnerMode && (
              <>
                <button
                  onClick={() => setShowOwnerSettings(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: "oklch(0.65 0.18 145 / 10%)",
                    color: "oklch(0.75 0.18 145)",
                    fontFamily: "DM Sans, sans-serif",
                    border: "1px solid oklch(0.65 0.18 145 / 20%)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 15%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 10%)";
                  }}
                >
                  <Settings size={15} />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => setShowAnalytics(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: "oklch(0.65 0.18 145 / 10%)",
                    color: "oklch(0.75 0.18 145)",
                    fontFamily: "DM Sans, sans-serif",
                    border: "1px solid oklch(0.65 0.18 145 / 20%)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 15%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 10%)";
                  }}
                >
                  <BarChart3 size={15} />
                  <span>Analytics</span>
                </button>

                <button
                  onClick={() => setShowPendingApprovals(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: "oklch(0.65 0.18 145 / 10%)",
                    color: "oklch(0.75 0.18 145)",
                    fontFamily: "DM Sans, sans-serif",
                    border: "1px solid oklch(0.65 0.18 145 / 20%)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 15%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 10%)";
                  }}
                >
                  <Shield size={15} />
                  <span>Pending Approvals</span>
                  {pendingApprovals.filter((a) => a.status === "pending").length > 0 && (
                    <span
                      className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: "oklch(0.62 0.22 25 / 30%)",
                        color: "oklch(0.70 0.20 25)",
                      }}
                    >
                      {pendingApprovals.filter((a) => a.status === "pending").length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setShowAdminManagement(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: "oklch(0.65 0.18 145 / 10%)",
                    color: "oklch(0.75 0.18 145)",
                    fontFamily: "DM Sans, sans-serif",
                    border: "1px solid oklch(0.65 0.18 145 / 20%)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 15%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 145 / 10%)";
                  }}
                >
                  <Key size={15} />
                  <span>Manage Admins</span>
                </button>

                <button
                  onClick={() => setIsOwnerMode(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: "oklch(0.62 0.22 25 / 12%)",
                    color: "oklch(0.70 0.20 25)",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.62 0.22 25 / 20%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.62 0.22 25 / 12%)";
                  }}
                >
                  <Check size={15} />
                  <span>Exit Owner Mode</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowAdminEmailSignIn(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                background: currentAdminEmail ? "oklch(0.65 0.18 200 / 15%)" : "oklch(1 0 0 / 4%)",
                color: currentAdminEmail ? "oklch(0.75 0.18 200)" : "oklch(0.55 0.02 220)",
                fontFamily: "DM Sans, sans-serif",
                border: currentAdminEmail ? "1px solid oklch(0.65 0.18 200 / 30%)" : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!currentAdminEmail) {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(1 0 0 / 8%)";
                }
              }}
              onMouseLeave={(e) => {
                if (!currentAdminEmail) {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(1 0 0 / 4%)";
                }
              }}
            >
              <Shield size={15} />
              <span>{currentAdminEmail ? `Admin: ${currentAdminEmail.split("@")[0]}` : "Admin Sign In"}</span>
            </button>

            {currentAdminEmail && (
              <>
                <button
                  onClick={() => setShowAuditLog(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: "oklch(0.65 0.18 200 / 10%)",
                    color: "oklch(0.75 0.18 200)",
                    fontFamily: "DM Sans, sans-serif",
                    border: "1px solid oklch(0.65 0.18 200 / 20%)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 200 / 15%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.65 0.18 200 / 10%)";
                  }}
                >
                  <BarChart3 size={15} />
                  <span>Audit Log</span>
                </button>

                <button
                  onClick={handleAdminLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background: "oklch(0.62 0.22 25 / 12%)",
                    color: "oklch(0.70 0.20 25)",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.62 0.22 25 / 20%)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.62 0.22 25 / 12%)";
                  }}
                >
                  <LogOut size={15} />
                  <span>Admin Logout</span>
                </button>
              </>
            )}

            {(currentAdminEmail || isOwnerMode) && (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  background: isEditMode ? "oklch(0.65 0.18 200 / 15%)" : "oklch(1 0 0 / 4%)",
                  color: isEditMode ? "oklch(0.75 0.18 200)" : "oklch(0.55 0.02 220)",
                  fontFamily: "DM Sans, sans-serif",
                  border: isEditMode ? "1px solid oklch(0.65 0.18 200 / 30%)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isEditMode) {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(1 0 0 / 8%)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isEditMode) {
                    (e.currentTarget as HTMLButtonElement).style.background = "oklch(1 0 0 / 4%)";
                  }
                }}
              >
                <Edit2 size={15} />
                <span>{isEditMode ? "Edit Mode On" : "Edit Links"}</span>
              </button>
            )}

            {(currentAdminEmail || isOwnerMode) && isEditMode && (
              <button
                onClick={() => setIsEditMode(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  background: "oklch(0.62 0.22 25 / 12%)",
                  color: "oklch(0.70 0.20 25)",
                  fontFamily: "DM Sans, sans-serif",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.62 0.22 25 / 20%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.62 0.22 25 / 12%)";
                }}
              >
                <Check size={15} />
                <span>Done Editing</span>
              </button>
            )}

            <button
              onClick={onLock}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                color: "oklch(0.55 0.02 220)",
                fontFamily: "DM Sans, sans-serif",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "oklch(0.62 0.22 25 / 12%)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "oklch(0.70 0.20 25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "oklch(0.55 0.02 220)";
              }}
            >
              <LogOut size={15} />
              <span>Lock Vault</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-all duration-150"
            style={{
              color: "oklch(0.55 0.02 220)",
              background: "oklch(1 0 0 / 4%)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(1 0 0 / 8%)";
              (e.currentTarget as HTMLButtonElement).style.color = "#E2E8F0";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(1 0 0 / 4%)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "oklch(0.55 0.02 220)";
            }}
            title="Toggle sidebar"
          >
            <ChevronRight
              size={16}
              style={{
                transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          <div className="flex items-center gap-2">
            {activeFolder !== "all" && activeFolderData && (
              <>
                <button
                  onClick={() => setActiveFolder("all")}
                  className="text-sm transition-colors duration-150"
                  style={{ color: "oklch(0.55 0.02 220)", fontFamily: "DM Sans, sans-serif" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.75 0.18 200)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.55 0.02 220)";
                  }}
                >
                  All Links
                </button>
                <ChevronRight size={13} style={{ color: "oklch(0.40 0.02 220)" }} />
              </>
            )}
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
            >
              {activeFolder !== "all" && activeFolderData
                ? `${activeFolderData.icon} ${activeLabel}`
                : activeLabel}
            </h2>
            {isEditMode && (
              <span
                className="ml-2 text-xs px-2 py-1 rounded-lg"
                style={{
                  background: "oklch(0.65 0.18 200 / 20%)",
                  color: "oklch(0.75 0.18 200)",
                  fontFamily: "Sora, sans-serif",
                }}
              >
                EDIT MODE
              </span>
            )}
          </div>

          {!isEditMode && (
            <div className="ml-auto relative max-w-xs w-full">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "oklch(0.50 0.02 220)" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search links…"
                className="w-full pl-9 pr-9 py-2 rounded-lg text-sm outline-none transition-all duration-200"
                style={{
                  background: "oklch(1 0 0 / 5%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid oklch(0.65 0.18 200 / 50%)";
                  e.target.style.boxShadow = "0 0 0 3px oklch(0.65 0.18 200 / 10%)";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid oklch(1 0 0 / 10%)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "oklch(0.50 0.02 220)" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </header>

        {/* Link grid */}
        <main className="flex-1 p-6 overflow-auto">
          {filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Search size={32} style={{ color: "oklch(0.35 0.02 220)" }} />
              <p
                className="text-sm"
                style={{ color: "oklch(0.50 0.02 220)", fontFamily: "DM Sans, sans-serif" }}
              >
                {searchQuery ? `No links found for "${searchQuery}"` : "No links in this folder"}
              </p>
            </div>
          ) : activeFolder === "all" && !searchQuery && !isEditMode ? (
            // All folders view — grouped
            <div className="space-y-8 stagger-children">
              {vaultData.map((folder) => (
                <section key={folder.id}>
                  <button
                    onClick={() => setActiveFolder(folder.id)}
                    className="flex items-center gap-2.5 mb-4 group"
                  >
                    <span className="text-lg leading-none">{folder.icon}</span>
                    <h3
                      className="text-sm font-bold uppercase tracking-widest transition-colors duration-150"
                      style={{
                        fontFamily: "Sora, sans-serif",
                        color: "oklch(0.65 0.02 220)",
                      }}
                    >
                      {folder.name}
                    </h3>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md"
                      style={{
                        background: "oklch(1 0 0 / 8%)",
                        color: "oklch(0.50 0.02 220)",
                      }}
                    >
                      {folder.links.length}
                    </span>
                    <ChevronRight
                      size={13}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={{ color: "oklch(0.65 0.18 200)" }}
                    />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {folder.links.map((link) => (
                      <LinkCard
                        key={link.id}
                        link={link}
                        folderName={folder.name}
                        isProtected={protectedLinks.has(link.id)}
                        onDragStart={() => {}}
                        onDragOver={() => {}}
                        onDrop={() => {}}
                        onClickLocked={() => handleClickLockedLink(link.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            // Filtered / single folder view or edit mode
            <div>
              {searchQuery && !isEditMode && (
                <p
                  className="text-xs mb-4"
                  style={{ color: "oklch(0.50 0.02 220)", fontFamily: "DM Sans, sans-serif" }}
                >
                  {filteredLinks.length} result{filteredLinks.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 stagger-children">
                {filteredLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    folderName={
                      vaultData.find((f) =>
                        f.links.some((l) => l.id === link.id)
                      )?.name || "Unknown"
                    }
                    isProtected={protectedLinks.has(link.id)}
                    onDragStart={handleLinkDragStart}
                    onDragOver={handleLinkDragOver}
                    onDrop={handleLinkDrop}
                    isDragging={draggedLinkId === link.id}
                    isEditMode={isEditMode}
                    onEdit={handleEditLink}
                    onClickLocked={() => handleClickLockedLink(link.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────
export default function Home() {
  const [unlocked, setUnlocked] = useState(false);

  return unlocked ? (
    <VaultPage onLock={() => setUnlocked(false)} />
  ) : (
    <LockScreen onUnlock={() => setUnlocked(true)} />
  );
}
