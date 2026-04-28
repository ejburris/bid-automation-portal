import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BID_STATUSES, BidRow, formatBidCurrency, getBidStatusClasses, getBidStatusLabel } from "@/lib/bidBackbone";

const columnDescriptions: Record<string, string> = {
  draft: "Bids being built",
  sent: "Proposals sent",
  follow_up: "Needs attention",
  awarded: "Won work",
  lost: "Closed lost",
};

function PipelineCard({ bid }: { bid: BidRow }) {
  return (
    <Link href={`/proposal-view/${bid.id}`}>
      <div className={`rounded-md border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getBidStatusClasses(bid.status)}`}>
        <div className="font-medium text-gray-950">{bid.projectName || `Bid #${bid.id}`}</div>
        <div className="mt-1 text-sm text-gray-600">{bid.clientCompany || "No client listed"}</div>
        <div className="mt-3 text-sm font-semibold text-gray-950">{formatBidCurrency(bid.bidAmount)}</div>
      </div>
    </Link>
  );
}

function calculateStatusTotals(bids: BidRow[]) {
  return BID_STATUSES.reduce((acc, status) => {
    const statusBids = bids.filter(bid => bid.status === status);
    const count = statusBids.length;
    const totalValue = statusBids.reduce((sum, bid) => sum + (bid.bidAmount || 0), 0);
    acc[status] = { count, totalValue };
    return acc;
  }, {} as Record<string, { count: number; totalValue: number }>);
}

function getNeedsAttentionBids(bids: BidRow[]) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return bids.filter(bid => {
    // Bids with pending follow-ups that are due soon or overdue
    if (bid.followUpStatus === "pending" && bid.followUpDate) {
      const followUpDate = new Date(bid.followUpDate);
      return followUpDate <= threeDaysFromNow;
    }
    // Bids in follow_up status (legacy)
    if (bid.status === "follow_up") {
      return true;
    }
    return false;
  }).sort((a, b) => {
    // Sort by followUpDate (soonest first), then by bid status priority
    const aDate = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
    const bDate = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
    if (aDate !== bDate) return aDate - bDate;

    // Priority: follow_up > sent with pending followUpStatus
    const statusPriority = { follow_up: 0, sent: 1 };
    return (statusPriority[a.status as keyof typeof statusPriority] ?? 2) -
           (statusPriority[b.status as keyof typeof statusPriority] ?? 2);
  });
}

export default function PipelineView() {
  const { data: overview, isLoading } = trpc.dashboard.getOverview.useQuery();
  const bids = overview?.bids ?? [];
  const bidsByStatus = BID_STATUSES.reduce<Record<string, BidRow[]>>((groups, status) => {
    groups[status] = bids.filter((bid) => bid.status === status);
    return groups;
  }, {});

  const statusTotals = calculateStatusTotals(bids);
  const needsAttentionBids = getNeedsAttentionBids(bids);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pipeline View</h1>
        <p className="mt-2 text-gray-600">A visual board for bids from draft through award or loss.</p>
      </div>

      {/* Closing Soon / Needs Attention Section */}
      {needsAttentionBids.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Closing Soon / Needs Attention</CardTitle>
            <p className="text-sm text-orange-700">Bids requiring immediate follow-up or closing soon</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {needsAttentionBids.slice(0, 6).map((bid) => (
                <Link key={bid.id} href={`/proposal-view/${bid.id}`}>
                  <div className="rounded-md border border-orange-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-950">{bid.projectName || `Bid #${bid.id}`}</div>
                        <div className="mt-1 text-sm text-gray-600">{bid.clientCompany || "No client listed"}</div>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {bid.status === "follow_up" ? "Follow-up" : "Due Soon"}
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-gray-950">{formatBidCurrency(bid.bidAmount)}</div>
                    {bid.followUpDate && (
                      <div className="mt-1 text-xs text-orange-700">
                        Due: {new Date(bid.followUpDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {needsAttentionBids.length > 6 && (
              <div className="mt-3 text-center">
                <Link href="/follow-ups" className="text-sm text-orange-700 hover:text-orange-900">
                  View all {needsAttentionBids.length} items →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading pipeline...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          {BID_STATUSES.map((status) => {
            const columnBids = bidsByStatus[status] ?? [];
            const { count, totalValue } = statusTotals[status];
            return (
              <Card key={status} className="min-h-[420px]">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{getBidStatusLabel(status)}</CardTitle>
                      <p className="mt-1 text-xs text-gray-500">{columnDescriptions[status]}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-500">{formatBidCurrency(totalValue)}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-3">
                  {columnBids.length > 0 ? (
                    columnBids.map((bid) => <PipelineCard key={bid.id} bid={bid} />)
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-center text-sm text-gray-500">
                      No bids
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
