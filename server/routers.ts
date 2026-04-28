import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";
import { parseExcelFile, validateParameters } from "./excelParser";
import { parsePrevailingWageFile } from "./prevailingWageParser";
import { calculateAdvancedBidPrice, calculateTravelCosts, detectAerialLiftNeeded, estimateDistance, formatPrice } from "./advancedPricing";
import { scrapeAllPrevailingWages, scrapeOregonOnly, scrapeWashingtonOnly } from "./scrapers/prevailingWageScraper";
import { proposalRouter } from "./proposalRouter";
import { outlookRouter } from "./outlookRouter";
import { emailRouter } from "./emailRouter";
import { opportunityRouter } from "./opportunityRouter";
import { distanceRouter } from "./distanceRouter";
import { contractorsRouter } from "./contractorsRouter";
import { buildDashboardOverview, summarizeBids } from "./bidBackbone";
import { calculateLockedBidPricing } from "./lockedBidPricing";

export const appRouter = router({
  system: systemRouter,
  email: emailRouter,
  opportunities: opportunityRouter,
  distance: distanceRouter,
  contractors: contractorsRouter,
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

  bids: router({
    list: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return [];
      return db.getBidsByUserId(ctx.user.id);
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => {
        return db.getBidWithProject(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        projectName: z.string().trim().min(1, "Project name is required"),
        address: z.string().optional().default(""),
        city: z.string().optional().default(""),
        state: z.string().optional().default(""),
        projectNotes: z.string().optional().default(""),
        proposalScopeNotes: z.string().optional().default(""),
        clientCompany: z.string().optional().default(""),
        contactName: z.string().optional().default(""),
        phone: z.string().optional().default(""),
        email: z.string().optional().default(""),
        clientOfficePhone: z.string().optional().default(""),
        clientAddress: z.string().optional().default(""),
        clientCity: z.string().optional().default(""),
        clientState: z.string().optional().default(""),
        clientNotes: z.string().optional().default(""),
        addendaAcknowledged: z.array(z.union([
          z.string(),
          z.object({
            name: z.string(),
            date: z.string().optional().default(""),
          }),
        ])).optional().default([]),
        projectSqft: z.number(),
        crewDays: z.number(),
        crewPeople: z.number().optional().default(1),
        travelDistance: z.number().optional().default(0),
        isPrivateWage: z.boolean(),
        travelCost: z.number().optional().default(0),
        includeWaxing: z.boolean().optional().default(false),
        includeCarpet: z.boolean().optional().default(false),
        includeWindows: z.boolean().optional().default(false),
        waxingSqft: z.number().optional().default(0),
        carpetSqft: z.number().optional().default(0),
        windowCount: z.number().optional().default(0),
        floorCount: z.number().optional().default(1),
        aerialLiftEnabled: z.boolean().optional().default(false),
        aerialLiftCost: z.number().optional().default(0),
        pressureWashingEnabled: z.boolean().optional().default(false),
        pressureWashingCost: z.number().optional().default(0),
        exteriorWindows: z.boolean().optional().default(true),
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user || ctx.user.id !== input.userId) {
          throw new Error("Unauthorized");
        }
        const snapshot = calculateLockedBidPricing({
          projectSqft: input.projectSqft,
          sqft: input.projectSqft,
          crewDays: input.crewDays,
          crewPeople: input.crewPeople,
          wageType: input.isPrivateWage ? "private" : "prevailing",
          isPrivateWage: input.isPrivateWage,
          travelDistance: input.travelDistance,
          travelCostOverride: input.travelCost,
          waxSqft: input.waxingSqft,
          carpetSqft: input.carpetSqft,
          windowCount: input.windowCount,
          windowFloor: input.floorCount,
          floorCount: input.floorCount,
          exteriorWindows: input.exteriorWindows,
          useLift: input.aerialLiftEnabled,
          liftCost: input.aerialLiftCost,
          usePressure: input.pressureWashingEnabled,
          pressureCost: input.pressureWashingCost,
        });
        return db.createBid({ ...input, snapshot }, ctx.user.id);
      }),
    markSent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return db.markBidSent(input.id, ctx.user.id);
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "sent", "follow_up", "awarded", "lost"]),
      }))
      .mutation(({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return db.updateBidStatus(input.id, ctx.user.id, input.status);
      }),
    updateNotes: protectedProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string(),
      }))
      .mutation(({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return db.updateBidNotes(input.id, ctx.user.id, input.notes);
      }),
    updateFollowUpStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        followUpStatus: z.enum(["pending", "completed", "overdue"]),
      }))
      .mutation(({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return db.updateBidFollowUpStatus(input.id, ctx.user.id, input.followUpStatus);
      }),
    recordFollowUp: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return db.recordBidFollowUp(input.id, ctx.user.id);
      }),
    files: router({
      list: protectedProcedure
        .input(z.object({ bidId: z.number() }))
        .query(({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return db.getBidFiles(input.bidId, ctx.user.id);
        }),
      upload: protectedProcedure
        .input(z.object({
          bidId: z.number(),
          originalName: z.string().min(1),
          mimeType: z.string().optional().nullable(),
          dataBase64: z.string().min(1),
        }))
        .mutation(({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return db.saveBidFile({
            bidId: input.bidId,
            userId: ctx.user.id,
            originalName: input.originalName,
            mimeType: input.mimeType,
            dataBase64: input.dataBase64,
          });
        }),
    }),
  }),

  clients: router({
    list: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return [];
      return db.getClientsByUserId(ctx.user.id);
    }),
  }),

  projects: router({
    list: publicProcedure.query(() => {
      return db.getProjectsByUserId(0);
    }),
    getByExternalId: publicProcedure
      .input(z.object({ externalId: z.string() }))
      .query(({ input }) => {
        return db.getProjectByExternalId(input.externalId);
      }),
  }),

  parameters: router({
    getByUser: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      return db.getBidParametersByUserId(ctx.user.id);
    }),
    save: protectedProcedure
      .input(z.object({
        companyName: z.string(),
        baseLocation: z.string(),
        privateWageHourly: z.number().int(),
        workDayHours: z.number().int(),
        waxingCostPerSqft: z.number().int(),
        carpetCostPerSqft: z.number().int(),
        windowBasePricePerWindow: z.number().int(),
        travelCostPerMile: z.number().int(),
        hotelCostPerNight: z.number().int(),
        perDiem: z.number().int(),
        additionalCostPercentage: z.number().int(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error('Not authenticated');
        await db.upsertBidParameters(ctx.user.id, input as any);
        return { success: true };
      }),
  }),

  prevailingWages: router({
    getRate: publicProcedure
      .input(z.object({
        jurisdiction: z.string(),
        state: z.string(),
        date: z.date(),
      }))
      .query(({ input }) => {
        return db.getPrevailingWageRate(input.jurisdiction, input.state, input.date);
      }),
    saveMultiple: protectedProcedure
      .input(z.array(z.object({
        jurisdiction: z.string(),
        state: z.string(),
        effectiveDate: z.date(),
        wagePerHour: z.number().int(),
        fringePerHour: z.number().int(),
        minimumBid: z.number().int(),
      })))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error('Not authenticated');
        for (const wage of input) {
          await db.upsertPrevailingWageRate(ctx.user.id, {
            jurisdiction: wage.jurisdiction,
            state: wage.state,
            effectiveDate: wage.effectiveDate,
            wagePerHour: wage.wagePerHour,
            fringePerHour: wage.fringePerHour,
            minimumBid: wage.minimumBid,
          });
        }
        return { success: true, count: input.length };
      }),
  }),

  addendums: router({
    listByBid: publicProcedure
      .input(z.object({ bidId: z.number() }))
      .query(({ input }) => {
        return db.getAddendumsByBidId(input.bidId);
      }),
  }),

  followUps: router({
    listByBid: publicProcedure
      .input(z.object({ bidId: z.number() }))
      .query(({ input }) => {
        return db.getFollowUpSchedulesByBidId(input.bidId);
      }),
  }),



  dashboard: router({
    getOverview: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        return { bids: [], ...buildDashboardOverview([]), integrations: [] };
      }
      const bids = await db.getBidsByUserId(ctx.user.id);
      const integrations = await db.getIntegrationStatusByUser(ctx.user.id);
      return {
        bids,
        integrations,
        ...buildDashboardOverview(bids),
      };
    }),
  }),
  integrationStatus: router({
    getByUser: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return [];
      return db.getIntegrationStatusByUser(ctx.user.id);
    }),
  }),

  scrapers: router({
    scrapeAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error('User not authenticated');
        }
        return await scrapeAllPrevailingWages(ctx.user.id);
      }),

    scrapeOregon: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error('User not authenticated');
        }
        return await scrapeOregonOnly(ctx.user.id);
      }),

    scrapeWashington: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) {
          throw new Error('User not authenticated');
        }
        return await scrapeWashingtonOnly(ctx.user.id);
      }),
  }),

  proposals: proposalRouter,

  pricing: router({
    calculateLockedBid: protectedProcedure
      .input(z.object({
        sqft: z.number().optional(),
        projectSqft: z.number().optional(),
        crewDays: z.number().optional(),
        crewPeople: z.number().optional(),
        travelDistance: z.number().optional(),
        wageType: z.enum(["private", "prevailing"]).optional(),
        isPrivateWage: z.boolean().optional(),
        manualOverride: z.number().nullable().optional(),
        waxSqft: z.number().optional(),
        waxingSqft: z.number().optional(),
        carpetSqft: z.number().optional(),
        windowCount: z.number().optional(),
        windowFloor: z.number().optional(),
        floorCount: z.number().optional(),
        exteriorWindows: z.boolean().optional(),
        useLift: z.boolean().optional(),
        aerialLiftEnabled: z.boolean().optional(),
        liftCost: z.number().optional(),
        aerialLiftCost: z.number().optional(),
        usePressure: z.boolean().optional(),
        pressureWashingEnabled: z.boolean().optional(),
        pressureCost: z.number().optional(),
        pressureWashingCost: z.number().optional(),
      }))
      .query(({ input }) => {
        return calculateLockedBidPricing({
          sqft: input.sqft,
          projectSqft: input.projectSqft,
          crewDays: input.crewDays,
          crewPeople: input.crewPeople,
          travelDistance: input.travelDistance,
          wageType: input.wageType,
          isPrivateWage: input.isPrivateWage,
          manualOverride: input.manualOverride,
          waxSqft: input.waxSqft,
          waxingSqft: input.waxingSqft,
          carpetSqft: input.carpetSqft,
          windowCount: input.windowCount,
          windowFloor: input.windowFloor,
          floorCount: input.floorCount,
          exteriorWindows: input.exteriorWindows,
          useLift: input.useLift,
          aerialLiftEnabled: input.aerialLiftEnabled,
          liftCost: input.liftCost,
          aerialLiftCostOverride: input.aerialLiftCost,
          usePressure: input.usePressure,
          pressureWashingEnabled: input.pressureWashingEnabled,
          pressureCost: input.pressureCost,
          pressureWashingCost: input.pressureWashingCost,
        });
      }),

    calculateBid: publicProcedure
      .input(z.object({
        squareFootage: z.number().positive(),
        wageType: z.enum(["private", "prevailing"]),
        buildingStories: z.number().int().optional(),
        projectLocation: z.string().optional(),
        includeWindowWashing: z.boolean().optional(),
        includeWaxing: z.boolean().optional(),
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        const parameters = await db.getBidParametersByUserId(input.userId);
        if (!parameters) {
          throw new Error("Bid parameters not configured. Please import parameters first.");
        }

        let prevailingRate: any = undefined;
        if (input.wageType === "prevailing" && input.projectLocation) {
          const rate = await db.getPrevailingWageRate(
            input.projectLocation,
            "OR",
            new Date()
          );
          if (rate) {
            prevailingRate = rate;
          }
        }

        const pricing = calculateAdvancedBidPrice({
          squareFootage: input.squareFootage,
          wageType: input.wageType,
          buildingStories: input.buildingStories,
          projectLocation: input.projectLocation,
          includeWindowWashing: input.includeWindowWashing,
          includeWaxing: input.includeWaxing,
          parameters,
          prevailingRate,
        });

        return {
          ...pricing,
          formattedTotal: formatPrice(pricing.total),
          formattedSubtotal: formatPrice(pricing.subtotal),
          formattedCleaningCost: formatPrice(pricing.cleaningCost),
          formattedTravelCost: formatPrice(pricing.travelCost),
          formattedAerialLiftCost: formatPrice(pricing.aerialLiftCost),
        };
      }),

    assessTravel: publicProcedure
      .input(z.object({
        projectLocation: z.string(),
        workersCount: z.number().int().default(1),
      }))
      .query(({ input }) => {
        const distance = estimateDistance(input.projectLocation);
        const travelCosts = calculateTravelCosts(distance, input.workersCount);
        return travelCosts;
      }),

    assessAerialLift: publicProcedure
      .input(z.object({
        buildingStories: z.number().int(),
      }))
      .query(({ input }) => {
        return detectAerialLiftNeeded(input.buildingStories);
      }),
  }),

  outlook: outlookRouter,

  import: router({
    uploadPrivateWage: protectedProcedure
      .input(z.object({
        fileData: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }

        try {
          const fileBuffer = Buffer.from(input.fileData, "base64");
          const { parameters, prevailingWages, errors } = parseExcelFile(fileBuffer);

          if (errors.length > 0) {
            return {
              success: false,
              errors,
              parameters: null,
            };
          }

          const validationErrors = validateParameters(parameters);
          if (validationErrors.length > 0) {
            return {
              success: false,
              errors: validationErrors,
              parameters: null,
            };
          }

          return {
            success: true,
            errors: [],
            parameters,
          };
        } catch (error) {
          return {
            success: false,
            errors: [error instanceof Error ? error.message : "Unknown error"],
            parameters: null,
          };
        }
      }),

    uploadPrevailingWage: protectedProcedure
      .input(z.object({
        fileData: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }

        try {
          const fileBuffer = Buffer.from(input.fileData, "base64");
          const { rates, errors } = parsePrevailingWageFile(fileBuffer);

          if (errors.length > 0) {
            return {
              success: false,
              errors,
              rates: [],
            };
          }

          return {
            success: true,
            errors: [],
            rates,
          };
        } catch (error) {
          return {
            success: false,
            errors: [error instanceof Error ? error.message : "Unknown error"],
            rates: [],
          };
        }
      }),

    uploadExcel: protectedProcedure
      .input(z.object({
        fileBase64: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }

        try {
          const fileBuffer = Buffer.from(input.fileBase64, "base64");
          const { parameters, prevailingWages, errors } = parseExcelFile(fileBuffer);

          if (errors.length > 0) {
            return {
              success: false,
              errors,
              preview: null,
            };
          }

          const validationErrors = validateParameters(parameters);
          if (validationErrors.length > 0) {
            return {
              success: false,
              errors: validationErrors,
              preview: null,
            };
          }

          return {
            success: true,
            errors: [],
            preview: {
              parameters,
              prevailingWageCount: prevailingWages.length,
              fileName: input.fileName,
            },
          };
        } catch (error) {
          return {
            success: false,
            errors: [error instanceof Error ? error.message : "Unknown error"],
            preview: null,
          };
        }
      }),

    confirmImport: protectedProcedure
      .input(z.object({
        hasPrivateWage: z.boolean(),
        hasPrevailingWage: z.boolean(),
        parametersJson: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) {
          throw new Error("User not authenticated");
        }

        try {
          if (input.parametersJson && input.hasPrivateWage) {
            const parameters = JSON.parse(input.parametersJson);
            await db.upsertBidParameters(ctx.user.id, parameters);
          }

          return {
            success: true,
            message: "Parameters imported successfully",
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Import failed");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
