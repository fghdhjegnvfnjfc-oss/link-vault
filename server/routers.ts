import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getAllVaultData,
  createFolder,
  updateFolder,
  deleteFolder,
  createLink,
  updateLink,
  deleteLink,
  reorderLinks,
  reorderFolders,
  recordLinkClick,
  addAuditEntry,
  getAuditLog,
} from "./db";
import { COOKIE_NAME } from "@shared/const";


export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ─── Vault Data Management ──────────────────────────────────────
  vault: router({
    // Get all vault data (links and folders)
    getAll: publicProcedure
      .query(async ({ ctx }) => {
        try {
          const vaultData = await getAllVaultData();
          return vaultData;
        } catch (error) {
          console.error("Failed to get vault data:", error);
          return { folders: [], links: [] };
        }
      }),

    // Add a new link to the vault
    addLink: publicProcedure
      .input(
        z.object({
          folderId: z.number(),
          title: z.string(),
          url: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await createLink(
            input.folderId,
            input.title,
            input.url,
            input.description
          );
          
          // Log the action
          if (ctx.user?.email) {
            await addAuditEntry(
              ctx.user.email,
              "link_created",
              "link",
              result,
              input.title,
              `Added link: ${input.url}`
            );
          }

          return { success: true, linkId: result };
        } catch (error) {
          console.error("Failed to add link:", error);
          throw new Error("Failed to add link");
        }
      }),

    // Update an existing link
    updateLink: publicProcedure
      .input(
        z.object({
          linkId: z.number(),
          title: z.string().optional(),
          url: z.string().optional(),
          description: z.string().optional(),
          isPasswordProtected: z.boolean().optional(),
          password: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const { linkId, ...updates } = input;
          await updateLink(linkId, updates);

          // Log the action
          if (ctx.user?.email) {
            await addAuditEntry(
              ctx.user.email,
              "link_updated",
              "link",
              linkId,
              updates.title,
              `Updated link with changes`
            );
          }

          return { success: true };
        } catch (error) {
          console.error("Failed to update link:", error);
          throw new Error("Failed to update link");
        }
      }),

    // Delete a link
    deleteLink: publicProcedure
      .input(z.object({ linkId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await deleteLink(input.linkId);

          // Log the action
          if (ctx.user?.email) {
            await addAuditEntry(
              ctx.user.email,
              "link_deleted",
              "link",
              input.linkId,
              undefined,
              `Deleted link`
            );
          }

          return { success: true };
        } catch (error) {
          console.error("Failed to delete link:", error);
          throw new Error("Failed to delete link");
        }
      }),

    // Add a new folder
    addFolder: publicProcedure
      .input(
        z.object({
          name: z.string(),
          icon: z.string().optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await createFolder(input.name, input.icon, input.color);

          // Log the action
          if (ctx.user?.email) {
            await addAuditEntry(
              ctx.user.email,
              "folder_created",
              "folder",
              result,
              input.name,
              `Created folder`
            );
          }

          return { success: true, folderId: result };
        } catch (error) {
          console.error("Failed to add folder:", error);
          throw new Error("Failed to add folder");
        }
      }),

    // Update an existing folder
    updateFolder: publicProcedure
      .input(
        z.object({
          folderId: z.number(),
          name: z.string().optional(),
          icon: z.string().optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const { folderId, ...updates } = input;
          await updateFolder(folderId, updates);

          // Log the action
          if (ctx.user?.email) {
            await addAuditEntry(
              ctx.user.email,
              "folder_updated",
              "folder",
              folderId,
              updates.name,
              `Updated folder`
            );
          }

          return { success: true };
        } catch (error) {
          console.error("Failed to update folder:", error);
          throw new Error("Failed to update folder");
        }
      }),

    // Delete a folder
    deleteFolder: publicProcedure
      .input(z.object({ folderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await deleteFolder(input.folderId);

          // Log the action
          if (ctx.user?.email) {
            await addAuditEntry(
              ctx.user.email,
              "folder_deleted",
              "folder",
              input.folderId,
              undefined,
              `Deleted folder`
            );
          }

          return { success: true };
        } catch (error) {
          console.error("Failed to delete folder:", error);
          throw new Error("Failed to delete folder");
        }
      }),

    // Reorder links within a folder
    reorderLinks: publicProcedure
      .input(
        z.object({
          linkIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          await reorderLinks(input.linkIds);
          return { success: true };
        } catch (error) {
          console.error("Failed to reorder links:", error);
          throw new Error("Failed to reorder links");
        }
      }),

    // Reorder folders
    reorderFolders: publicProcedure
      .input(
        z.object({
          folderIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          await reorderFolders(input.folderIds);
          return { success: true };
        } catch (error) {
          console.error("Failed to reorder folders:", error);
          throw new Error("Failed to reorder folders");
        }
      }),

    // Record a link click
    recordClick: publicProcedure
      .input(z.object({ linkId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await recordLinkClick(input.linkId);

          // Log the action
          if (ctx.user?.email) {
            await addAuditEntry(
              ctx.user.email,
              "link_accessed",
              "link",
              input.linkId,
              undefined,
              `Link accessed`
            );
          }

          return { success: true };
        } catch (error) {
          console.error("Failed to record click:", error);
          return { success: false };
        }
      }),

    // Get audit log
    getAuditLog: publicProcedure
      .query(async ({ ctx }) => {
        try {
          const log = await getAuditLog();
          return log;
        } catch (error) {
          console.error("Failed to get audit log:", error);
          return [];
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
