import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { contractors } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const contractorsRouter = router({
  // Get all contractors for the user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(contractors)
      .where(eq(contractors.userId, ctx.user.id))
      .orderBy(contractors.name);
  }),

  // Get default contractor for the user
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const result = await db
      .select()
      .from(contractors)
      .where(
        and(
          eq(contractors.userId, ctx.user.id),
          eq(contractors.isDefault, 1)
        )
      )
      .limit(1);
    return result[0] || null;
  }),

  // Create a new contractor
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        company: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        notes: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(contractors)
          .set({ isDefault: 0 })
          .where(eq(contractors.userId, ctx.user.id));
      }

      await db.insert(contractors).values({
        userId: ctx.user.id,
        name: input.name,
        company: input.company,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        notes: input.notes,
        isDefault: input.isDefault ? 1 : 0,
      });

      return { success: true };
    }),

  // Update a contractor
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        company: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        notes: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async (opts: any) => {
      const { ctx, input } = opts;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(contractors)
          .set({ isDefault: 0 })
          .where(eq(contractors.userId, ctx.user.id));
      }

      await db
        .update(contractors)
        .set({
          name: input.name,
          company: input.company,
          phone: input.phone,
          email: input.email,
          address: input.address,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          notes: input.notes,
          isDefault: input.isDefault ? 1 : 0,
        })
        .where(
          and(
            eq(contractors.id, input.id),
            eq(contractors.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Delete a contractor
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .delete(contractors)
        .where(
          and(
            eq(contractors.id, input.id),
            eq(contractors.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});
