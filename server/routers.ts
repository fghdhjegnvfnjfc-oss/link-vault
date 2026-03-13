const COOKIE_NAME = "session";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";

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

  vault: router({
    getAll: publicProcedure.query(async () => {
      const vaultData = await db.getVaultData(1); // Using vault ID 1 for single shared vault
      return vaultData;
    }),
    addLink: publicProcedure
      .input(z.object({
        folderId: z.number(),
        title: z.string(),
        url: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.addLink(1, input.folderId, input.title, input.url, input.description || "");
      }),
    updateLink: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string(),
        url: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateLink(input.id, input.title, input.url, input.description || "");
      }),
    deleteLink: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteLink(input.id);
      }),
    addFolder: publicProcedure
      .input(z.object({
        name: z.string(),
        icon: z.string(),
        color: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.addFolder(1, input.name, input.icon, input.color);
      }),
    updateFolder: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        icon: z.string(),
        color: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateFolder(input.id, input.name, input.icon, input.color);
      }),
    deleteFolder: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteFolder(input.id);
      }),
  }),

  owner: router({
    getPasswords: publicProcedure.query(async () => {
      return await db.getOwnerPasswords(1);
    }),
    updatePasswords: publicProcedure
      .input(z.object({
        ownerPassword: z.string(),
        adminPassword: z.string(),
        vaultPassword: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateOwnerPasswords(1, input.ownerPassword, input.adminPassword, input.vaultPassword);
      }),
    getChangeHistory: publicProcedure.query(async () => {
      return await db.getChangeHistory(1, 100);
    }),
    restoreChange: publicProcedure
      .input(z.object({ changeId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.restoreFromHistory(input.changeId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
