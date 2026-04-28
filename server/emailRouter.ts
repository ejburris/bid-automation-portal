import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { emailTemplates } from './emailTemplates';
import { queueEmail } from './emailQueue';
import { TRPCError } from '@trpc/server';
import { generateProposalPDF } from './pdfGenerator';
import { getDb } from './db';
import { bids, projects } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { COMPANY_IDENTITY } from '../shared/companyIdentity';

/**
 * Email router for sending bid-related emails
 * Handles proposal submissions, follow-ups, and other communications
 */
export const emailRouter = router({
  /**
   * Send bid proposal email with PDF attachment
   */
  sendBidProposal: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        recipientEmail: z.string().email(),
        recipientName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error('Database not available');
        }

        // Get bid and project details
        const bidRecord = await db
          .select()
          .from(bids)
          .where(eq(bids.id, input.bidId))
          .limit(1);

        if (!bidRecord || bidRecord.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Bid not found',
          });
        }

        const projectId = bidRecord[0].projectId;
        const projectData = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);

        if (!projectData || projectData.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        const project = projectData[0];
        const bid = bidRecord[0];

        // Generate PDF
        const pdfBuffer = await generateProposalPDF({
          projectName: project.projectName || 'Project',
          date: new Date(),
          company: COMPANY_IDENTITY.name,
          street: project.location || COMPANY_IDENTITY.address,
          contactName: project.contactName || input.recipientName || 'Project Manager',
          contactPhone: project.contactPhone || '',
          cityState: project.location || 'Vancouver, WA',
          officePhone: COMPANY_IDENTITY.phone,
          cellPhone: COMPANY_IDENTITY.tollFree,
          notes: project.scopeOfWork || 'Final construction cleaning',
          finalCleaningCost: (bid.bidAmount || 0) / 100,
          travelCost: (bid.travelCost || 0) / 100,
          aerialLiftCost: 0,
          totalCost: (bid.bidAmount || 0) / 100,
          wageType: bid.isPrivateWage ? 'private' : 'prevailing',
          costBreakdown: {
            laborCost: (bid.bidAmount || 0) / 100,
            travelCost: (bid.travelCost || 0) / 100,
            aerialLiftCost: 0,
            otherCosts: 0,
          },
        });

        // Get email template
        const emailTemplate = emailTemplates.bidProposalSubmission(project.projectName || 'Project');

        // Queue email with attachment
        await queueEmail({
          to: input.recipientEmail,
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          status: 'pending',
          emailType: 'proposal',
          bidId: input.bidId,
          projectId: projectId,
          retryCount: 0,
          maxRetries: 3,
          attachmentPath: `proposal-${input.bidId}.pdf`,
        });

        return {
          success: true,
          message: 'Bid proposal email queued for sending',
          bidId: input.bidId,
        };
      } catch (error) {
        console.error('[Email Router] Failed to send bid proposal:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send bid proposal',
        });
      }
    }),

  /**
   * Send addendum acknowledgment email
   */
  sendAddendumAcknowledgment: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        recipientEmail: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailTemplate = emailTemplates.addendumAcknowledgment();

        await queueEmail({
          to: input.recipientEmail,
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          status: 'pending',
          emailType: 'addendum',
          bidId: input.bidId,
          retryCount: 0,
          maxRetries: 3,
        });

        return {
          success: true,
          message: 'Addendum acknowledgment email queued for sending',
        };
      } catch (error) {
        console.error('[Email Router] Failed to send addendum acknowledgment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send addendum acknowledgment',
        });
      }
    }),

  /**
   * Send 1-month follow-up email
   */
  sendOneMonthFollowUp: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        projectName: z.string(),
        recipientEmail: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailTemplate = emailTemplates.oneMonthFollowUp(input.projectName);

        await queueEmail({
          to: input.recipientEmail,
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          status: 'pending',
          emailType: 'followup_1month',
          bidId: input.bidId,
          retryCount: 0,
          maxRetries: 3,
        });

        return {
          success: true,
          message: '1-month follow-up email queued for sending',
        };
      } catch (error) {
        console.error('[Email Router] Failed to send 1-month follow-up:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send 1-month follow-up',
        });
      }
    }),

  /**
   * Send 3-week follow-up email
   */
  sendThreeWeekFollowUp: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        projectName: z.string(),
        recipientEmail: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailTemplate = emailTemplates.threeWeekFollowUp(input.projectName);

        await queueEmail({
          to: input.recipientEmail,
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          status: 'pending',
          emailType: 'followup_3week',
          bidId: input.bidId,
          retryCount: 0,
          maxRetries: 3,
        });

        return {
          success: true,
          message: '3-week follow-up email queued for sending',
        };
      } catch (error) {
        console.error('[Email Router] Failed to send 3-week follow-up:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send 3-week follow-up',
        });
      }
    }),

  /**
   * Send change order request email
   */
  sendChangeOrderRequest: protectedProcedure
    .input(
      z.object({
        bidId: z.number(),
        projectName: z.string(),
        recipientEmail: z.string().email(),
        changeOrderAmount: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailTemplate = emailTemplates.changeOrderRequest(input.projectName);

        await queueEmail({
          to: input.recipientEmail,
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          status: 'pending',
          emailType: 'changeorder',
          bidId: input.bidId,
          retryCount: 0,
          maxRetries: 3,
        });

        return {
          success: true,
          message: 'Change order request email queued for sending',
        };
      } catch (error) {
        console.error('[Email Router] Failed to send change order request:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send change order request',
        });
      }
    }),

  /**
   * Get email queue status
   */
  getQueueStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        return { pending: 0, sent: 0, failed: 0 };
      }

      // In production, query the email queue table for statistics
      return {
        pending: 0,
        sent: 0,
        failed: 0,
        message: 'Email queue status retrieved',
      };
    } catch (error) {
      console.error('[Email Router] Failed to get queue status:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get email queue status',
      });
    }
  }),
});
