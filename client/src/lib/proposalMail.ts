import { buildLockedSnapshotFromBid } from '@/lib/pricingSnapshot';
import { downloadProposalPdf } from '@/lib/proposalPdf';
import type { BidRow } from '@/lib/bidBackbone';

type ProposalMailBid = BidRow & {
  contactName?: string | null;
  email?: string | null;
  proposalScopeNotes?: string | null;
  addendaAcknowledged?: string | null;
  createdAt?: Date | string | null;
};

function buildMailtoHref(to: string | null | undefined, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function openMailto(to: string | null | undefined, subject: string, body: string) {
  window.location.href = buildMailtoHref(to, subject, body);
}

export function buildProposalEmailDraftHref(bid: ProposalMailBid) {
  const projectName = bid.projectName || 'Project';
  const clientName = bid.contactName || bid.clientCompany || 'Client';
  const subject = `Proposal for ${projectName}`;
  const body = `Hello ${clientName},

Please find attached our proposal for ${projectName}. Let me know if you have any questions or would like to discuss next steps.

Thank you,
Clean World Maintenance`;
  return buildMailtoHref(bid.email, subject, body);
}

export async function prepareProposalEmail(bid: ProposalMailBid, displayMode: 'standard' | 'detailed') {
  const snapshot = buildLockedSnapshotFromBid(bid);
  await downloadProposalPdf({ bid, snapshot, displayMode });
  return buildProposalEmailDraftHref(bid);
}

export async function prepareFollowUpEmail(
  bid: ProposalMailBid,
  displayMode: 'standard' | 'detailed' = 'standard',
  downloadPdf = true,
) {
  if (downloadPdf) {
    const snapshot = buildLockedSnapshotFromBid(bid);
    await downloadProposalPdf({ bid, snapshot, displayMode });
  }

  const projectName = bid.projectName || 'Project';
  const clientName = bid.contactName || bid.clientCompany || 'Client';
  openMailto(
    bid.email,
    `Follow-up – ${projectName}`,
    `Hello ${clientName},

Just checking in on the proposal for ${projectName}.
Please let me know if you need anything further or if the project has been awarded.

Thank you,
Clean World Maintenance`,
  );
}
