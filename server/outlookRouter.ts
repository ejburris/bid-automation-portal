import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { OutlookAuthService } from './outlookAuth';
import { OutlookEmailService } from './outlookEmailService';
import { BidOpportunityDetector } from './bidOpportunityDetector';
import { getDb } from './db';
import { TRPCError } from '@trpc/server';
import { projects } from '../drizzle/schema';

/**
 * Outlook integration router
 * Handles email sync, bid opportunity detection, and project creation
 */
export const outlookRouter = router({
  /**
   * Get authorization URL for Outlook OAuth
   */
  getAuthUrl: protectedProcedure.query(async ({ ctx }) => {
    try {
      const authService = new OutlookAuthService({
        clientId: process.env.OUTLOOK_CLIENT_ID || '',
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
        redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/api/outlook/callback',
        authority: 'https://login.microsoftonline.com/common',
      });

      const authUrl = await authService.getAuthorizationUrl();
      return { authUrl };
    } catch (error) {
      console.error('[Outlook Router] Failed to get auth URL:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate Outlook authorization URL',
      });
    }
  }),

  /**
   * Sync unread emails from Outlook inbox
   */
  syncEmails: protectedProcedure
    .input(
      z.object({
        accessToken: z.string().describe('Outlook API access token'),
        limit: z.number().int().positive().default(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailService = new OutlookEmailService(input.accessToken);
        const messages = await emailService.getUnreadMessages(input.limit);

        return {
          success: true,
          messagesCount: messages.length,
          messages: messages.map((msg) => ({
            id: msg.id,
            subject: msg.subject,
            from: msg.from.emailAddress.address,
            receivedDate: msg.receivedDateTime,
            hasAttachments: msg.hasAttachments,
          })),
        };
      } catch (error) {
        console.error('[Outlook Router] Failed to sync emails:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync emails from Outlook',
        });
      }
    }),

  /**
   * Detect bid opportunities from unread emails
   */
  detectOpportunities: protectedProcedure
    .input(
      z.object({
        accessToken: z.string().describe('Outlook API access token'),
        limit: z.number().int().positive().default(10),
        confidenceThreshold: z.number().min(0).max(100).default(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailService = new OutlookEmailService(input.accessToken);
        const messages = await emailService.getUnreadMessages(input.limit);

        // Analyze each message for bid opportunities
        const opportunities = messages
          .map((msg) => BidOpportunityDetector.analyzeEmail(msg))
          .filter((opp): opp is NonNullable<typeof opp> => opp !== null && opp.confidence >= input.confidenceThreshold);

        return {
          success: true,
          opportunitiesCount: opportunities.length,
          opportunities: opportunities.map((opp) => ({
            messageId: opp.messageId,
            subject: opp.subject,
            sender: opp.sender,
            receivedDate: opp.receivedDate.toISOString(),
            projectName: opp.projectName,
            location: opp.location,
            squareFootage: opp.squareFootage,
            dueDate: opp.dueDate?.toISOString(),
            confidence: Math.round(opp.confidence),
            bidKeywords: opp.bidKeywords,
          })),
        };
      } catch (error) {
        console.error('[Outlook Router] Failed to detect opportunities:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to detect bid opportunities',
        });
      }
    }),

  /**
   * Create a project from a detected bid opportunity
   */
  createProjectFromOpportunity: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        subject: z.string(),
        sender: z.string(),
        projectName: z.string().optional(),
        location: z.string().optional(),
        squareFootage: z.number().positive().optional(),
        dueDate: z.string().datetime().optional(),
        bidKeywords: z.array(z.string()),
        confidence: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error('Database not available');
        }

        // Create project record with unique external ID
        const externalId = `outlook-${input.messageId}-${Date.now()}`;
        await db.insert(projects).values({
          externalId,
          source: 'email',
          projectName: input.projectName || input.subject,
          location: input.location,
          squareFootage: input.squareFootage,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          jurisdiction: input.location ? extractJurisdiction(input.location) : undefined,
          contactName: input.sender,
          contactEmail: input.sender,
          scopeOfWork: `Detected from email: ${input.subject}\nConfidence: ${input.confidence}%\nKeywords: ${input.bidKeywords.join(', ')}`,
        });

        return {
          success: true,
          externalId,
          message: 'Project created from bid opportunity',
        };
      } catch (error) {
        console.error('[Outlook Router] Failed to create project:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create project from opportunity',
        });
      }
    }),

  /**
   * Mark email as read after processing
   */
  markEmailAsRead: protectedProcedure
    .input(
      z.object({
        accessToken: z.string(),
        messageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailService = new OutlookEmailService(input.accessToken);
        await emailService.markAsRead(input.messageId);

        return {
          success: true,
          message: 'Email marked as read',
        };
      } catch (error) {
        console.error('[Outlook Router] Failed to mark email as read:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark email as read',
        });
      }
    }),

  /**
   * Get attachment from email
   */
  getAttachments: protectedProcedure
    .input(
      z.object({
        accessToken: z.string(),
        messageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailService = new OutlookEmailService(input.accessToken);
        const attachments = await emailService.getMessageAttachments(input.messageId);

        return {
          success: true,
          attachments: attachments.map((att) => ({
            id: att.id,
            name: att.name,
            contentType: att.contentType,
            size: att.size,
            isInline: att.isInline,
          })),
        };
      } catch (error) {
        console.error('[Outlook Router] Failed to get attachments:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch attachments',
        });
      }
    }),

  /**
   * Download attachment content
   */
  downloadAttachment: protectedProcedure
    .input(
      z.object({
        accessToken: z.string(),
        messageId: z.string(),
        attachmentId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const emailService = new OutlookEmailService(input.accessToken);
        const content = await emailService.downloadAttachment(input.messageId, input.attachmentId);

        return {
          success: true,
          content: content.toString('base64'),
          message: 'Attachment downloaded',
        };
      } catch (error) {
        console.error('[Outlook Router] Failed to download attachment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to download attachment',
        });
      }
    }),
});

/**
 * Extract jurisdiction from location string
 */
function extractJurisdiction(location: string | undefined): string | undefined {
  if (!location) return undefined;

  // Look for state abbreviations (e.g., "Portland, OR" -> "OR")
  const stateMatch = location.match(/\b([A-Z]{2})\b/);
  if (stateMatch) {
    return stateMatch[1];
  }

  // Look for common state names
  const stateNames: Record<string, string> = {
    oregon: 'OR',
    washington: 'WA',
    california: 'CA',
    idaho: 'ID',
  };

  for (const [name, abbr] of Object.entries(stateNames)) {
    if (location.toLowerCase().includes(name)) {
      return abbr;
    }
  }

  return undefined;
}
