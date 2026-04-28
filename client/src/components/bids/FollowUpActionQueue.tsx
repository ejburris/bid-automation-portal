import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BidRow, BidStatus, formatBidCurrency, getFollowUpDaysOverdue, isFollowUpDue } from "@/lib/bidBackbone";
import { BidStatusBadge } from "./BidStatusBadge";
import { Mail } from "lucide-react";

export function FollowUpActionQueue({
  bids,
  onFollowUpNow,
  onStatusChange,
  isBusy = false,
}: {
  bids: BidRow[];
  onFollowUpNow: (bid: BidRow) => void;
  onStatusChange: (bidId: number, status: BidStatus) => void;
  isBusy?: boolean;
}) {
  const actionable = bids
    .filter((bid) => (bid.status === "sent" && isFollowUpDue(bid)) || bid.status === "follow_up")
    .sort((a, b) => getFollowUpDaysOverdue(b) - getFollowUpDaysOverdue(a));

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle>Follow-Up Action Queue</CardTitle>
        <CardDescription>Sent bids that need a contractor follow-up now.</CardDescription>
      </CardHeader>
      <CardContent>
        {actionable.length > 0 ? (
          <div className="space-y-3">
            {actionable.map((bid) => {
              const daysOverdue = getFollowUpDaysOverdue(bid);
              return (
                <div key={bid.id} className="flex flex-col gap-3 rounded-md border border-orange-100 bg-orange-50/60 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{bid.projectName || `Bid #${bid.id}`}</p>
                      <BidStatusBadge status={bid.status} />
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                        {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Due now'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{bid.clientCompany || 'No client listed'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="mr-2 font-semibold">{formatBidCurrency(bid.bidAmount)}</div>
                    <Button size="sm" onClick={() => onFollowUpNow(bid)} disabled={isBusy}>
                      <Mail className="mr-2 h-4 w-4" />
                      Follow Up Now
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onStatusChange(bid.id, "awarded")} disabled={isBusy}>
                      Mark Awarded
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onStatusChange(bid.id, "lost")} disabled={isBusy}>
                      Mark Lost
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-gray-500">No follow-ups due right now.</div>
        )}
      </CardContent>
    </Card>
  );
}
