export type BidStatus = 'draft' | 'sent' | 'follow_up' | 'awarded' | 'lost';
export const BID_STATUSES: BidStatus[] = ['draft', 'sent', 'follow_up', 'awarded', 'lost'];

export type BidRow = {
  id: number;
  projectId?: number | null;
  projectName?: string | null;
  projectAddress?: string | null;
  bidAmount?: number | null;
  status: BidStatus | string;
  clientCompany?: string | null;
  contactName?: string | null;
  email?: string | null;
  isPrivateWage?: number | boolean | null;
  sentAt?: Date | string | null;
  submittedAt?: Date | string | null;
  awardedAt?: Date | string | null;
  followUpAt?: Date | string | null;
  lastFollowUpAt?: Date | string | null;
  followUpDueAt?: Date | string | null;
  followUpDate?: Date | string | null;
  followUpStatus?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type BidSummary = {
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

export type ActionTone = 'critical' | 'attention' | 'healthy' | 'neutral';

export type DashboardActionState = {
  key: string;
  title: string;
  count: number;
  valueCents: number;
  tone: ActionTone;
  description: string;
};

export const EMPTY_BID_SUMMARY: BidSummary = {
  total: 0,
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

export const EMPTY_ACTION_STATES: DashboardActionState[] = [];

export function formatBidCurrency(cents?: number | null) {
  const value = cents ?? 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
}

export function formatBidDate(date?: Date | string | null) {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString();
}

export function getBidStatusClasses(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    sent: 'bg-blue-100 text-blue-800 border-blue-200',
    follow_up: 'bg-orange-100 text-orange-800 border-orange-200',
    awarded: 'bg-green-100 text-green-800 border-green-200',
    lost: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] ?? colors.draft;
}

export function getBidStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    follow_up: 'Follow-Up',
    awarded: 'Awarded',
    lost: 'Lost',
  };
  return labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

export function getEffectiveSentDate(bid: BidRow) {
  return bid.sentAt ?? bid.submittedAt;
}

export function getEffectiveFollowUpDate(bid: BidRow) {
  return bid.followUpAt ?? bid.followUpDueAt;
}

export function isFollowUpDue(bid: BidRow) {
  const followUpAt = getEffectiveFollowUpDate(bid);
  if (!followUpAt) return false;
  const due = new Date(followUpAt).getTime();
  return !Number.isNaN(due) && due < Date.now() && (bid.status === 'sent' || bid.status === 'follow_up');
}

export function getFollowUpDaysOverdue(bid: BidRow) {
  const followUpAt = getEffectiveFollowUpDate(bid);
  if (!followUpAt) return 0;
  const due = new Date(followUpAt).getTime();
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.floor((Date.now() - due) / (1000 * 60 * 60 * 24)));
}

export function getActionToneClasses(tone: ActionTone) {
  const colors: Record<ActionTone, string> = {
    critical: 'border-red-200 bg-red-50 text-red-900',
    attention: 'border-amber-200 bg-amber-50 text-amber-900',
    healthy: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    neutral: 'border-blue-200 bg-blue-50 text-blue-900',
  };
  return colors[tone];
}

export function getWageTypeLabel(isPrivateWage?: number | boolean | null) {
  return isPrivateWage === 1 || isPrivateWage === true ? 'Private' : 'Prevailing';
}

export function matchesBidSearch(bid: BidRow, term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return [
    String(bid.id),
    String(bid.projectId ?? ''),
    bid.projectName ?? '',
    bid.projectAddress ?? '',
    bid.clientCompany ?? '',
    getWageTypeLabel(bid.isPrivateWage),
    bid.status,
  ].some(value => value.toLowerCase().includes(q));
}

export function generateFollowUpMessage(bid: BidRow): string {
  const projectName = bid.projectName || `Project #${bid.id}`;
  const clientName = bid.clientCompany ? ` for ${bid.clientCompany}` : '';

  // Check if followUpDate is overdue
  const isOverdue = bid.followUpDate ? new Date(bid.followUpDate) < new Date() : false;

  // Base message components
  let greeting = "I hope this email finds you well.";
  let body = "";
  let closing = "I look forward to hearing from you.";

  if (isOverdue) {
    // Overdue follow-up
    if (bid.status === "follow_up") {
      body = `I wanted to follow up on the proposal I sent${clientName} for ${projectName}. I understand you may be reviewing several options, and I wanted to check if you have any questions or need additional information.`;
    } else {
      body = `I wanted to touch base regarding the proposal I sent${clientName} for ${projectName}. I'm following up to see if you have any questions or if there's anything else I can provide to help with your decision.`;
    }
  } else {
    // Regular follow-up
    if (bid.status === "follow_up") {
      body = `I'm following up on the proposal I sent${clientName} for ${projectName}. I wanted to check in and see if you have any questions or need additional information about the project.`;
    } else {
      body = `I wanted to follow up on the proposal I sent${clientName} for ${projectName}. I'm reaching out to see if you have any questions or if there's anything else I can provide.`;
    }
  }

  return `${greeting} ${body} ${closing}`;
}
