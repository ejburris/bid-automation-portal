import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { Link } from "wouter";
import { BidSummaryCards } from "@/components/bids/BidSummaryCards";
import { BidsTable } from "@/components/bids/BidsTable";
import { BID_STATUSES, BidRow, BidStatus, EMPTY_BID_SUMMARY, getBidStatusLabel, isFollowUpDue, matchesBidSearch } from "@/lib/bidBackbone";
import { toast } from "sonner";
import { prepareFollowUpEmail } from "@/lib/proposalMail";

export default function Bids() {
  const { data: overview, isLoading } = trpc.dashboard.getOverview.useQuery();
  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.bids.updateStatus.useMutation();
  const recordFollowUpMutation = trpc.bids.recordFollowUp.useMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"newest" | "followUpDate" | "proposalAmount">("newest");

  const bids = overview?.bids ?? [];
  const summary = overview?.summary ?? EMPTY_BID_SUMMARY;
  const filteredBids = useMemo(() => {
    const result = bids.filter((bid) => {
      const matchesSearchTerm = matchesBidSearch(bid, searchTerm);
      const matchesStatus = !statusFilter || bid.status === statusFilter;
      return matchesSearchTerm && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sortKey === "followUpDate") {
        const aDate = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
        const bDate = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
        return aDate - bDate;
      }
      if (sortKey === "proposalAmount") {
        return (b.bidAmount ?? 0) - (a.bidAmount ?? 0);
      }
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });
  }, [bids, searchTerm, statusFilter, sortKey]);
  const handleStatusChange = async (bidId: number, status: BidStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: bidId, status });
      await Promise.all([
        utils.dashboard.getOverview.invalidate(),
        utils.bids.list.invalidate(),
      ]);
      toast.success("Bid status updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update bid status");
    }
  };
  const handleFollowUpNow = async (bid: BidRow) => {
    try {
      await prepareFollowUpEmail(bid);
      await recordFollowUpMutation.mutateAsync({ id: bid.id });
      await Promise.all([
        utils.dashboard.getOverview.invalidate(),
        utils.bids.list.invalidate(),
      ]);
      toast.success("Follow-up recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to prepare follow-up");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bids</h1>
          <p className="mt-2 text-gray-600">Track and manage all your bid proposals from one shared pipeline.</p>
        </div>
        <Button asChild>
          <Link href="/new-bid">
            <Plus className="mr-2 h-4 w-4" />
            New Bid
          </Link>
        </Button>
      </div>

      <BidSummaryCards summary={summary} />

      <div className="flex flex-wrap gap-4">
        <div className="min-w-64 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by bid, project, address, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={statusFilter === null ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(null)}>
          All ({bids.length})
        </Button>
        {BID_STATUSES.map((status) => {
          const count = bids.filter((b) => b.status === status).length;
          return (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {getBidStatusLabel(status)} ({count})
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <span>Sort by:</span>
        <Button
          variant={sortKey === "newest" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortKey("newest")}
        >
          Newest First
        </Button>
        <Button
          variant={sortKey === "followUpDate" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortKey("followUpDate")}
        >
          Follow-Up Date
        </Button>
        <Button
          variant={sortKey === "proposalAmount" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortKey("proposalAmount")}
        >
          Proposal Amount
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading bids...</div>
      ) : (
        <BidsTable
          bids={filteredBids}
          onStatusChange={handleStatusChange}
          onFollowUpNow={handleFollowUpNow}
          isUpdatingStatus={updateStatusMutation.isPending}
          isFollowingUp={recordFollowUpMutation.isPending}
        />
      )}
    </div>
  );
}
