import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function Addendums() {
  const mockAddendums = [
    {
      id: 1,
      bidId: 1,
      addendumNumber: "A-001",
      receivedAt: new Date("2026-03-15"),
      description: "Scope change: Additional floor cleaning required",
      impactAssessment: "Requires quote adjustment - estimated +$500",
      quotAdjustmentNeeded: true,
      adjustmentAmount: 50000,
      acknowledgmentStatus: "pending",
    },
    {
      id: 2,
      bidId: 2,
      addendumNumber: "A-002",
      receivedAt: new Date("2026-03-10"),
      description: "Schedule change: Project moved to next month",
      impactAssessment: "No quote adjustment needed - timeline change only",
      quotAdjustmentNeeded: false,
      adjustmentAmount: 0,
      acknowledgmentStatus: "sent",
    },
  ];

  const getAcknowledgmentIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "acknowledged":
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getAcknowledgmentColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "acknowledged":
        return "bg-blue-100 text-blue-800";
      case "sent":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Addendums</h1>
        <p className="text-gray-600 mt-2">Track and manage project addendums with AI-powered impact assessment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Addendums</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAddendums.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Acknowledgment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {mockAddendums.filter(a => a.acknowledgmentStatus === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Quote Adjustments Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockAddendums.filter(a => a.quotAdjustmentNeeded).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Addendum Log</CardTitle>
          <CardDescription>
            All received addendums with AI-powered impact assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAddendums.map(addendum => (
              <div key={addendum.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">Addendum {addendum.addendumNumber}</h3>
                      <Badge variant="outline">Bid #{addendum.bidId}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Received: {addendum.receivedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getAcknowledgmentColor(addendum.acknowledgmentStatus)}>
                    <span className="flex items-center gap-1">
                      {getAcknowledgmentIcon(addendum.acknowledgmentStatus)}
                      {addendum.acknowledgmentStatus.charAt(0).toUpperCase() + addendum.acknowledgmentStatus.slice(1)}
                    </span>
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-sm text-gray-600">{addendum.description}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm font-medium text-blue-900">AI Impact Assessment</p>
                  <p className="text-sm text-blue-800 mt-1">{addendum.impactAssessment}</p>
                </div>

                {addendum.quotAdjustmentNeeded && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm font-medium text-red-900">
                      Quote Adjustment: +${(addendum.adjustmentAmount / 100).toFixed(2)}
                    </p>
                  </div>
                )}

                {addendum.acknowledgmentStatus === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="default">
                      Acknowledge & Send
                    </Button>
                    <Button size="sm" variant="outline">
                      Review Details
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
