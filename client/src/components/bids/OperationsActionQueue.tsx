import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BidRow, formatBidCurrency, formatBidDate, getEffectiveFollowUpDate } from "@/lib/bidBackbone";
import { BidStatusBadge } from "./BidStatusBadge";

function getActionLabel(bid: BidRow) {
  if (bid.status === 'draft') return 'Finish bid';
  const followUpAt = getEffectiveFollowUpDate(bid);
  if (followUpAt) {
    const due = new Date(followUpAt).getTime();
    if (!Number.isNaN(due) && due <= Date.now()) return 'Send follow-up';
  }
  if (bid.status === 'sent' || bid.status === 'follow_up') return 'Track response';
  return 'Review bid';
}

function rankBidForAction(bid: BidRow) {
  const followUpAt = getEffectiveFollowUpDate(bid);
  if (followUpAt) {
    const due = new Date(followUpAt).getTime();
    if (!Number.isNaN(due) && due <= Date.now()) return 0;
  }
  if (bid.status === 'draft') return 1;
  if (bid.status === 'follow_up') return 2;
  if (bid.status === 'sent') return 3;
  return 10;
}

export function OperationsActionQueue({ bids }: { bids: BidRow[] }) {
  const actionable = bids
    .filter((bid) => ['draft', 'sent', 'follow_up'].includes(String(bid.status)))
    .sort((a, b) => rankBidForAction(a) - rankBidForAction(b))
    .slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations Queue</CardTitle>
        <CardDescription>Top bid actions to work next from the shared pipeline backbone.</CardDescription>
      </CardHeader>
      <CardContent>
        {actionable.length > 0 ? (
          <div className="space-y-3">
            {actionable.map((bid) => (
              <div key={bid.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{bid.projectName || `Bid #${bid.id}`}</p>
                    <BidStatusBadge status={bid.status} />
                  </div>
                  <p className="text-sm text-gray-600">{bid.projectAddress || 'No address yet'}</p>
                  <p className="text-xs text-gray-500">
                    Updated {formatBidDate(bid.updatedAt ?? bid.createdAt)} · Follow-up {formatBidDate(getEffectiveFollowUpDate(bid))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">{formatBidCurrency(bid.bidAmount)}</p>
                    <p className="text-xs text-gray-500">{getActionLabel(bid)}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/bids">Open queue</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No active bid actions right now.</div>
        )}
      </CardContent>
    </Card>
  );
}
