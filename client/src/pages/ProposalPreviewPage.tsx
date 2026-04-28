import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { buildLockedSnapshotFromBid } from '@/lib/pricingSnapshot';
import { getCachedProposal, clearCache } from '@/lib/proposalCache';
import { ProposalPreview } from '@/components/proposals/ProposalPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProposalPreviewPage() {
  const { bidId } = useParams<{ bidId: string }>();
  const [, navigate] = useLocation();
  const [displayMode, setDisplayMode] = useState<'standard' | 'detailed'>('standard');
  const bidIdNum = bidId ? Number.parseInt(bidId, 10) : 0;

  // Check for cached proposal from recent generation
  const cachedProposal = getCachedProposal(bidIdNum);

  // Always fetch the full bid so we include persisted fields like addenda
  const { data: bid, isLoading, error } = trpc.bids.getById.useQuery(
    { id: bidIdNum },
    { enabled: Number.isFinite(bidIdNum) && bidIdNum > 0 },
  );

  // Prefer the fetched bid when available, otherwise fall back to cached proposal data
  const currentBid = bid ?? cachedProposal?.proposal?.bid;
  const isLoadingState = !currentBid && isLoading;

  if (isLoadingState) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !currentBid) {
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
            <p className="text-sm text-gray-600">{error?.message || 'Unable to load this proposal preview.'}</p>
            <Button onClick={() => navigate('/bids')} className="mt-4 w-full">
              Back to Bids
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snapshot = buildLockedSnapshotFromBid(currentBid);

  // Clear cache after using it once
  if (cachedProposal) {
    clearCache();
  }

  return (
    <div className="space-y-6 bg-gray-50 py-4 print:bg-white print:py-0">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Proposal Preview</h1>
          <p className="text-sm text-gray-600">Client-facing preview using the saved locked pricing snapshot.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border bg-white p-1">
            <Button
              type="button"
              size="sm"
              variant={displayMode === 'standard' ? 'default' : 'ghost'}
              onClick={() => setDisplayMode('standard')}
            >
              Standard Proposal
            </Button>
            <Button
              type="button"
              size="sm"
              variant={displayMode === 'detailed' ? 'default' : 'ghost'}
              onClick={() => setDisplayMode('detailed')}
            >
              Detailed Proposal
            </Button>
          </div>
          <Button variant="outline" onClick={() => navigate('/bids')}>
            Back to Bids
          </Button>
        </div>
      </div>
      <ProposalPreview bid={currentBid} snapshot={snapshot} displayMode={displayMode} />
    </div>
  );
}
