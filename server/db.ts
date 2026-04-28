import { eq, and, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import fs from "node:fs/promises";
import path from "node:path";
import { InsertUser, users, bids, projects, clients, bidParameters, prevailingWageRates, addendums, followUpSchedules, integrationStatus, bidFiles } from "../drizzle/schema";
import { ENV } from './_core/env';
import type { ParsedBidParameters, ParsedPrevailingWageRate } from './excelParser';
import { getFirstMondayAfterDays, calculateEscalationDate } from '@shared/dateUtils';

type LocalProjectRecord = typeof projects.$inferSelect;
type LocalBidRecord = typeof bids.$inferSelect;
type LocalClientRecord = typeof clients.$inferSelect;
type LocalBidFileRecord = typeof bidFiles.$inferSelect;
export type BidTrackingStatus = "draft" | "sent" | "follow_up" | "awarded" | "lost";

const localStore = {
  nextProjectId: 1,
  nextBidId: 1,
  nextClientId: 1,
  nextBidFileId: 1,
  projects: [] as LocalProjectRecord[],
  bids: [] as LocalBidRecord[],
  clients: [] as LocalClientRecord[],
  bidFiles: [] as LocalBidFileRecord[],
};

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

function nowTimestamp() {
  return new Date();
}

function createLocalProject(input: {
  projectName: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  location?: string;
  squareFootage?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}): LocalProjectRecord {
  const now = nowTimestamp();
  const project: LocalProjectRecord = {
    id: localStore.nextProjectId++,
    projectName: input.projectName,
    address: input.address || null,
    city: input.city || null,
    state: input.state || null,
    notes: input.notes || null,
    externalId: `local-project-${Date.now()}-${localStore.nextProjectId}`,
    source: "email",
    location: input.location || null,
    squareFootage: input.squareFootage ?? null,
    dueDate: null,
    requiresPrevailingWage: 0,
    wageEffectiveDate: null,
    jurisdiction: null,
    contactName: input.contactName || null,
    contactEmail: input.contactEmail || null,
    contactPhone: input.contactPhone || null,
    scopeOfWork: null,
    documentUrls: null,
    createdAt: now,
    updatedAt: now,
  };
  localStore.projects.push(project);
  return project;
}

function createLocalBidRecord(values: Omit<LocalBidRecord, "id" | "createdAt" | "updatedAt">): LocalBidRecord {
  const now = nowTimestamp();
  const bid: LocalBidRecord = {
    ...values,
    id: localStore.nextBidId++,
    createdAt: now,
    updatedAt: now,
  };
  localStore.bids.push(bid);
  return bid;
}

const TRACKING_STATUSES = new Set<BidTrackingStatus>(["draft", "sent", "follow_up", "awarded", "lost"]);

function normalizeBidStatus(status: string | null | undefined): BidTrackingStatus {
  if (status === "submitted" || status === "approved") return "sent";
  if (status === "withdrawn") return "lost";
  return TRACKING_STATUSES.has(status as BidTrackingStatus) ? status as BidTrackingStatus : "draft";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function applyFollowUpStatus<T extends LocalBidRecord>(bid: T): T {
  const normalizedStatus = normalizeBidStatus(bid.status);
  const followUpAt = bid.followUpAt ?? bid.followUpDueAt;
  const due = followUpAt ? new Date(followUpAt).getTime() : 0;
  const status = normalizedStatus === "sent" && due > 0 && due < Date.now() ? "follow_up" : normalizedStatus;
  return {
    ...bid,
    status,
    sentAt: bid.sentAt ?? bid.submittedAt,
    followUpAt,
  };
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "bids");

function sanitizeFileName(value: string) {
  const fallback = "project-file";
  const sanitized = value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return sanitized || fallback;
}

function decodeBase64File(dataBase64: string) {
  const [, payload = dataBase64] = dataBase64.match(/^data:[^;]+;base64,(.*)$/) ?? [];
  return Buffer.from(payload, "base64");
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

/**
 * Bid-related queries
 */
export async function getBidsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return localStore.bids.filter((bid) => bid.userId === userId).map(applyFollowUpStatus);
  const result = await db.select().from(bids).where(eq(bids.userId, userId));
  const normalized = result.map(applyFollowUpStatus);
  const overdue = normalized.filter((bid) => bid.status === "follow_up" && normalizeBidStatus(result.find((item) => item.id === bid.id)?.status) === "sent");
  await Promise.all(overdue.map((bid) => db.update(bids).set({ status: "follow_up" }).where(eq(bids.id, bid.id))));
  return normalized;
}

export async function getBidWithProject(bidId: number) {
  const db = await getDb();
  if (!db) {
    const bid = localStore.bids.find((item) => item.id === bidId);
    return bid ? applyFollowUpStatus(bid) : null;
  }
  const result = await db.select().from(bids).where(eq(bids.id, bidId)).limit(1);
  if (result.length === 0) return null;
  const bid = applyFollowUpStatus(result[0]);
  if (bid.status === "follow_up" && normalizeBidStatus(result[0].status) === "sent") {
    await db.update(bids).set({ status: "follow_up" }).where(eq(bids.id, bid.id));
  }
  return bid;
}

export async function markBidSent(bidId: number, userId: number) {
  const sentAt = new Date();
  const followUpDate = getFirstMondayAfterDays(sentAt, 30);
  const escalationDate = calculateEscalationDate(sentAt);
  const db = await getDb();
  if (!db) {
    const index = localStore.bids.findIndex((bid) => bid.id === bidId && bid.userId === userId);
    if (index === -1) throw new Error("Bid not found");
    localStore.bids[index] = {
      ...localStore.bids[index],
      status: "sent",
      sentAt,
      followUpDate,
      followUpStatus: "pending",
      escalationDate,
      submittedAt: sentAt,
      updatedAt: sentAt,
    };
    return applyFollowUpStatus(localStore.bids[index]);
  }
  await db.update(bids).set({
    status: "sent",
    sentAt,
    followUpDate,
    followUpStatus: "pending",
    escalationDate,
    submittedAt: sentAt,
  }).where(and(eq(bids.id, bidId), eq(bids.userId, userId)));
  return getBidWithProject(bidId);
}

export async function updateBidStatus(bidId: number, userId: number, status: BidTrackingStatus) {
  const now = new Date();
  const updates = status === "awarded" ? { status, awardedAt: now } : { status };
  const db = await getDb();
  if (!db) {
    const index = localStore.bids.findIndex((bid) => bid.id === bidId && bid.userId === userId);
    if (index === -1) throw new Error("Bid not found");
    localStore.bids[index] = {
      ...localStore.bids[index],
      ...updates,
      updatedAt: now,
    };
    return applyFollowUpStatus(localStore.bids[index]);
  }
  await db.update(bids).set(updates).where(and(eq(bids.id, bidId), eq(bids.userId, userId)));
  return getBidWithProject(bidId);
}

export async function updateBidNotes(bidId: number, userId: number, notes: string) {
  const normalized = notes.trim() || null;
  const db = await getDb();
  if (!db) {
    const index = localStore.bids.findIndex((bid) => bid.id === bidId && bid.userId === userId);
    if (index === -1) throw new Error("Bid not found");
    localStore.bids[index] = {
      ...localStore.bids[index],
      notes: normalized,
      updatedAt: new Date(),
    };
    return applyFollowUpStatus(localStore.bids[index]);
  }
  await db.update(bids).set({ notes: normalized }).where(and(eq(bids.id, bidId), eq(bids.userId, userId)));
  return getBidWithProject(bidId);
}

export async function updateBidFollowUpStatus(bidId: number, userId: number, followUpStatus: "pending" | "completed" | "overdue") {
  const db = await getDb();
  if (!db) {
    const index = localStore.bids.findIndex((bid) => bid.id === bidId && bid.userId === userId);
    if (index === -1) throw new Error("Bid not found");
    localStore.bids[index] = {
      ...localStore.bids[index],
      followUpStatus,
      updatedAt: new Date(),
    };
    return applyFollowUpStatus(localStore.bids[index]);
  }
  await db.update(bids).set({ followUpStatus }).where(and(eq(bids.id, bidId), eq(bids.userId, userId)));
  return getBidWithProject(bidId);
}

export async function recordBidFollowUp(bidId: number, userId: number) {
  const now = new Date();
  const followUpAt = addDays(now, 15);
  const updates = {
    status: "follow_up" as const,
    lastFollowUpAt: now,
    followUpAt,
    followUpDueAt: followUpAt,
  };
  const db = await getDb();
  if (!db) {
    const index = localStore.bids.findIndex((bid) => bid.id === bidId && bid.userId === userId);
    if (index === -1) throw new Error("Bid not found");
    localStore.bids[index] = {
      ...localStore.bids[index],
      ...updates,
      updatedAt: now,
    };
    return applyFollowUpStatus(localStore.bids[index]);
  }
  await db.update(bids).set(updates).where(and(eq(bids.id, bidId), eq(bids.userId, userId)));
  return getBidWithProject(bidId);
}

export async function getBidFiles(bidId: number, userId: number) {
  const bid = await getBidWithProject(bidId);
  if (!bid || bid.userId !== userId) throw new Error("Bid not found");

  const db = await getDb();
  if (!db) return localStore.bidFiles.filter((file) => file.bidId === bidId && file.userId === userId);
  return db.select().from(bidFiles).where(and(eq(bidFiles.bidId, bidId), eq(bidFiles.userId, userId)));
}

export async function saveBidFile(input: {
  bidId: number;
  userId: number;
  originalName: string;
  mimeType?: string | null;
  dataBase64: string;
}) {
  const bid = await getBidWithProject(input.bidId);
  if (!bid || bid.userId !== input.userId) throw new Error("Bid not found");

  const fileBuffer = decodeBase64File(input.dataBase64);
  const safeOriginalName = sanitizeFileName(input.originalName);
  const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeOriginalName}`;
  const bidDir = path.join(UPLOAD_ROOT, String(input.bidId));
  await fs.mkdir(bidDir, { recursive: true });
  const storagePath = path.join(bidDir, storedName);
  await fs.writeFile(storagePath, fileBuffer);

  const values = {
    bidId: input.bidId,
    userId: input.userId,
    originalName: input.originalName,
    storedName,
    mimeType: input.mimeType || null,
    sizeBytes: fileBuffer.byteLength,
    storagePath,
  };

  const db = await getDb();
  if (!db) {
    const record: LocalBidFileRecord = {
      ...values,
      id: localStore.nextBidFileId++,
      createdAt: new Date(),
    };
    localStore.bidFiles.push(record);
    return record;
  }

  await db.insert(bidFiles).values(values);
  const files = await getBidFiles(input.bidId, input.userId);
  return files.at(-1);
}

/**
 * Project-related queries
 */
export async function getProjectsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return localStore.projects;
  return db.select().from(projects);
}

export async function getProjectByExternalId(externalId: string) {
  const db = await getDb();
  if (!db) return localStore.projects.find((project) => project.externalId === externalId) ?? null;
  const result = await db.select().from(projects).where(eq(projects.externalId, externalId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Client directory queries
 */
export async function getClientsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return localStore.clients.filter((client) => client.userId === userId);
  return db.select().from(clients).where(eq(clients.userId, userId));
}

async function upsertClientDirectoryRecord(
  userId: number,
  input: {
    clientCompany?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    clientOfficePhone?: string;
    clientAddress?: string;
    clientCity?: string;
    clientState?: string;
    clientNotes?: string;
  },
) {
  const clientCompany = input.clientCompany?.trim();
  if (!clientCompany) return;

  const values = {
    userId,
    clientCompany,
    contactName: normalizeOptionalText(input.contactName),
    phone: normalizeOptionalText(input.phone),
    email: normalizeOptionalText(input.email),
    officePhone: normalizeOptionalText(input.clientOfficePhone),
    address: normalizeOptionalText(input.clientAddress),
    city: normalizeOptionalText(input.clientCity),
    state: normalizeOptionalText(input.clientState)?.toUpperCase() ?? null,
    notes: normalizeOptionalText(input.clientNotes),
  };

  const db = await getDb();
  if (!db) {
    const existing = localStore.clients.find(
      (client) => client.userId === userId && client.clientCompany.toLowerCase() === clientCompany.toLowerCase(),
    );
    const now = nowTimestamp();
    if (existing) {
      Object.assign(existing, values, { updatedAt: now });
      return;
    }
    localStore.clients.push({
      ...values,
      id: localStore.nextClientId++,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await ensureUserRow(userId);
  const existing = await db.select().from(clients)
    .where(and(eq(clients.userId, userId), eq(clients.clientCompany, clientCompany)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(clients).set(values).where(eq(clients.id, existing[0].id));
    return;
  }

  await db.insert(clients).values(values);
}

function getInsertId(result: unknown): number {
  const direct = (result as { insertId?: number })?.insertId;
  if (typeof direct === "number") return direct;

  const first = Array.isArray(result) ? result[0] : undefined;
  const nested = (first as { insertId?: number })?.insertId;
  return typeof nested === "number" ? nested : 0;
}

async function ensureUserRow(userId: number) {
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing.length > 0) return;

  const now = new Date();
  await db.insert(users).values({
    id: userId,
    openId: userId === 1 ? "local-dev-user" : `generated-user-${userId}`,
    name: userId === 1 ? "Local Dev User" : null,
    email: userId === 1 ? "local-dev@example.com" : null,
    loginMethod: userId === 1 ? "local-dev" : null,
    role: userId === 1 ? "admin" : "user",
    lastSignedIn: now,
  }).onDuplicateKeyUpdate({
    set: {
      lastSignedIn: now,
    },
  });
}

/**
 * Bid parameters queries
 */
export async function getBidParametersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    // Use raw SQL to handle schema mismatches between Drizzle schema and actual database
    const connection = (db as any).$client;
    
    const sql = `
      SELECT 
        id, userId, companyName, baseLocation, privateWageHourly, workDayHours,
        costPerSqftPrivate as waxingCostPerSqft,
        cleaningCostPerHour,
        windowWashingCostPerHour,
        waxingCostPerHour,
        travelCostPerMile, hotelCostPerNight, perDiem, additionalCostPercentage,
        createdAt, updatedAt
      FROM bidParameters
      WHERE userId = ?
      LIMIT 1
    `;
    
    const [rows] = await connection.promise().query(sql, [userId]);
    const result = rows as any[];
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get bid parameters:", error);
    return null;
  }
}

/**
 * Prevailing wage rate queries
 */
export async function getPrevailingWageRate(jurisdiction: string, state: string, date: Date) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(prevailingWageRates)
    .where(and(
      eq(prevailingWageRates.jurisdiction, jurisdiction),
      eq(prevailingWageRates.state, state),
      lte(prevailingWageRates.effectiveDate, date)
    ))
    .orderBy(desc(prevailingWageRates.effectiveDate))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Addendum queries
 */
export async function getAddendumsByBidId(bidId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(addendums).where(eq(addendums.bidId, bidId));
}

/**
 * Follow-up schedule queries
 */
export async function getFollowUpSchedulesByBidId(bidId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(followUpSchedules).where(eq(followUpSchedules.bidId, bidId));
}

/**
 * Integration status queries
 */
export async function getIntegrationStatusByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(integrationStatus).where(eq(integrationStatus.userId, userId));
}

/**
 * Upsert bid parameters from Excel import
 */
export async function upsertBidParameters(userId: number, params: ParsedBidParameters) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert bid parameters: database not available");
    return;
  }

  try {
    // Use raw SQL to handle schema mismatches
    // Get the raw connection from Drizzle
    const connection = (db as any).$client;
    
    const sql = `
      INSERT INTO bidParameters (
        userId, companyName, baseLocation, privateWageHourly, workDayHours,
        costPerSqftPrivate, cleaningCostPerHour, windowWashingCostPerHour,
        waxingCostPerHour, travelCostPerMile, hotelCostPerNight, perDiem,
        additionalCostPercentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        companyName = VALUES(companyName),
        baseLocation = VALUES(baseLocation),
        privateWageHourly = VALUES(privateWageHourly),
        workDayHours = VALUES(workDayHours),
        costPerSqftPrivate = VALUES(costPerSqftPrivate),
        cleaningCostPerHour = VALUES(cleaningCostPerHour),
        windowWashingCostPerHour = VALUES(windowWashingCostPerHour),
        waxingCostPerHour = VALUES(waxingCostPerHour),
        travelCostPerMile = VALUES(travelCostPerMile),
        hotelCostPerNight = VALUES(hotelCostPerNight),
        perDiem = VALUES(perDiem),
        additionalCostPercentage = VALUES(additionalCostPercentage),
        updatedAt = NOW()
    `;

    const values = [
      userId,
      params.companyName,
      params.baseLocation,
      params.privateWageHourly,
      params.workDayHours,
      params.waxingCostPerSqft || 0,
      params.cleaningCostPerHour || 0,
      params.windowWashingCostPerHour || 0,
      params.waxingCostPerHour || 0,
      params.travelCostPerMile,
      params.hotelCostPerNight,
      params.perDiem,
      params.additionalCostPercentage,
    ];

    await connection.promise().query(sql, values);
  } catch (error) {
    console.error("[Database] Failed to upsert bid parameters:", error);
    throw error;
  }
}

/**
 * Upsert prevailing wage rate from Excel import
 */
export async function upsertPrevailingWageRate(userId: number, wage: ParsedPrevailingWageRate) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert prevailing wage rate: database not available");
    return;
  }

  try {
    const totalRate = wage.wagePerHour + wage.fringePerHour;
    const values = {
      jurisdiction: wage.jurisdiction,
      state: wage.state,
      effectiveDate: wage.effectiveDate,
      wageRate: wage.wagePerHour,
      fringeRate: wage.fringePerHour,
      totalRate: totalRate,
      minimumBid: wage.minimumBid,
    };

    await db.insert(prevailingWageRates).values(values).onDuplicateKeyUpdate({
      set: values,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert prevailing wage rate:", error);
    throw error;
  }
}

/**
 * Create a new bid
 */
export async function createBid(
  input: {
    projectName: string;
    address?: string;
    city?: string;
    state?: string;
    projectAddress?: string;
    projectNotes?: string;
    proposalScopeNotes?: string;
    clientCompany?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    clientOfficePhone?: string;
    clientAddress?: string;
    clientCity?: string;
    clientState?: string;
    clientNotes?: string;
    addendaAcknowledged?: Array<string | { name: string; date?: string }>;
    projectSqft: number;
    crewDays: number;
    crewPeople?: number;
    travelDistance?: number;
    isPrivateWage: boolean;
    travelCost?: number;
    includeWaxing?: boolean;
    includeCarpet?: boolean;
    includeWindows?: boolean;
    waxingSqft?: number;
    carpetSqft?: number;
    windowCount?: number;
    floorCount?: number;
    aerialLiftEnabled?: boolean;
    aerialLiftCost?: number;
    pressureWashingEnabled?: boolean;
    pressureWashingCost?: number;
    userId: number;
    snapshot?: {
      crewPeople: number;
      base: { travelCost: number; travelDistance: number };
      services: {
        additionalCosts: number;
        aerialLiftCost: number;
        pressureWashingCost: number;
        needsAerialLift: boolean;
      };
      totals: { total: number };
    };
  },
  userId: number
) {
  const db = await getDb();

  try {
    // Store fractional values by multiplying by 10
    // 1.5 days becomes 15, 1.5 people becomes 15
    const crewDaysStored = Math.round(input.crewDays * 10);
    const crewPeopleStored = Math.round((input.snapshot?.crewPeople ?? input.crewPeople ?? 1) * 10);
    const address = input.address ?? input.projectAddress ?? "";
    const projectAddress = [address, input.city, input.state].filter(Boolean).join(", ");

    const bidValues = (projectId: number): Omit<LocalBidRecord, "id" | "createdAt" | "updatedAt"> => ({
      projectId,
      userId,
      projectName: input.projectName,
      projectAddress,
      clientCompany: input.clientCompany || null,
      contactName: input.contactName || null,
      phone: input.phone || null,
      email: input.email || null,
      clientOfficePhone: input.clientOfficePhone || null,
      clientAddress: input.clientAddress || null,
      clientCity: input.clientCity || null,
      clientState: input.clientState || null,
      clientNotes: input.clientNotes || null,
      addendaAcknowledged: input.addendaAcknowledged?.filter((item) =>
        typeof item === "string" ? item.trim() : item.name.trim(),
      ).length
        ? JSON.stringify(input.addendaAcknowledged.filter((item) =>
          typeof item === "string" ? item.trim() : item.name.trim(),
        ))
        : null,
      projectSqft: Math.round(input.projectSqft),
      crewDays: crewDaysStored,
      crewPeople: crewPeopleStored,
      isPrivateWage: input.isPrivateWage ? 1 : 0,
      travelDistance: Math.round(input.snapshot?.base.travelDistance ?? input.travelDistance ?? 0),
      travelCost: Math.round((input.snapshot?.base.travelCost ?? input.travelCost ?? 0) * 100),
      waxingSqft: Math.round(input.waxingSqft ?? 0),
      carpetSqft: Math.round(input.carpetSqft ?? 0),
      windowCount: Math.round(input.windowCount ?? 0),
      floorCount: Math.max(1, Math.round(input.floorCount ?? 1)),
      needsAerialLift: input.snapshot?.services.needsAerialLift ? 1 : 0,
      aerialLiftCost: Math.round((input.snapshot?.services.aerialLiftCost ?? input.aerialLiftCost ?? 0) * 100),
      pressureWashingCost: Math.round((input.snapshot?.services.pressureWashingCost ?? input.pressureWashingCost ?? 0) * 100),
      additionalCosts: Math.round((input.snapshot?.services.additionalCosts ?? 0) * 100),
      includeWaxing: input.includeWaxing ? 1 : 0,
      includeCarpet: input.includeCarpet ? 1 : 0,
      includeWindows: input.includeWindows ? 1 : 0,
      proposalScopeNotes: input.proposalScopeNotes ?? null,
      bidAmount: Math.round((input.snapshot?.totals.total ?? 0) * 100),
      status: "draft",
      sentAt: null,
      followUpAt: null,
      lastFollowUpAt: null,
      submittedAt: null,
      awardedAt: null,
      followUpDueAt: null,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      followUpStatus: "pending",
      escalationDate: null,
      notes: input.projectNotes || null,
    });

    if (!db) {
      await upsertClientDirectoryRecord(userId, input);
      const project = createLocalProject({
        projectName: input.projectName,
        address,
        city: input.city,
        state: input.state,
        notes: input.projectNotes,
        location: projectAddress,
        squareFootage: Math.round(input.projectSqft),
        contactName: input.contactName,
        contactEmail: input.email,
        contactPhone: input.phone,
      });
      const bid = createLocalBidRecord(bidValues(project.id));
      return { success: true, bidId: bid.id, projectId: project.id, storage: "local" as const };
    }

    await ensureUserRow(userId);
    await upsertClientDirectoryRecord(userId, input);

    const projectResult = await db.insert(projects).values({
      externalId: `bid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      source: "email",
      projectName: input.projectName,
      address: address || null,
      city: input.city || null,
      state: input.state || null,
      notes: input.projectNotes || null,
      location: projectAddress || null,
      squareFootage: Math.round(input.projectSqft),
      contactName: input.contactName || null,
      contactEmail: input.email || null,
      contactPhone: input.phone || null,
    });
    const projectId = getInsertId(projectResult);

    if (!projectId) {
      throw new Error("Failed to create project for bid");
    }

    const result = await db.insert(bids).values({
      ...bidValues(projectId),
    });

    return { success: true, bidId: getInsertId(result), projectId };
  } catch (error) {
    console.error("[Database] Failed to create bid:", error);
    throw error;
  }
}
