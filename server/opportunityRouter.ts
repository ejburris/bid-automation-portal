/**
 * Opportunity Detection Router
 * Unified tRPC router for detecting bid opportunities from all sources
 * (Email, BuildingConnected, PlanCenter NW, Procore)
 */

import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { scrapeBuildingConnectedOpportunities } from './scrapers/buildingConnectedScraper';
import { scrapePlanCenterOpportunities } from './scrapers/planCenterScraper';
import { fetchProcoreOpportunities } from './integrations/procoreIntegration';
import { getDb } from './db';
import { projects } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface DetectedOpportunity {
  id: string;
  title: string;
  location: string;
  bidDueDate: Date;
  estimatedValue?: number;
  description: string;
  projectType: string;
  source: 'email' | 'buildingconnected' | 'plancenter' | 'procore';
  url?: string;
  confidence: number; // 0-100 confidence score
  detectedAt: Date;
}

export const opportunityRouter = router({
  /**
   * Detect opportunities from BuildingConnected
   */
  detectFromBuildingConnected: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const email = process.env.BUILDINGCONNECTED_EMAIL;
      const password = process.env.BUILDINGCONNECTED_PASSWORD;

      if (!email || !password) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'BuildingConnected credentials not configured',
        });
      }

      const opportunities = await scrapeBuildingConnectedOpportunities(email, password);

      // Convert to DetectedOpportunity format
      const detected: DetectedOpportunity[] = opportunities.map((opp) => ({
        id: opp.id,
        title: opp.title,
        location: opp.location,
        bidDueDate: opp.bidDueDate,
        estimatedValue: opp.estimatedValue,
        description: opp.description,
        projectType: opp.projectType,
        source: 'buildingconnected',
        url: opp.url,
        confidence: 85, // BuildingConnected is highly reliable
        detectedAt: opp.scrapedAt,
      }));

      return {
        success: true,
        count: detected.length,
        opportunities: detected,
      };
    } catch (error) {
      console.error('[Opportunity Router] BuildingConnected detection failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to detect BuildingConnected opportunities',
      });
    }
  }),

  /**
   * Detect opportunities from PlanCenter NW
   */
  detectFromPlanCenter: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = process.env.PLANCENTER_USER_ID;
      const password = process.env.PLANCENTER_PASSWORD;

      if (!userId || !password) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'PlanCenter credentials not configured',
        });
      }

      const opportunities = await scrapePlanCenterOpportunities(userId, password);

      // Convert to DetectedOpportunity format
      const detected: DetectedOpportunity[] = opportunities.map((opp) => ({
        id: opp.id,
        title: opp.title,
        location: opp.location,
        bidDueDate: opp.bidDueDate,
        estimatedValue: opp.estimatedValue,
        description: opp.description,
        projectType: opp.projectType,
        source: 'plancenter',
        url: opp.url,
        confidence: 85, // PlanCenter is highly reliable
        detectedAt: opp.scrapedAt,
      }));

      return {
        success: true,
        count: detected.length,
        opportunities: detected,
      };
    } catch (error) {
      console.error('[Opportunity Router] PlanCenter detection failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to detect PlanCenter opportunities',
      });
    }
  }),

  /**
   * Detect opportunities from Procore
   */
  detectFromProcore: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const email = process.env.PROCORE_EMAIL;
      const password = process.env.PROCORE_PASSWORD;

      if (!email || !password) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Procore credentials not configured',
        });
      }

      const opportunities = await fetchProcoreOpportunities(email, password);

      // Convert to DetectedOpportunity format
      const detected: DetectedOpportunity[] = opportunities.map((opp) => ({
        id: opp.id,
        title: opp.title,
        location: opp.location,
        bidDueDate: opp.bidDueDate,
        estimatedValue: opp.estimatedValue,
        description: opp.description,
        projectType: opp.projectType,
        source: 'procore',
        url: opp.url,
        confidence: 90, // Procore API is very reliable
        detectedAt: opp.scrapedAt,
      }));

      return {
        success: true,
        count: detected.length,
        opportunities: detected,
      };
    } catch (error) {
      console.error('[Opportunity Router] Procore detection failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to detect Procore opportunities',
      });
    }
  }),

  /**
   * Detect all opportunities from all sources
   */
  detectAll: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const allOpportunities: DetectedOpportunity[] = [];
      const results: any[] = [];

      // Try each source
      try {
        const bcOpps = await scrapeBuildingConnectedOpportunities(
          process.env.BUILDINGCONNECTED_EMAIL || '',
          process.env.BUILDINGCONNECTED_PASSWORD || ''
        );
        allOpportunities.push(
          ...bcOpps.map((opp) => ({
            id: opp.id,
            title: opp.title,
            location: opp.location,
            bidDueDate: opp.bidDueDate,
            estimatedValue: opp.estimatedValue,
            description: opp.description,
            projectType: opp.projectType,
            source: 'buildingconnected' as const,
            url: opp.url,
            confidence: 85,
            detectedAt: opp.scrapedAt,
          }))
        );
        results.push({ source: 'buildingconnected', count: bcOpps.length, success: true });
      } catch (error) {
        console.warn('[Opportunity Router] BuildingConnected failed:', error);
        results.push({ source: 'buildingconnected', success: false, error: String(error) });
      }

      try {
        const pcOpps = await scrapePlanCenterOpportunities(
          process.env.PLANCENTER_USER_ID || '',
          process.env.PLANCENTER_PASSWORD || ''
        );
        allOpportunities.push(
          ...pcOpps.map((opp) => ({
            id: opp.id,
            title: opp.title,
            location: opp.location,
            bidDueDate: opp.bidDueDate,
            estimatedValue: opp.estimatedValue,
            description: opp.description,
            projectType: opp.projectType,
            source: 'plancenter' as const,
            url: opp.url,
            confidence: 85,
            detectedAt: opp.scrapedAt,
          }))
        );
        results.push({ source: 'plancenter', count: pcOpps.length, success: true });
      } catch (error) {
        console.warn('[Opportunity Router] PlanCenter failed:', error);
        results.push({ source: 'plancenter', success: false, error: String(error) });
      }

      try {
        const procoreOpps = await fetchProcoreOpportunities(
          process.env.PROCORE_EMAIL || '',
          process.env.PROCORE_PASSWORD || ''
        );
        allOpportunities.push(
          ...procoreOpps.map((opp) => ({
            id: opp.id,
            title: opp.title,
            location: opp.location,
            bidDueDate: opp.bidDueDate,
            estimatedValue: opp.estimatedValue,
            description: opp.description,
            projectType: opp.projectType,
            source: 'procore' as const,
            url: opp.url,
            confidence: 90,
            detectedAt: opp.scrapedAt,
          }))
        );
        results.push({ source: 'procore', count: procoreOpps.length, success: true });
      } catch (error) {
        console.warn('[Opportunity Router] Procore failed:', error);
        results.push({ source: 'procore', success: false, error: String(error) });
      }

      return {
        success: true,
        totalCount: allOpportunities.length,
        opportunities: allOpportunities,
        sources: results,
      };
    } catch (error) {
      console.error('[Opportunity Router] Multi-source detection failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to detect opportunities from all sources',
      });
    }
  }),

  /**
   * Get detected opportunities
   */
  getDetected: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        return [];
      }

      // In production, query the database for detected opportunities
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('[Opportunity Router] Failed to get detected opportunities:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get detected opportunities',
      });
    }
  }),

  /**
   * Create project from detected opportunity
   */
  createProjectFromOpportunity: protectedProcedure
    .input(
      z.object({
        opportunityId: z.string(),
        title: z.string(),
        location: z.string(),
        bidDueDate: z.date(),
        estimatedValue: z.number().optional(),
        description: z.string().optional(),
        source: z.enum(['email', 'buildingconnected', 'plancenter', 'procore']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error('Database not available');
        }

        // Check if project already exists
        const existing = await db
          .select()
          .from(projects)
          .where(eq(projects.externalId, input.opportunityId))
          .limit(1);

        if (existing && existing.length > 0) {
          return {
            success: false,
            message: 'Project already exists for this opportunity',
            projectId: existing[0].id,
          };
        }

        // Create new project
        const result = await db.insert(projects).values({
          externalId: input.opportunityId,
          source: input.source,
          projectName: input.title,
          location: input.location,
          dueDate: input.bidDueDate,
          scopeOfWork: input.description,
        });

        return {
          success: true,
          message: 'Project created from opportunity',
          projectId: result[0]?.insertId,
        };
      } catch (error) {
        console.error('[Opportunity Router] Failed to create project:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create project from opportunity',
        });
      }
    }),
});
