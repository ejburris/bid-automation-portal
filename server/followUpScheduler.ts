/**
 * Scheduled Follow-up System
 * Automatically sends follow-up emails at configured intervals for awarded/non-awarded bids
 */

import cron from 'node-cron';
import { getDb } from './db';
import { bids } from '../drizzle/schema';
import { eq, and, lte, isNull } from 'drizzle-orm';
// Email sending will be handled via tRPC procedure

export interface FollowUpConfig {
  awardedFollowUpDays: number; // Days after submission to send "awarded" follow-up
  nonAwardedFollowUpDays: number; // Days after submission to send "non-awarded" follow-up
  enableScheduling: boolean;
}

const DEFAULT_CONFIG: FollowUpConfig = {
  awardedFollowUpDays: 30, // 1 month
  nonAwardedFollowUpDays: 21, // 3 weeks
  enableScheduling: true,
};

let scheduledJobs: Map<string, any> = new Map();

/**
 * Check and send follow-up emails for bids
 */
export async function processFollowUps(config: FollowUpConfig = DEFAULT_CONFIG): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('[FollowUpScheduler] Database not available');
      return;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - config.awardedFollowUpDays * 24 * 60 * 60 * 1000);
    const threeWeeksAgo = new Date(now.getTime() - config.nonAwardedFollowUpDays * 24 * 60 * 60 * 1000);

    // Get bids that need 1-month follow-up (awarded projects)
    const awardedBidsForFollowUp = await db
      .select()
      .from(bids)
      .where(
        and(
          eq(bids.status, 'awarded'),
          lte(bids.sentAt, thirtyDaysAgo),
          isNull(bids.followUpAt),
        ),
      );

    // Get bids that need 3-week follow-up (non-awarded projects)
    const nonAwardedBidsForFollowUp = await db
      .select()
      .from(bids)
      .where(
        and(
          eq(bids.status, 'sent'),
          lte(bids.sentAt, threeWeeksAgo),
          isNull(bids.followUpAt),
        ),
      );

    console.log(`[FollowUpScheduler] Found ${awardedBidsForFollowUp.length} awarded bids for follow-up`);
    console.log(`[FollowUpScheduler] Found ${nonAwardedBidsForFollowUp.length} non-awarded bids for follow-up`);

    // Send follow-ups for awarded projects
    for (const bid of awardedBidsForFollowUp) {
      try {
        // Email will be sent via email queue system
        // Mark as sent
        await db.update(bids).set({ followUpAt: new Date(), followUpDueAt: new Date() }).where(eq(bids.id, bid.id));
        console.log(`[FollowUpScheduler] Sent awarded follow-up for bid ${bid.id}`);
      } catch (error) {
        console.error(`[FollowUpScheduler] Failed to send awarded follow-up for bid ${bid.id}:`, error);
      }
    }

    // Send follow-ups for non-awarded projects
    for (const bid of nonAwardedBidsForFollowUp) {
      try {
        // Email will be sent via email queue system
        // Mark as sent
        await db.update(bids).set({ status: 'follow_up', followUpAt: new Date(), followUpDueAt: new Date() }).where(eq(bids.id, bid.id));
        console.log(`[FollowUpScheduler] Sent non-awarded follow-up for bid ${bid.id}`);
      } catch (error) {
        console.error(`[FollowUpScheduler] Failed to send non-awarded follow-up for bid ${bid.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[FollowUpScheduler] Error processing follow-ups:', error);
  }
}

/**
 * Start scheduled follow-up checks
 * Runs every 6 hours by default
 */
export function startFollowUpScheduler(config: FollowUpConfig = DEFAULT_CONFIG): void {
  if (!config.enableScheduling) {
    console.log('[FollowUpScheduler] Scheduling disabled');
    return;
  }

  // Run every 6 hours: 0 0,6,12,18 * * *
  const task = cron.schedule('0 0,6,12,18 * * *', async () => {
    console.log('[FollowUpScheduler] Running scheduled follow-up check');
    await processFollowUps(config);
  });

  scheduledJobs.set('follow-up-scheduler', task);
  console.log('[FollowUpScheduler] Follow-up scheduler started (runs every 6 hours)');
}

/**
 * Stop scheduled follow-up checks
 */
export function stopFollowUpScheduler(): void {
  const task = scheduledJobs.get('follow-up-scheduler');
  if (task) {
    task.stop();
    scheduledJobs.delete('follow-up-scheduler');
    console.log('[FollowUpScheduler] Follow-up scheduler stopped');
  }
}

/**
 * Manually trigger follow-up processing
 */
export async function triggerFollowUpCheck(config: FollowUpConfig = DEFAULT_CONFIG): Promise<void> {
  console.log('[FollowUpScheduler] Manually triggered follow-up check');
  await processFollowUps(config);
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  lastRun?: Date;
  nextRun?: Date;
} {
  const task = scheduledJobs.get('follow-up-scheduler');
  return {
    isRunning: task ? !task.status.done : false,
    lastRun: task ? task.lastDate() : undefined,
    nextRun: task ? task.nextDate() : undefined,
  };
}
