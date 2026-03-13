import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, folders, links, auditLog, vault } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Link Vault Data Functions ────────────────────────────────────

// Get all folders with their links
export async function getAllVaultData() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get vault data: database not available");
    return { folders: [], links: [] };
  }

  try {
    const allFolders = await db
      .select()
      .from(folders)
      .orderBy(folders.displayOrder);

    const allLinks = await db
      .select()
      .from(links)
      .orderBy(links.displayOrder);

    return { folders: allFolders, links: allLinks };
  } catch (error) {
    console.error("[Database] Failed to get vault data:", error);
    return { folders: [], links: [] };
  }
}

// Create a new folder
export async function createFolder(
  name: string,
  icon: string = "📁",
  color: string = "oklch(0.65 0.18 200)"
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(folders).values({
      name,
      icon,
      color,
      displayOrder: 0,
    });
    return (result as any)[0]?.insertId || 1;
  } catch (error) {
    console.error("[Database] Failed to create folder:", error);
    throw error;
  }
}

// Update a folder
export async function updateFolder(
  folderId: number,
  updates: { name?: string; icon?: string; color?: string }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .update(folders)
      .set(updates)
      .where(eq(folders.id, folderId));
  } catch (error) {
    console.error("[Database] Failed to update folder:", error);
    throw error;
  }
}

// Delete a folder
export async function deleteFolder(folderId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Delete all links in the folder first
    await db.delete(links).where(eq(links.folderId, folderId));
    // Then delete the folder
    await db.delete(folders).where(eq(folders.id, folderId));
  } catch (error) {
    console.error("[Database] Failed to delete folder:", error);
    throw error;
  }
}

// Create a new link
export async function createLink(
  folderId: number,
  title: string,
  url: string,
  description?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db.insert(links).values({
      folderId,
      title,
      url,
      description,
      displayOrder: 0,
    });
    return (result as any)[0]?.insertId || 1;
  } catch (error) {
    console.error("[Database] Failed to create link:", error);
    throw error;
  }
}

// Update a link
export async function updateLink(
  linkId: number,
  updates: {
    title?: string;
    url?: string;
    description?: string;
    isPasswordProtected?: boolean;
    password?: string | null;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .update(links)
      .set(updates)
      .where(eq(links.id, linkId));
  } catch (error) {
    console.error("[Database] Failed to update link:", error);
    throw error;
  }
}

// Delete a link
export async function deleteLink(linkId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.delete(links).where(eq(links.id, linkId));
  } catch (error) {
    console.error("[Database] Failed to delete link:", error);
    throw error;
  }
}

// Reorder links within a folder
export async function reorderLinks(linkIds: number[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    for (let i = 0; i < linkIds.length; i++) {
      await db
        .update(links)
        .set({ displayOrder: i })
        .where(eq(links.id, linkIds[i]));
    }
  } catch (error) {
    console.error("[Database] Failed to reorder links:", error);
    throw error;
  }
}

// Reorder folders
export async function reorderFolders(folderIds: number[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    for (let i = 0; i < folderIds.length; i++) {
      await db
        .update(folders)
        .set({ displayOrder: i })
        .where(eq(folders.id, folderIds[i]));
    }
  } catch (error) {
    console.error("[Database] Failed to reorder folders:", error);
    throw error;
  }
}

// Record a link click
export async function recordLinkClick(linkId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot record link click: database not available");
    return;
  }

  try {
    const link = await db.select().from(links).where(eq(links.id, linkId)).limit(1);
    if (link.length > 0) {
      await db
        .update(links)
        .set({ clickCount: (link[0].clickCount || 0) + 1 })
        .where(eq(links.id, linkId));
    }
  } catch (error) {
    console.error("[Database] Failed to record link click:", error);
  }
}

// Add an audit log entry
export async function addAuditEntry(
  email: string,
  action: string,
  resourceType: "link" | "folder" | "vault" | "admin",
  resourceId?: number,
  resourceName?: string,
  details?: string
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add audit entry: database not available");
    return;
  }

  try {
    await db.insert(auditLog).values({
      email,
      action: action as any,
      resourceType,
      resourceId,
      resourceName,
      details,
    });
  } catch (error) {
    console.error("[Database] Failed to add audit entry:", error);
  }
}

// Get audit log
export async function getAuditLog() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get audit log: database not available");
    return [];
  }

  try {
    return await db.select().from(auditLog).orderBy(desc(auditLog.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get audit log:", error);
    return [];
  }
}
