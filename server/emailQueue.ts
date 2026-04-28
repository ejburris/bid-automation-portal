/**
 * Email queue system for scheduling and retrying emails
 * Handles follow-ups, retries, and scheduled sends
 */

import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { emailQueue as emailQueueTable } from '../drizzle/schema';
import { EmailOptions } from './emailService';
import { COMPANY_SIGNATURE } from '../shared/companyIdentity';

export type EmailQueueStatus = 'pending' | 'sent' | 'failed' | 'scheduled';

export interface QueuedEmail {
  id?: number;
  to: string;
  subject: string;
  body: string;
  status: EmailQueueStatus;
  scheduledFor?: Date;
  sentAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  bidId?: number;
  projectId?: number;
  emailType: string; // 'proposal', 'followup', 'addendum', 'changeorder', 'award_notification'
  attachmentPath?: string;
}

/**
 * Add email to queue for sending
 */
export async function queueEmail(email: Omit<QueuedEmail, 'id'>): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const result = await db.insert(emailQueueTable).values({
    to: email.to,
    subject: email.subject,
    body: email.body,
    status: email.status || 'pending',
    scheduledFor: email.scheduledFor,
    retryCount: email.retryCount || 0,
    maxRetries: email.maxRetries || 3,
    bidId: email.bidId,
    projectId: email.projectId,
    emailType: email.emailType,
    attachmentPath: email.attachmentPath,
  });

  return result[0]?.insertId || 0;
}

/**
 * Get pending emails to send
 */
export async function getPendingEmails(): Promise<QueuedEmail[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const now = new Date();
  const emails = await db
    .select()
    .from(emailQueueTable)
    .where((t) => {
      const conditions = [eq(t.status, 'pending')];
      // Include scheduled emails that are ready to send
      return conditions[0];
    });

  return emails.map((e) => ({
    id: e.id,
    to: e.to,
    subject: e.subject,
    body: e.body,
    status: e.status as EmailQueueStatus,
    scheduledFor: e.scheduledFor || undefined,
    sentAt: e.sentAt || undefined,
    failureReason: e.failureReason || undefined,
    retryCount: e.retryCount,
    maxRetries: e.maxRetries,
    bidId: e.bidId || undefined,
    projectId: e.projectId || undefined,
    emailType: e.emailType,
    attachmentPath: e.attachmentPath || undefined,
  }));
}

/**
 * Mark email as sent
 */
export async function markEmailAsSent(emailId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  await db
    .update(emailQueueTable)
    .set({
      status: 'sent',
      sentAt: new Date(),
    })
    .where(eq(emailQueueTable.id, emailId));
}

/**
 * Mark email as failed and increment retry count
 */
export async function markEmailAsFailed(emailId: number, reason: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    return;
  }

  const email = await db.select().from(emailQueueTable).where(eq(emailQueueTable.id, emailId)).limit(1);

  if (email.length === 0) {
    return;
  }

  const currentRetry = email[0].retryCount + 1;
  const newStatus = currentRetry >= email[0].maxRetries ? 'failed' : 'pending';

  await db
    .update(emailQueueTable)
    .set({
      status: newStatus,
      failureReason: reason,
      retryCount: currentRetry,
    })
    .where(eq(emailQueueTable.id, emailId));
}

/**
 * Schedule email for later sending
 */
export async function scheduleEmail(email: Omit<QueuedEmail, 'id'>, delayMs: number): Promise<number> {
  const scheduledFor = new Date(Date.now() + delayMs);
  return queueEmail({
    ...email,
    status: 'scheduled',
    scheduledFor,
  });
}

/**
 * Schedule follow-up email (1 month or 3 weeks after proposal)
 */
export async function scheduleFollowUpEmail(
  bidId: number,
  projectId: number,
  to: string,
  projectName: string,
  daysDelay: number,
  emailType: 'one_month_followup' | 'three_week_followup',
): Promise<number> {
  const delayMs = daysDelay * 24 * 60 * 60 * 1000;
  const subject = `Follow-up: Final Construction Cleaning Bid for ${projectName}`;
  const body =
    emailType === 'one_month_followup'
      ? `Good morning,\n\nI hope that you are doing well. I was just doing a follow up to see if Clean World Maintenance had been awarded the Final Construction cleaning for ${projectName}. Hope to talk to you soon.\n\nSincerely,\n\nEric Burris | Senior Estimator\n${COMPANY_SIGNATURE}`
      : `Good morning,\n\nI hope that you are doing well. I was just doing another follow up to see if Clean World Maintenance had been awarded the Final Construction cleaning for ${projectName}. We would love to work with you on this project. Please let me know if you have any questions or need any additional information.\n\nSincerely,\n\nEric Burris | Senior Estimator\n${COMPANY_SIGNATURE}`;

  return scheduleEmail(
    {
      to,
      subject,
      body,
      status: 'scheduled',
      retryCount: 0,
      maxRetries: 3,
      bidId,
      projectId,
      emailType,
    },
    delayMs,
  );
}
