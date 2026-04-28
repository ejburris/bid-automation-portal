import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BidRow, formatBidCurrency, formatBidDate, getEffectiveSentDate } from "@/lib/bidBackbone";
import { BidStatusBadge } from "./BidStatusBadge";

export function RecentBidsList({ bids }: { bids: BidRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Bids</CardTitle>
      </CardHeader>
      <CardContent>
        {bids.length > 0 ? (
          <div className="space-y-4">
            {bids.slice(0, 5).map((bid) => (
              <div key={bid.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{bid.projectName || `Bid #${bid.id}`}</p>
                  <p className="text-sm text-gray-600">{bid.projectAddress || `Project ID: ${bid.projectId ?? '—'}`}</p>
                  <p className="text-xs text-gray-500">Updated {formatBidDate(bid.updatedAt ?? bid.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold">{formatBidCurrency(bid.bidAmount)}</p>
                    <p className="text-xs text-gray-500">Sent {formatBidDate(getEffectiveSentDate(bid))}</p>
                  </div>
                  <BidStatusBadge status={bid.status} />
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No bids yet. Start by creating a new bid.</div>
        )}
      </CardContent>
    </Card>
  );
}
