import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
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

// ─── Vault Functions ────────────────────────────────────────
export async function getVaultData(vaultId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { folders: foldersTable, links: linksTable } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const folders = await db.select().from(foldersTable).where(eq(foldersTable.vaultId, vaultId));
    const links = await db.select().from(linksTable).where(eq(linksTable.vaultId, vaultId));
    return { folders, links };
  } catch (error) {
    console.error("[Database] Failed to get vault data:", error);
    return null;
  }
}

export async function addLink(vaultId: number, folderId: number, title: string, url: string, description: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { links: linksTable } = await import("../drizzle/schema");
    const result = await db.insert(linksTable).values({
      vaultId,
      folderId,
      title,
      url,
      description,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to add link:", error);
    return null;
  }
}

export async function updateLink(linkId: number, title: string, url: string, description: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { links: linksTable } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db.update(linksTable).set({
      title,
      url,
      description,
    }).where(eq(linksTable.id, linkId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update link:", error);
    return null;
  }
}

export async function deleteLink(linkId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { links: linksTable } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db.delete(linksTable).where(eq(linksTable.id, linkId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to delete link:", error);
    return null;
  }
}

export async function addFolder(vaultId: number, name: string, icon: string, color: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { folders: foldersTable } = await import("../drizzle/schema");
    const result = await db.insert(foldersTable).values({
      vaultId,
      name,
      icon,
      color,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to add folder:", error);
    return null;
  }
}

export async function updateFolder(folderId: number, name: string, icon: string, color: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { folders: foldersTable } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db.update(foldersTable).set({
      name,
      icon,
      color,
    }).where(eq(foldersTable.id, folderId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to update folder:", error);
    return null;
  }
}

export async function deleteFolder(folderId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const { folders: foldersTable } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db.delete(foldersTable).where(eq(foldersTable.id, folderId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to delete folder:", error);
    return null;
  }
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

// TODO: add feature queries here as your schema grows.
