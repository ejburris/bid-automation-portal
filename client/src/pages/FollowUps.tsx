import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2, MessageSquare, Copy, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatBidCurrency, generateFollowUpMessage } from "@/lib/bidBackbone";
import { toast } from "sonner";

export default function FollowUps() {
  const { data: bids, isLoading } = trpc.bids.list.useQuery();
  const utils = trpc.useUtils();
  const updateFollowUpStatusMutation = trpc.bids.updateFollowUpStatus.useMutation();

  // Filter bids with followUpStatus = "pending", followUpDate <= today, and sort by soonest followUpDate
  const pendingFollowUps = bids
    ?.filter((bid) => bid.followUpStatus === "pending" && bid.followUpDate && new Date(bid.followUpDate) <= new Date())
    ?.sort((a, b) => {
      const dateA = new Date(a.followUpDate!).getTime();
      const dateB = new Date(b.followUpDate!).getTime();
      return dateA - dateB;
    }) || [];

  // Filter bids needing escalation: followUpStatus = "pending", escalationDate <= today, sort by soonest escalationDate
  const escalationNeeded = bids
    ?.filter((bid) => bid.followUpStatus === "pending" && bid.escalationDate && new Date(bid.escalationDate) <= new Date())
    ?.sort((a, b) => {
      const dateA = new Date(a.escalationDate!).getTime();
      const dateB = new Date(b.escalationDate!).getTime();
      return dateA - dateB;
    }) || [];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  const createEmailDraftHref = (bid: { email?: string | null; projectName?: string | null }, message: string) => {
    const recipient = bid.email || "";
    const projectName = bid.projectName || "Project";
    const subject = `Follow-up on proposal for ${projectName}`;
    return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  };

  const handleOpenEmailDraft = async (
    bid: { id: number; email?: string | null; projectName?: string | null },
    message: string,
  ) => {
    const mailtoHref = createEmailDraftHref(bid, message);
    try {
      await updateFollowUpStatusMutation.mutateAsync({ id: bid.id, followUpStatus: "completed" });
      await utils.bids.list.invalidate();
      toast.success("Email draft opened and follow-up marked as contacted");
      window.location.href = mailtoHref;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open email draft and mark contacted");
    }
  };

  const handleMarkContacted = async (bidId: number) => {
    try {
      await updateFollowUpStatusMutation.mutateAsync({ id: bidId, followUpStatus: "completed" });
      await utils.bids.list.invalidate();
      toast.success("Follow-up marked as completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update follow-up status");
    }
  };

  const handleCopyAndMarkContacted = async (bidId: number, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      await updateFollowUpStatusMutation.mutateAsync({ id: bidId, followUpStatus: "completed" });
      await utils.bids.list.invalidate();
      toast.success("Message copied and marked as contacted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy message and mark contacted");
    }
  };

  const getFollowUpStatusLabel = (followUpDate?: Date | string | null) => {
    if (!followUpDate) return { label: "No Date", color: "bg-gray-100 text-gray-800" };

    const now = new Date();
    const dueDate = new Date(followUpDate);
    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { label: "Overdue", color: "bg-red-100 text-red-800" };
    } else if (daysUntil <= 3) {
      return { label: "Due Soon", color: "bg-orange-100 text-orange-800" };
    } else {
      return { label: "Pending", color: "bg-blue-100 text-blue-800" };
    }
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return '—';
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Follow-up Tracking</h1>
        <p className="text-gray-600 mt-2">Track and manage pending follow-ups for your bids.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingFollowUps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Due Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingFollowUps.filter(bid => {
                const status = getFollowUpStatusLabel(bid.followUpDate);
                return status.label === "Due Soon";
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {pendingFollowUps.filter(bid => {
                const status = getFollowUpStatusLabel(bid.followUpDate);
                return status.label === "Overdue";
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Escalation Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {escalationNeeded.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Follow-ups</CardTitle>
          <CardDescription>
            Bids requiring follow-up, sorted by due date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingFollowUps.length > 0 ? (
            <div className="space-y-4">
              {pendingFollowUps.map((bid) => {
                const statusInfo = getFollowUpStatusLabel(bid.followUpDate);
                const followUpMessage = generateFollowUpMessage(bid);
                return (
                  <div
                    key={bid.id}
                    className={`border rounded-lg p-4 space-y-3 ${
                      statusInfo.label === "Overdue" ? "bg-red-50 border-red-200" :
                      statusInfo.label === "Due Soon" ? "bg-orange-50 border-orange-200" :
                      "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {bid.projectName || `Bid #${bid.id}`}
                          </h3>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {bid.clientCompany || 'No client listed'}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {formatDate(bid.followUpDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatBidCurrency(bid.bidAmount)}</div>
                        <Badge variant="outline" className="mt-1">
                          {bid.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-white rounded-md p-3 border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Suggested Follow-up Message</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(followUpMessage)}
                          className="h-7 px-2"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{followUpMessage}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleMarkContacted(bid.id)}
                        disabled={updateFollowUpStatusMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {updateFollowUpStatusMutation.isPending ? "Updating..." : "Mark Contacted"}
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => void handleOpenEmailDraft(bid, followUpMessage)}
                        disabled={updateFollowUpStatusMutation.isPending}
                      >
                        Open Email Draft
                      </Button>
                      <Button 
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyAndMarkContacted(bid.id, followUpMessage)}
                        disabled={updateFollowUpStatusMutation.isPending}
                      >
                        Copy + Mark Contacted
                      </Button>
                      <Button size="sm" variant="outline">
                        Reschedule
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">
              No pending follow-ups at this time.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Escalation Needed</CardTitle>
          <CardDescription>
            Bids requiring escalation follow-up (45 days), sorted by escalation date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {escalationNeeded.length > 0 ? (
            <div className="space-y-4">
              {escalationNeeded.map((bid) => (
                <div
                  key={bid.id}
                  className="border rounded-lg p-4 space-y-3 bg-red-50 border-red-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {bid.projectName || `Bid #${bid.id}`}
                        </h3>
                        <Badge className="bg-red-100 text-red-800">
                          45-day follow-up
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {bid.clientCompany || 'No client listed'}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Escalation: {formatDate(bid.escalationDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatBidCurrency(bid.bidAmount)}</div>
                      <Badge variant="outline" className="mt-1">
                        {bid.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">
              No escalations needed at this time.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
