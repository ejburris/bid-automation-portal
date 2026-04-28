import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { AlertCircle, Download, Loader2, Mail, Printer } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { buildLockedSnapshotFromBid } from '@/lib/pricingSnapshot';
import { downloadProposalPdf } from '@/lib/proposalPdf';
import { prepareFollowUpEmail, buildProposalEmailDraftHref } from '@/lib/proposalMail';
import { ProposalPreview } from '@/components/proposals/ProposalPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ProjectFilesSection } from '@/components/bids/ProjectFilesSection';
import { toast } from 'sonner';

export default function ProposalView() {
  const { bidId } = useParams<{ bidId: string }>();
  const [, navigate] = useLocation();
  const [displayMode, setDisplayMode] = useState<'standard' | 'detailed'>('standard');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isOpeningProposalDraft, setIsOpeningProposalDraft] = useState(false);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const utils = trpc.useUtils();
  const markSentMutation = trpc.bids.markSent.useMutation();
  const recordFollowUpMutation = trpc.bids.recordFollowUp.useMutation();
  const updateNotesMutation = trpc.bids.updateNotes.useMutation();
  const bidIdNum = bidId ? Number.parseInt(bidId, 10) : 0;

  const { data: bid, isLoading, error } = trpc.bids.getById.useQuery(
    { id: bidIdNum },
    { enabled: Number.isFinite(bidIdNum) && bidIdNum > 0 },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !bid) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Proposal Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{error?.message || 'Unable to load this proposal.'}</p>
            <Button onClick={() => navigate('/bids')} className="mt-4 w-full">
              Back to Bids
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snapshot = buildLockedSnapshotFromBid(bid);
  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadProposalPdf({ bid, snapshot, displayMode });
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : 'Failed to download PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };
  const handleOpenProposalEmailDraft = async () => {
    try {
      setIsOpeningProposalDraft(true);
      const mailtoHref = buildProposalEmailDraftHref(bid);
      await markSentMutation.mutateAsync({ id: bid.id });
      await Promise.all([
        utils.dashboard.getOverview.invalidate(),
        utils.bids.list.invalidate(),
        utils.bids.getById.invalidate({ id: bid.id }),
      ]);
      window.location.href = mailtoHref;
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : 'Failed to open proposal email draft');
    } finally {
      setIsOpeningProposalDraft(false);
    }
  };
  const handleFollowUpNow = async () => {
    try {
      setIsFollowingUp(true);
      await prepareFollowUpEmail(bid, displayMode);
      await recordFollowUpMutation.mutateAsync({ id: bid.id });
      await Promise.all([
        utils.dashboard.getOverview.invalidate(),
        utils.bids.list.invalidate(),
        utils.bids.getById.invalidate({ id: bid.id }),
      ]);
    } catch (followUpError) {
      toast.error(followUpError instanceof Error ? followUpError.message : 'Failed to prepare follow-up email');
    } finally {
      setIsFollowingUp(false);
    }
  };
  const handleNotesBlur = async (notes: string) => {
    try {
      await updateNotesMutation.mutateAsync({ id: bid.id, notes });
      await utils.bids.getById.invalidate({ id: bid.id });
    } catch (notesError) {
      toast.error(notesError instanceof Error ? notesError.message : 'Failed to save notes');
    }
  };

  return (
    <div className="space-y-6 bg-gray-50 py-4 print:bg-white print:py-0">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Proposal View</h1>
          <p className="text-sm text-gray-600">Client-facing proposal generated from the saved locked bid.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
            {isDownloadingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
          <Button variant="outline" onClick={handleOpenProposalEmailDraft} disabled={isOpeningProposalDraft}>
            {isOpeningProposalDraft ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Open Proposal Email Draft
          </Button>
          {(bid.status === 'sent' || bid.status === 'follow_up') && (
            <Button variant="outline" onClick={handleFollowUpNow} disabled={isFollowingUp}>
              {isFollowingUp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Follow Up Now
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={() => navigate('/bids')}>
            Back to Bids
          </Button>
        </div>
      </div>
      <ProposalPreview
        bid={bid}
        snapshot={snapshot}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
      />
      <div className="mx-auto grid max-w-4xl gap-6 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              defaultValue={bid.notes ?? ''}
              placeholder="Internal notes for this bid."
              rows={4}
              onBlur={(event) => handleNotesBlur(event.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">Internal only. Not included in client proposal PDF.</p>
          </CardContent>
        </Card>
        <ProjectFilesSection bidId={bid.id} />
      </div>
    </div>
  );
}
