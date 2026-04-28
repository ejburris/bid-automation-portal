export type BidRecordLike = {
  id: number;
  projectId?: number | null;
  projectName?: string | null;
  projectAddress?: string | null;
  bidAmount?: number | null;
  status: string;
  isPrivateWage?: number | boolean | null;
  sentAt?: Date | string | null;
  submittedAt?: Date | string | null;
  awardedAt?: Date | string | null;
  followUpAt?: Date | string | null;
  followUpDueAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export type BidPipelineSummary = {
  total: number;
  draft: number;
  sent: number;
  followUp: number;
  awarded: number;
  lost: number;
  active: number;
  totalValueCents: number;
  draftValueCents: number;
  sentValueCents: number;
  followUpValueCents: number;
  awardedValueCents: number;
  averageBidCents: number;
  winRate: number;
  recentCount: number;
  followUpDueCount: number;
};

export type DashboardActionState = {
  key: string;
  title: string;
  count: number;
  valueCents: number;
  tone: 'critical' | 'attention' | 'healthy' | 'neutral';
  description: string;
};

export type DashboardOverview = {
  summary: BidPipelineSummary;
  actionStates: DashboardActionState[];
};

const toMillis = (value: Date | string | null | undefined) => {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
};

export function summarizeBids<T extends BidRecordLike>(bids: T[]): BidPipelineSummary {
  const now = Date.now();
  const summary: BidPipelineSummary = {
    total: bids.length,
    draft: 0,
    sent: 0,
    followUp: 0,
    awarded: 0,
    lost: 0,
    active: 0,
    totalValueCents: 0,
    draftValueCents: 0,
    sentValueCents: 0,
    followUpValueCents: 0,
    awardedValueCents: 0,
    averageBidCents: 0,
    winRate: 0,
    recentCount: 0,
    followUpDueCount: 0,
  };

  for (const bid of bids) {
    const amount = bid.bidAmount ?? 0;
    summary.totalValueCents += amount;

    switch (bid.status) {
      case 'draft':
        summary.draft += 1;
        summary.draftValueCents += amount;
        break;
      case 'sent':
        summary.sent += 1;
        summary.sentValueCents += amount;
        break;
      case 'follow_up':
        summary.followUp += 1;
        summary.followUpValueCents += amount;
        break;
      case 'awarded':
        summary.awarded += 1;
        summary.awardedValueCents += amount;
        break;
      case 'lost':
        summary.lost += 1;
        break;
    }

    if (bid.status === 'draft' || bid.status === 'sent' || bid.status === 'follow_up') {
      summary.active += 1;
    }

    const updatedAt = toMillis(bid.updatedAt ?? bid.createdAt);
    if (updatedAt && now - updatedAt <= 1000 * 60 * 60 * 24 * 14) {
      summary.recentCount += 1;
    }

    const followUpDueAt = toMillis(bid.followUpAt ?? bid.followUpDueAt);
    if (followUpDueAt && followUpDueAt <= now && (bid.status === 'sent' || bid.status === 'follow_up')) {
      summary.followUpDueCount += 1;
    }
  }

  summary.averageBidCents = summary.total > 0 ? Math.round(summary.totalValueCents / summary.total) : 0;
  const decided = summary.awarded + summary.lost;
  summary.winRate = decided > 0 ? Number(((summary.awarded / decided) * 100).toFixed(1)) : 0;

  return summary;
}

export function buildDashboardOverview<T extends BidRecordLike>(bids: T[]): DashboardOverview {
  const summary = summarizeBids(bids);

  const actionStates: DashboardActionState[] = [
    {
      key: 'followups_due',
      title: 'Follow-Ups Due',
      count: summary.followUpDueCount,
      valueCents: summary.sentValueCents + summary.followUpValueCents,
      tone: summary.followUpDueCount > 0 ? 'critical' : 'healthy',
      description: summary.followUpDueCount > 0
        ? 'Sent bids need follow-up attention now.'
        : 'No overdue follow-up actions right now.',
    },
    {
      key: 'drafts_to_finish',
      title: 'Drafts to Finish',
      count: summary.draft,
      valueCents: summary.draftValueCents,
      tone: summary.draft > 0 ? 'attention' : 'healthy',
      description: summary.draft > 0
        ? 'Draft bids are sitting in the queue and need review or submission.'
        : 'No unfinished drafts are blocking the pipeline.',
    },
    {
      key: 'sent_waiting',
      title: 'Sent Waiting',
      count: summary.sent,
      valueCents: summary.sentValueCents,
      tone: summary.sent > 0 ? 'neutral' : 'healthy',
      description: summary.sent > 0
        ? 'Live bids are out and need tracking until award or loss.'
        : 'No live sent bids are waiting right now.',
    },
    {
      key: 'awarded_value',
      title: 'Awarded Value',
      count: summary.awarded,
      valueCents: summary.awardedValueCents,
      tone: summary.awarded > 0 ? 'healthy' : 'neutral',
      description: summary.awarded > 0
        ? 'Won work is flowing through the system.'
        : 'No awarded bids yet in the current data set.',
    },
  ];

  return { summary, actionStates };
}
