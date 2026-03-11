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

// ─── Vault Management ────────────────────────────────────────
export const vaults = mysqlTable("vaults", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  vaultPassword: varchar("vaultPassword", { length: 255 }).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vault = typeof vaults.$inferSelect;
export type InsertVault = typeof vaults.$inferInsert;

// ─── Vault Members (Admins & Collaborators) ────────────────────
export const vaultMembers = mysqlTable("vaultMembers", {
  id: int("id").autoincrement().primaryKey(),
  vaultId: int("vaultId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "editor", "viewer"]).default("editor").notNull(),
  adminPassword: varchar("adminPassword", { length: 255 }),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type VaultMember = typeof vaultMembers.$inferSelect;
export type InsertVaultMember = typeof vaultMembers.$inferInsert;

// ─── Folders ──────────────────────────────────────────────────
export const folders = mysqlTable("folders", {
  id: int("id").autoincrement().primaryKey(),
  vaultId: int("vaultId").notNull(),
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
  vaultId: int("vaultId").notNull(),
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

// ─── Audit Log ────────────────────────────────────────────────
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  vaultId: int("vaultId").notNull(),
  userId: int("userId").notNull(),
  action: mysqlEnum("action", [
    "link_created",
    "link_updated",
    "link_deleted",
    "link_accessed",
    "folder_created",
    "folder_updated",
    "folder_deleted",
    "member_added",
    "member_removed",
    "vault_settings_changed",
  ]).notNull(),
  resourceType: mysqlEnum("resourceType", ["link", "folder", "vault", "member"]).notNull(),
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
  vaultId: int("vaultId").notNull(),
  userId: int("userId").notNull(),
  sessionId: varchar("sessionId", { length: 255 }).notNull().unique(),
  userColor: varchar("userColor", { length: 50 }).notNull(),
  isOnline: boolean("isOnline").default(true).notNull(),
  lastHeartbeat: timestamp("lastHeartbeat").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;

// ─── Edit State (who's editing what) ──────────────────────────
export const editState = mysqlTable("editState", {
  id: int("id").autoincrement().primaryKey(),
  vaultId: int("vaultId").notNull(),
  sessionId: varchar("sessionId", { length: 255 }).notNull(),
  userId: int("userId").notNull(),
  resourceType: mysqlEnum("resourceType", ["link", "folder"]).notNull(),
  resourceId: int("resourceId").notNull(),
  fieldName: varchar("fieldName", { length: 100 }),
  currentValue: text("currentValue"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  lastUpdate: timestamp("lastUpdate").defaultNow().onUpdateNow().notNull(),
});

export type EditStateEntry = typeof editState.$inferSelect;
export type InsertEditStateEntry = typeof editState.$inferInsert;