import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import * as db from './db';
import { bids, projects } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { calculateProposalCosts, validateProposal, getCostBreakdownItems } from './proposalCalculations';

/**
 * Proposal Router - tRPC procedures for bid proposal management
 */

export const proposalRouter = router({
  /**
   * Generate a proposal for a project
   */
  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        squareFootage: z.number().positive(),
        buildingStories: z.number().int().min(1),
        wageType: z.enum(['private', 'prevailing']),
        prevailingWageRateId: z.number().optional(),
        includeWindowWashing: z.boolean().optional().default(false),
        includeWaxing: z.boolean().optional().default(false),
        projectLocation: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not authenticated');
      }

      try {
        // Get user's bid parameters
        const parameters = await db.getBidParametersByUserId(ctx.user.id);
        if (!parameters) {
          throw new Error('Bid parameters not configured. Please import your parameters first.');
        }

        // Get prevailing wage rate if specified
        let prevailingRate = undefined;
        if (input.wageType === 'prevailing' && input.prevailingWageRateId) {
          // Note: In production, you'd query the prevailing wage rate by ID
          // For now, we'll use the getPrevailingWageRate function
          // prevailingRate = await db.getPrevailingWageRateById(input.prevailingWageRateId);
          // if (!prevailingRate) {
          //   throw new Error('Prevailing wage rate not found');
          // }
        }

        // Calculate proposal costs
        const costBreakdown = calculateProposalCosts(
          input.squareFootage,
          input.buildingStories,
          input.wageType,
          parameters,
          prevailingRate,
          input.includeWindowWashing,
          input.includeWaxing,
          input.projectLocation,
        );

        // Validate proposal
        const proposal = {
          projectId: input.projectId,
          projectName: '', // Will be populated from project
          location: input.projectLocation || '',
          squareFootage: input.squareFootage,
          buildingStories: input.buildingStories,
          wageType: input.wageType as 'private' | 'prevailing',
          prevailingWageRate: undefined, // Will be set from parameters if needed
          includeWindowWashing: input.includeWindowWashing,
          includeWaxing: input.includeWaxing,
          includeTravel: !!input.projectLocation,
          costBreakdown,
          notes: input.notes,
        };

        const validation = validateProposal(proposal);
        if (!validation.valid) {
          throw new Error(`Proposal validation failed: ${validation.errors.join(', ')}`);
        }

        // Create bid record
        const bidDb = await db.getDb();
        if (!bidDb) {
          throw new Error('Database connection failed');
        }

        const insertResult = await bidDb.insert(bids).values({
          projectId: input.projectId,
          userId: ctx.user.id,
          projectName: '',
          projectAddress: input.projectLocation || '',
          projectSqft: Math.round(input.squareFootage),
          crewDays: 10,
          crewPeople: 10,
          isPrivateWage: input.wageType === 'private' ? 1 : 0,
          travelDistance: 0,
          travelCost: costBreakdown.travelCost,
          additionalCosts: 0,
          includeWaxing: input.includeWaxing ? 1 : 0,
          includeCarpet: 0,
          includeWindows: input.includeWindowWashing ? 1 : 0,
          status: 'draft',
          bidAmount: costBreakdown.totalBid,
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          notes: input.notes,
        });

        const bidId = (insertResult as any).insertId || 0;

        return {
          bidId,
          proposal,
          costBreakdown,
          costItems: getCostBreakdownItems(costBreakdown),
        };
      } catch (error) {
        console.error('[Proposal Router] Error generating proposal:', error);
        throw error;
      }
    }),

  /**
   * Get a proposal by bid ID
   */
  getByBidId: protectedProcedure
    .input(z.object({ bidId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not authenticated');
      }

      try {
        const bid = await db.getBidWithProject(input.bidId);
        if (!bid || bid.userId !== ctx.user.id) {
          throw new Error('Bid not found or access denied');
        }

        // Get project details
        const bidDb = await db.getDb();
        if (!bidDb) {
          throw new Error('Database connection failed');
        }
        const projectResult = await bidDb.select().from(projects).where(eq(projects.id, bid.projectId)).limit(1);
        const project = projectResult.length > 0 ? projectResult[0] : null;
        if (!project) {
          throw new Error('Project not found');
        }

        // Reconstruct proposal from bid data
        // Note: In a production system, you'd store the full proposal details
        return {
          bid,
          project,
        };
      } catch (error) {
        console.error('[Proposal Router] Error retrieving proposal:', error);
        throw error;
      }
    }),

  /**
   * Update proposal wage type and recalculate costs
   */
  updateWageType: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        wageType: z.enum(['private', 'prevailing']),
        prevailingWageRateId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not authenticated');
      }

      try {
        const bid = await db.getBidWithProject(input.bidId);
        if (!bid || bid.userId !== ctx.user.id) {
          throw new Error('Bid not found or access denied');
        }

        // Update bid wage type
        const bidDb = await db.getDb();
        if (!bidDb) {
          throw new Error('Database connection failed');
        }
        await bidDb.update(bids).set({ isPrivateWage: input.wageType === 'private' ? 1 : 0 }).where(eq(bids.id, input.bidId));

        return { success: true, bidId: input.bidId };
      } catch (error) {
        console.error('[Proposal Router] Error updating wage type:', error);
        throw error;
      }
    }),

  /**
   * Approve a proposal
   */
  approve: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        approvalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not authenticated');
      }

      try {
        const bid = await db.getBidWithProject(input.bidId);
        if (!bid || bid.userId !== ctx.user.id) {
          throw new Error('Bid not found or access denied');
        }

        // Mark legacy approval as sent in the simplified tracking workflow.
        const bidDb = await db.getDb();
        if (!bidDb) {
          throw new Error('Database connection failed');
        }
        await bidDb.update(bids).set({ status: 'sent', notes: input.approvalNotes }).where(eq(bids.id, input.bidId));

        return { success: true, bidId: input.bidId, status: 'sent' };
      } catch (error) {
        console.error('[Proposal Router] Error approving proposal:', error);
        throw error;
      }
    }),

  /**
   * Reject a proposal
   */
  reject: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        rejectionReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not authenticated');
      }

      try {
        const bid = await db.getBidWithProject(input.bidId);
        if (!bid || bid.userId !== ctx.user.id) {
          throw new Error('Bid not found or access denied');
        }

        // Update bid status to draft (rejected)
        const bidDb = await db.getDb();
        if (!bidDb) {
          throw new Error('Database connection failed');
        }
        await bidDb.update(bids).set({ status: 'draft', notes: `Rejected: ${input.rejectionReason}` }).where(eq(bids.id, input.bidId));

        return { success: true, bidId: input.bidId, status: 'draft' };
      } catch (error) {
        console.error('[Proposal Router] Error rejecting proposal:', error);
        throw error;
      }
    }),

  /**
   * Submit a proposal
   */
  submit: protectedProcedure
    .input(z.object({ bidId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not authenticated');
      }

      try {
        const bid = await db.getBidWithProject(input.bidId);
        if (!bid || bid.userId !== ctx.user.id) {
          throw new Error('Bid not found or access denied');
        }

        // Update bid status to sent
        const bidDb = await db.getDb();
        if (!bidDb) {
          throw new Error('Database connection failed');
        }
        const sentAt = new Date();
        const followUpAt = new Date(sentAt);
        followUpAt.setDate(followUpAt.getDate() + 30);
        await bidDb.update(bids).set({
          status: 'sent',
          sentAt,
          submittedAt: sentAt,
          followUpAt,
          followUpDueAt: followUpAt,
        }).where(eq(bids.id, input.bidId));

        return { success: true, bidId: input.bidId, status: 'sent' };
      } catch (error) {
        console.error('[Proposal Router] Error submitting proposal:', error);
        throw error;
      }
    }),

  /**
   * Get all proposals for a user
   */
  listByUser: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error('User not authenticated');
    }

    try {
      return await db.getBidsByUserId(ctx.user.id);
    } catch (error) {
      console.error('[Proposal Router] Error listing proposals:', error);
      throw error;
    }
  }),
});
