import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Bid tracking table - core entity for bid management
 */
export const bids = mysqlTable("bids", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull().references(() => users.id),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  projectAddress: varchar("projectAddress", { length: 255 }).notNull(),
  clientCompany: varchar("clientCompany", { length: 255 }),
  contactName: varchar("contactName", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  clientOfficePhone: varchar("clientOfficePhone", { length: 20 }),
  clientAddress: varchar("clientAddress", { length: 255 }),
  clientCity: varchar("clientCity", { length: 100 }),
  clientState: varchar("clientState", { length: 2 }),
  clientNotes: text("clientNotes"),
  addendaAcknowledged: text("addendaAcknowledged"),
  projectSqft: int("projectSqft"),
  crewDays: int("crewDays").notNull(), // stored as integer (multiply by 10 for decimals: 1.5 days = 15)
  crewPeople: int("crewPeople").notNull(), // stored as integer (multiply by 10 for decimals: 1.5 people = 15)
  isPrivateWage: int("isPrivateWage").default(1).notNull(), // boolean as int (1 = private, 0 = prevailing)
  travelDistance: int("travelDistance"), // in miles
  travelCost: int("travelCost"), // in cents
  // Service-specific pricing
  waxingSqft: int("waxingSqft"), // square footage to be waxed (partial area)
  carpetSqft: int("carpetSqft"), // square footage to be carpeted (partial area)
  windowCount: int("windowCount"), // total number of windows to clean
  floorCount: int("floorCount"), // number of floors (for aerial lift detection)
  needsAerialLift: int("needsAerialLift").default(0).notNull(), // boolean as int (1 = needs lift)
  aerialLiftCost: int("aerialLiftCost"), // in cents (surcharge for 2nd+ floors)
  pressureWashingCost: int("pressureWashingCost"), // in cents
  additionalCosts: int("additionalCosts"), // in cents (total of waxing, carpet, windows, aerial lift, pressure washing)
  includeWaxing: int("includeWaxing").default(0).notNull(), // boolean as int
  includeCarpet: int("includeCarpet").default(0).notNull(), // boolean as int
  includeWindows: int("includeWindows").default(0).notNull(), // boolean as int
  proposalScopeNotes: text("proposalScopeNotes"),
  bidAmount: int("bidAmount"), // in cents
  status: mysqlEnum("status", ["draft", "sent", "follow_up", "awarded", "lost"]).default("draft").notNull(),
  sentAt: timestamp("sentAt"),
  followUpAt: timestamp("followUpAt"),
  lastFollowUpAt: timestamp("lastFollowUpAt"),
  submittedAt: timestamp("submittedAt"),
  awardedAt: timestamp("awardedAt"),
  followUpDueAt: timestamp("followUpDueAt"),
  followUpDate: timestamp("followUpDate"),
  followUpStatus: mysqlEnum("followUpStatus", ["pending", "completed", "overdue"]).default("pending").notNull(),
  escalationDate: timestamp("escalationDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bid = typeof bids.$inferSelect;
export type InsertBid = typeof bids.$inferInsert;

export const bidFiles = mysqlTable("bidFiles", {
  id: int("id").autoincrement().primaryKey(),
  bidId: int("bidId").notNull().references(() => bids.id),
  userId: int("userId").notNull().references(() => users.id),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  storedName: varchar("storedName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  sizeBytes: int("sizeBytes").notNull(),
  storagePath: varchar("storagePath", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BidFile = typeof bidFiles.$inferSelect;
export type InsertBidFile = typeof bidFiles.$inferInsert;

/**
 * Projects table - first-class project record that owns one or more bids.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  notes: text("notes"),
  externalId: varchar("externalId", { length: 255 }).unique(),
  source: mysqlEnum("source", ["buildingconnected", "plancenter", "procore", "email"]),
  location: varchar("location", { length: 255 }),
  squareFootage: int("squareFootage"),
  dueDate: timestamp("dueDate"),
  requiresPrevailingWage: int("requiresPrevailingWage").default(0).notNull(),
  wageEffectiveDate: timestamp("wageEffectiveDate"),
  jurisdiction: varchar("jurisdiction", { length: 255 }),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  scopeOfWork: text("scopeOfWork"),
  documentUrls: text("documentUrls"), // JSON array as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Client directory - reusable client/contact records for bid creation.
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  clientCompany: varchar("clientCompany", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  officePhone: varchar("officePhone", { length: 20 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Bid parameters table - pricing logic and calculation parameters
 */
export const bidParameters = mysqlTable("bidParameters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id).unique(),
  companyName: varchar("companyName", { length: 255 }),
  baseLocation: varchar("baseLocation", { length: 255 }),
  privateWageHourly: int("privateWageHourly").notNull(), // in cents
  workDayHours: int("workDayHours").default(9).notNull(),
  waxingCostPerSqft: int("waxingCostPerSqft"), // in cents ($0.47/sqft)
  carpetCostPerSqft: int("carpetCostPerSqft"), // in cents ($0.13/sqft)
  windowBasePricePerWindow: int("windowBasePricePerWindow"), // in cents
  travelCostPerMile: int("travelCostPerMile"), // in cents
  hotelCostPerNight: int("hotelCostPerNight"), // in cents
  perDiem: int("perDiem"), // in cents
  additionalCostPercentage: int("additionalCostPercentage").default(6).notNull(), // 6% default
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BidParameter = typeof bidParameters.$inferSelect;
export type InsertBidParameter = typeof bidParameters.$inferInsert;

/**
 * Prevailing wage rates table - location and date-based wage rates
 */
export const prevailingWageRates = mysqlTable("prevailingWageRates", {
  id: int("id").autoincrement().primaryKey(),
  jurisdiction: varchar("jurisdiction", { length: 255 }).notNull(),
  county: varchar("county", { length: 255 }),
  state: varchar("state", { length: 2 }).notNull(),
  effectiveDate: timestamp("effectiveDate").notNull(),
  wageRate: int("wageRate").notNull(), // in cents
  fringeRate: int("fringeRate"), // in cents
  totalRate: int("totalRate").notNull(), // in cents (wage + fringe)
  minimumBid: int("minimumBid"), // in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PrevailingWageRate = typeof prevailingWageRates.$inferSelect;
export type InsertPrevailingWageRate = typeof prevailingWageRates.$inferInsert;

/**
 * Addendums table - tracking received addendums and their impact
 */
export const addendums = mysqlTable("addendums", {
  id: int("id").autoincrement().primaryKey(),
  bidId: int("bidId").notNull().references(() => bids.id),
  projectId: int("projectId").notNull().references(() => projects.id),
  addendumNumber: varchar("addendumNumber", { length: 50 }).notNull(),
  receivedAt: timestamp("receivedAt").notNull(),
  description: text("description"),
  impactAssessment: text("impactAssessment"), // AI-generated assessment
  quotAdjustmentNeeded: int("quotAdjustmentNeeded").notNull(), // boolean as int
  adjustmentAmount: int("adjustmentAmount"), // in cents
  acknowledgmentStatus: mysqlEnum("acknowledgmentStatus", ["pending", "acknowledged", "sent"]).default("pending").notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  documentUrls: text("documentUrls"), // JSON array as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Addendum = typeof addendums.$inferSelect;
export type InsertAddendum = typeof addendums.$inferInsert;

/**
 * Follow-up schedules table - automated follow-up reminders
 */
export const followUpSchedules = mysqlTable("followUpSchedules", {
  id: int("id").autoincrement().primaryKey(),
  bidId: int("bidId").notNull().references(() => bids.id),
  scheduleType: mysqlEnum("scheduleType", ["initial", "first_followup", "second_followup", "custom"]).notNull(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "failed", "cancelled"]).default("pending").notNull(),
  reminderMessage: text("reminderMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FollowUpSchedule = typeof followUpSchedules.$inferSelect;
export type InsertFollowUpSchedule = typeof followUpSchedules.$inferInsert;

/**
 * Integration status table - platform health monitoring
 */
export const integrationStatus = mysqlTable("integrationStatus", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  platform: mysqlEnum("platform", ["outlook", "buildingconnected", "plancenter", "procore"]).notNull(),
  isConnected: int("isConnected").default(0).notNull(), // boolean as int
  lastSyncAt: timestamp("lastSyncAt"),
  lastErrorMessage: text("lastErrorMessage"),
  connectionDetails: text("connectionDetails"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntegrationStatus = typeof integrationStatus.$inferSelect;
export type InsertIntegrationStatus = typeof integrationStatus.$inferInsert;

/**
 * Email queue table - tracks emails to be sent, sent, and failed
 */
export const emailQueue = mysqlTable('emailQueue', {
  id: int('id').autoincrement().primaryKey(),
  to: varchar('to', { length: 320 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: text('body').notNull(),
  status: mysqlEnum('status', ['pending', 'sent', 'failed', 'scheduled']).default('pending').notNull(),
  scheduledFor: timestamp('scheduledFor'),
  sentAt: timestamp('sentAt'),
  failureReason: text('failureReason'),
  retryCount: int('retryCount').default(0).notNull(),
  maxRetries: int('maxRetries').default(3).notNull(),
  bidId: int('bidId').references(() => bids.id),
  projectId: int('projectId').references(() => projects.id),
  emailType: varchar('emailType', { length: 50 }).notNull(),
  attachmentPath: varchar('attachmentPath', { length: 255 }),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type EmailQueue = typeof emailQueue.$inferSelect;
export type InsertEmailQueue = typeof emailQueue.$inferInsert;

/**
 * Contractors table - stores contractor information for bids
 */
export const contractors = mysqlTable("contractors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  notes: text("notes"),
  isDefault: int("isDefault").default(0).notNull(), // boolean as int (1 = default contractor)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contractor = typeof contractors.$inferSelect;
export type InsertContractor = typeof contractors.$inferInsert;
