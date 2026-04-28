import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BID_STATUSES,
  BidRow,
  BidStatus,
  formatBidCurrency,
  formatBidDate,
  getBidStatusLabel,
  getEffectiveFollowUpDate,
  getEffectiveSentDate,
  isFollowUpDue,
} from "@/lib/bidBackbone";
import { BidStatusBadge } from "./BidStatusBadge";
import { Link } from "wouter";
import { Mail } from "lucide-react";

function formatFollowUpStatus(status?: string | null) {
  if (!status) return "—";
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getFollowUpStatusClasses(status?: string | null) {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "overdue") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-blue-200 bg-blue-50 text-blue-800";
}

export function BidsTable({
  bids,
  onStatusChange,
  onFollowUpNow,
  isUpdatingStatus = false,
  isFollowingUp = false,
}: {
  bids: BidRow[];
  onStatusChange?: (bidId: number, status: BidStatus) => void;
  onFollowUpNow?: (bid: BidRow) => void;
  isUpdatingStatus?: boolean;
  isFollowingUp?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Bids</CardTitle>
        <CardDescription>
          {bids.length} bid{bids.length !== 1 ? "s" : ""} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bids.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Project Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Proposal Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Sent Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Follow-Up Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Follow-Up Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => {
                  const followUpDue = isFollowUpDue(bid);
                  return (
                    <tr key={bid.id} className={`border-b hover:bg-gray-50 ${followUpDue ? "bg-orange-50/70" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{bid.projectName || `Bid #${bid.id}`}</div>
                        <div className="text-xs text-gray-500">{bid.projectAddress || "No address yet"}</div>
                      </td>
                      <td className="px-4 py-3">{bid.clientCompany || "—"}</td>
                      <td className="px-4 py-3">{formatBidCurrency(bid.bidAmount)}</td>
                      <td className="px-4 py-3">
                        {onStatusChange ? (
                          <Select
                            value={String(bid.status)}
                            onValueChange={(status) => onStatusChange(bid.id, status as BidStatus)}
                            disabled={isUpdatingStatus}
                          >
                            <SelectTrigger size="sm" className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BID_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {getBidStatusLabel(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <BidStatusBadge status={bid.status} />
                        )}
                      </td>
                      <td className="px-4 py-3">{formatBidDate(getEffectiveSentDate(bid))}</td>
                      <td className={`px-4 py-3 ${followUpDue ? "font-medium text-orange-800" : ""}`}>
                        {formatBidDate(getEffectiveFollowUpDate(bid))}
                      </td>
                      <td className="px-4 py-3">
                        {bid.followUpStatus ? (
                          <Badge className={getFollowUpStatusClasses(bid.followUpStatus)}>
                            {formatFollowUpStatus(bid.followUpStatus)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatBidDate(bid.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {(bid.status === "sent" || bid.status === "follow_up") && onFollowUpNow && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onFollowUpNow(bid)}
                              disabled={isFollowingUp}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Follow Up Now
                            </Button>
                          )}
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/proposal-view/${bid.id}`}>View Proposal</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No bids found. Create your first bid to get started.</div>
        )}
      </CardContent>
    </Card>
  );
}
