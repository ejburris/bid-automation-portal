import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Clock, Zap } from "lucide-react";

export default function Integration() {
  const platforms = [
    {
      name: "Outlook",
      icon: "📧",
      isConnected: false,
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "Disconnected",
      description: "Monitor incoming emails for bid opportunities",
    },
    {
      name: "BuildingConnected",
      icon: "🏗️",
      isConnected: true,
      lastSync: new Date(Date.now() - 30 * 60 * 1000),
      status: "Connected",
      description: "Extract project details and submit bids",
    },
    {
      name: "PlanCenter NW",
      icon: "📋",
      isConnected: false,
      lastSync: null,
      status: "Not Connected",
      description: "Receive and track project opportunities",
    },
    {
      name: "Procore",
      icon: "⚙️",
      isConnected: true,
      lastSync: new Date(Date.now() - 5 * 60 * 1000),
      status: "Connected",
      description: "Access project documents and updates",
    },
  ];

  const getStatusIcon = (isConnected: boolean) => {
    return isConnected ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getStatusColor = (isConnected: boolean) => {
    return isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  };

  const connectedCount = platforms.filter(p => p.isConnected).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integration Status</h1>
        <p className="text-gray-600 mt-2">Monitor and manage connections to bidding platforms and email services.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Connected Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{connectedCount}/{platforms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Disconnected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{platforms.length - connectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {connectedCount > 2 ? "Good" : "Degraded"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {platforms.map(platform => (
          <Card key={platform.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <CardDescription>{platform.description}</CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(platform.isConnected)}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(platform.isConnected)}
                    {platform.status}
                  </span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Last Sync</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatLastSync(platform.lastSync)}
                </p>
              </div>

              {platform.isConnected ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Sync Now
                  </Button>
                  <Button size="sm" variant="outline">
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
          <CardDescription>Latest integration events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">BuildingConnected sync completed</p>
                <p className="text-xs text-gray-600">5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Procore sync completed</p>
                <p className="text-xs text-gray-600">5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Outlook connection lost</p>
                <p className="text-xs text-gray-600">2 hours ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
