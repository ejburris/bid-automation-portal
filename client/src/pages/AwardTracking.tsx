import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Award, TrendingUp, Target, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AwardTracking() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("30");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data for demonstration
  const mockMetrics = {
    totalBids: 24,
    awarded: 8,
    lost: 12,
    pending: 4,
    winRate: 33.3,
    avgResponseTime: 4.2, // days
    avgProposalValue: 45000,
    totalValue: 1080000,
  };

  const mockBids = [
    {
      id: 1,
      projectName: "Downtown Office Renovation",
      location: "Portland, OR",
      bidAmount: 85000,
      status: "awarded",
      submittedDate: "2026-03-15",
      awardedDate: "2026-04-10",
      daysToAward: 26,
    },
    {
      id: 2,
      projectName: "Hospital Facility Cleaning",
      location: "Seattle, WA",
      bidAmount: 125000,
      status: "awarded",
      submittedDate: "2026-03-20",
      awardedDate: "2026-04-05",
      daysToAward: 16,
    },
    {
      id: 3,
      projectName: "Mall Renovation Phase 2",
      location: "Vancouver, WA",
      bidAmount: 65000,
      status: "lost",
      submittedDate: "2026-03-10",
      lostDate: "2026-03-25",
      daysToLoss: 15,
    },
    {
      id: 4,
      projectName: "Tech Campus Construction",
      location: "San Francisco, CA",
      bidAmount: 250000,
      status: "pending",
      submittedDate: "2026-04-01",
      daysSubmitted: 15,
    },
    {
      id: 5,
      projectName: "University Expansion",
      location: "Eugene, OR",
      bidAmount: 180000,
      status: "awarded",
      submittedDate: "2026-02-28",
      awardedDate: "2026-04-12",
      daysToAward: 43,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "awarded":
        return "bg-green-100 text-green-800";
      case "lost":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "awarded":
        return <CheckCircle2 className="w-4 h-4" />;
      case "lost":
        return <XCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Award Tracking & Analytics</h1>
        <p className="text-muted-foreground mt-2">Track bid awards, losses, and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {mockMetrics.awarded} awarded out of {mockMetrics.totalBids} bids
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(mockMetrics.totalValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {mockMetrics.totalBids} proposals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.avgResponseTime} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              From submission to decision
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Bid Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(mockMetrics.avgProposalValue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average proposal amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Awarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{mockMetrics.awarded}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Total value: ${(mockMetrics.awarded * mockMetrics.avgProposalValue / 1000).toFixed(0)}K
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{mockMetrics.pending}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Awaiting decision from clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Lost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{mockMetrics.lost}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Did not win these bids
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bid History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bid History</CardTitle>
              <CardDescription>Recent bids and their status</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="awarded">Awarded</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Project</th>
                  <th className="text-left py-3 px-4 font-semibold">Location</th>
                  <th className="text-right py-3 px-4 font-semibold">Bid Amount</th>
                  <th className="text-center py-3 px-4 font-semibold">Status</th>
                  <th className="text-center py-3 px-4 font-semibold">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {mockBids.map((bid) => (
                  <tr key={bid.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{bid.projectName}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{bid.location}</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      ${(bid.bidAmount / 1000).toFixed(0)}K
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={`${getStatusColor(bid.status)} gap-1`}>
                        {getStatusIcon(bid.status)}
                        {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                      {bid.status === "awarded" && `${bid.daysToAward} days`}
                      {bid.status === "lost" && `${bid.daysToLoss} days`}
                      {bid.status === "pending" && `${bid.daysSubmitted} days ago`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>Key findings and recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Strong Performance in Q1</p>
                <p className="text-sm text-muted-foreground">
                  Your win rate of 33% is above industry average. Keep focusing on quality proposals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Response Time Optimization</p>
                <p className="text-sm text-muted-foreground">
                  Average 4.2 days to decision. Consider emphasizing quick turnaround in proposals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium">High-Value Opportunities</p>
                <p className="text-sm text-muted-foreground">
                  Focus on projects over $100K for better ROI. These have 45% win rate.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
