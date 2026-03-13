import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── LINK VAULT SCHEMA ────────────────────────────────────────

// ─── Vault Configuration ──────────────────────────────────────
export const vault = mysqlTable("vault", {
  id: int("id").autoincrement().primaryKey(),
  vaultPassword: varchar("vaultPassword", { length: 255 }).notNull(),
  ownerPassword: varchar("ownerPassword", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vault = typeof vault.$inferSelect;
export type InsertVault = typeof vault.$inferInsert;

// ─── Folders ──────────────────────────────────────────────────
export const folders = mysqlTable("folders", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  icon: varchar("icon", { length: 10 }).default("📁").notNull(),
  color: varchar("color", { length: 50 }).default("oklch(0.65 0.18 200)").notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

// ─── Links ────────────────────────────────────────────────────
export const links = mysqlTable("links", {
  id: int("id").autoincrement().primaryKey(),
  folderId: int("folderId").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  isPasswordProtected: boolean("isPasswordProtected").default(false).notNull(),
  password: varchar("password", { length: 255 }),
  displayOrder: int("displayOrder").default(0).notNull(),
  clickCount: int("clickCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Link = typeof links.$inferSelect;
export type InsertLink = typeof links.$inferInsert;

// ─── Admin Accounts ───────────────────────────────────────────
export const adminAccounts = mysqlTable("adminAccounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  isApproved: boolean("isApproved").default(false).notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminAccount = typeof adminAccounts.$inferSelect;
export type InsertAdminAccount = typeof adminAccounts.$inferInsert;

// ─── Pending Admin Approvals ──────────────────────────────────
export const pendingAdminApprovals = mysqlTable("pendingAdminApprovals", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
});

export type PendingAdminApproval = typeof pendingAdminApprovals.$inferSelect;
export type InsertPendingAdminApproval = typeof pendingAdminApprovals.$inferInsert;

// ─── Audit Log ────────────────────────────────────────────────
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  action: mysqlEnum("action", [
    "link_created",
    "link_updated",
    "link_deleted",
    "link_accessed",
    "link_password_set",
    "folder_created",
    "folder_updated",
    "folder_deleted",
    "vault_password_changed",
    "admin_account_created",
    "admin_account_removed",
    "admin_password_changed",
  ]).notNull(),
  resourceType: mysqlEnum("resourceType", ["link", "folder", "vault", "admin"]).notNull(),
  resourceId: int("resourceId"),
  resourceName: text("resourceName"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

// ─── Active Sessions (for presence tracking) ───────────────────
export const activeSessions = mysqlTable("activeSessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull().unique(),
  userEmail: varchar("userEmail", { length: 320 }),
  userColor: varchar("userColor", { length: 50 }).notNull(),
  isOnline: boolean("isOnline").default(true).notNull(),
  lastHeartbeat: timestamp("lastHeartbeat").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;

// ─── Banned Users (for kick/ban system) ───────────────────────
export const bannedUsers = mysqlTable("bannedUsers", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 255 }).notNull().unique(),
  reason: text("reason"),
  bannedBy: varchar("bannedBy", { length: 320 }).notNull(),
  bannedAt: timestamp("bannedAt").defaultNow().notNull(),
});

export type BannedUser = typeof bannedUsers.$inferSelect;
export type InsertBannedUser = typeof bannedUsers.$inferInsert;

// ─── Relations ────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(activeSessions),
}));

export const foldersRelations = relations(folders, ({ many }) => ({
  links: many(links),
}));

export const linksRelations = relations(links, ({ one }) => ({
  folder: one(folders, { fields: [links.folderId], references: [folders.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  // No direct relations needed for audit log in this schema
}));

export const activeSessionsRelations = relations(activeSessions, ({ one }) => ({
  user: one(users, { fields: [activeSessions.id], references: [users.id] }),
}));

export const bannedUsersRelations = relations(bannedUsers, ({ many }) => ({
  // No direct relations needed
}));
