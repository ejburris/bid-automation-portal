import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Database, FileText, CheckCircle, Send, Settings } from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BidSummaryCards } from "@/components/bids/BidSummaryCards";
import { ActionStateBoard } from "@/components/bids/ActionStateBoard";
import { PipelineValueCards } from "@/components/bids/PipelineValueCards";
import { BidsTable } from "@/components/bids/BidsTable";
import { FollowUpActionQueue } from "@/components/bids/FollowUpActionQueue";
import { BID_STATUSES, BidRow, BidStatus, EMPTY_ACTION_STATES, EMPTY_BID_SUMMARY, getBidStatusLabel, isFollowUpDue } from "@/lib/bidBackbone";
import { prepareFollowUpEmail } from "@/lib/proposalMail";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: overview, isLoading: bidsLoading } = trpc.dashboard.getOverview.useQuery();
  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.bids.updateStatus.useMutation();
  const recordFollowUpMutation = trpc.bids.recordFollowUp.useMutation();
  const [trackingFilter, setTrackingFilter] = useState<string | null>(null);

  const summary = overview?.summary ?? EMPTY_BID_SUMMARY;
  const bids = overview?.bids ?? [];
  const actionStates = overview?.actionStates ?? EMPTY_ACTION_STATES;
  const integrationStatus = overview?.integrations ?? [];
  const trackedBids = useMemo(() => {
    if (!trackingFilter) return bids;
    if (trackingFilter === "follow_up_due") return bids.filter(isFollowUpDue);
    return bids.filter((bid) => bid.status === trackingFilter);
  }, [bids, trackingFilter]);
  const handleStatusChange = async (bidId: number, status: BidStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: bidId, status });
      await utils.dashboard.getOverview.invalidate();
      toast.success("Bid status updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update bid status");
    }
  };
  const handleFollowUpNow = async (bid: BidRow) => {
    try {
      await prepareFollowUpEmail(bid);
      await recordFollowUpMutation.mutateAsync({ id: bid.id });
      await utils.dashboard.getOverview.invalidate();
      toast.success("Follow-up recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to prepare follow-up");
    }
  };

  const pipelineStages = [
    {
      title: "Email Detection",
      description: "Monitor Outlook for bid opportunities",
      icon: Mail,
      status: integrationStatus?.find(s => s.platform === "outlook")?.isConnected ? "Connected" : "Disconnected",
    },
    {
      title: "Platform Extraction",
      description: "Extract from BuildingConnected, PlanCenter, Procore",
      icon: Database,
      status: "Ready",
    },
    {
      title: "Proposal Generation",
      description: "Generate proposals with dynamic pricing",
      icon: FileText,
      status: "Ready",
    },
    {
      title: "Approval",
      description: "Review and approve before sending",
      icon: CheckCircle,
      status: "Ready",
    },
    {
      title: "Delivery",
      description: "Send proposals and follow-ups",
      icon: Send,
      status: integrationStatus?.find(s => s.platform === "outlook")?.isConnected ? "Connected" : "Manual",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back{user?.name ? `, ${user.name}` : ""}. Here is your bid pipeline at a glance.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/new-bid">New Bid</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pipeline">Pipeline View</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/integration">
              <Settings className="mr-2 h-4 w-4" />
              Integrations
            </Link>
          </Button>
        </div>
      </div>

      <BidSummaryCards summary={summary} />

      <FollowUpActionQueue
        bids={bids}
        onFollowUpNow={handleFollowUpNow}
        onStatusChange={handleStatusChange}
        isBusy={recordFollowUpMutation.isPending || updateStatusMutation.isPending}
      />

      <PipelineValueCards summary={summary} />

      <ActionStateBoard actionStates={actionStates} />

      <div>
        <h2 className="mb-4 text-xl font-bold">Operations Pipeline</h2>
        <div className="flex flex-wrap gap-4 xl:flex-nowrap">
          {pipelineStages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.title} className="flex flex-1 items-center gap-4">
                <Card className="flex-1 min-w-[220px]">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{stage.title}</CardTitle>
                          <CardDescription>{stage.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={stage.status === "Connected" || stage.status === "Ready" ? "default" : "secondary"}>
                        {stage.status}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
                {index < pipelineStages.length - 1 && <ArrowRight className="h-6 w-6 flex-shrink-0 text-gray-400" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Bid Tracking</h2>
            <p className="text-sm text-gray-600">Track sent proposals, follow-ups, awards, and losses.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={trackingFilter === null ? "default" : "outline"} size="sm" onClick={() => setTrackingFilter(null)}>
              Show All
            </Button>
            <Button variant={trackingFilter === "sent" ? "default" : "outline"} size="sm" onClick={() => setTrackingFilter("sent")}>
              Sent
            </Button>
            <Button variant={trackingFilter === "follow_up_due" ? "default" : "outline"} size="sm" onClick={() => setTrackingFilter("follow_up_due")}>
              Follow-Up Due
            </Button>
            {BID_STATUSES.filter((status) => status === "awarded" || status === "lost").map((status) => (
              <Button key={status} variant={trackingFilter === status ? "default" : "outline"} size="sm" onClick={() => setTrackingFilter(status)}>
                {getBidStatusLabel(status)}
              </Button>
            ))}
          </div>
        </div>
        <BidsTable
          bids={trackedBids}
          onStatusChange={handleStatusChange}
          onFollowUpNow={handleFollowUpNow}
          isUpdatingStatus={updateStatusMutation.isPending}
          isFollowingUp={recordFollowUpMutation.isPending}
        />
      </div>

      {bidsLoading && <div className="text-sm text-gray-500">Refreshing pipeline data…</div>}
    </div>
  );
}
