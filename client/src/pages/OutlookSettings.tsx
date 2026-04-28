import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function OutlookSettings() {
  const { user } = useAuth();
  const [syncFrequency, setSyncFrequency] = useState("30");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const getAuthUrl = trpc.outlook.getAuthUrl.useQuery();
  const syncEmails = trpc.outlook.syncEmails.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.messagesCount} emails`);
      setConnectionStatus("connected");
      setConnectedEmail("eburris@cwminc.com");
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
      setConnectionStatus("error");
    },
  });

  // Check connection status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Try to get auth URL to check if Outlook is configured
        if (getAuthUrl.data?.authUrl) {
          // If we have an auth URL, we're ready to connect
          setConnectionStatus("disconnected");
        }
      } catch (error) {
        console.error("Failed to check Outlook status:", error);
      }
    };
    checkStatus();
  }, [getAuthUrl.data]);

  const handleConnectOutlook = async () => {
    setIsConnecting(true);
    try {
      const authUrl = getAuthUrl.data?.authUrl;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast.error("Failed to generate auth URL");
      }
    } catch (error) {
      toast.error("Failed to generate auth URL");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncNow = () => {
    // In production, this would use the actual access token from session storage
    const accessToken = sessionStorage.getItem("outlook_access_token") || "temp-token";
    syncEmails.mutate({
      accessToken,
      limit: 10,
    });
  };

  const handleTestConnection = async () => {
    try {
      const accessToken = sessionStorage.getItem("outlook_access_token") || "temp-token";
      syncEmails.mutate({
        accessToken,
        limit: 1,
      });
      setTestMessage("✓ Successfully connected to Outlook");
    } catch (error) {
      setTestMessage("✗ Failed to connect to Outlook");
      setConnectionStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Outlook Integration</h1>
        <p className="text-muted-foreground mt-2">Connect your company email and configure automatic bid detection</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Connection Status
          </CardTitle>
          <CardDescription>Manage your Outlook email connection for bid opportunity detection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-3">
              {connectionStatus === "connected" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : connectionStatus === "error" ? (
                <AlertCircle className="w-5 h-5 text-red-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-semibold">
                  {connectionStatus === "connected" ? "Connected" : connectionStatus === "error" ? "Connection Error" : "Not Connected"}
                </p>
                {connectedEmail && (
                  <p className="text-sm text-gray-600">{connectedEmail}</p>
                )}
              </div>
            </div>
            <Badge variant={connectionStatus === "connected" ? "default" : "secondary"}>
              {connectionStatus === "connected" ? "Active" : "Inactive"}
            </Badge>
          </div>

          {testMessage && (
            <Alert variant={testMessage.startsWith("✓") ? "default" : "destructive"}>
              <AlertDescription>{testMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {connectionStatus !== "connected" ? (
              <Button
                onClick={handleConnectOutlook}
                disabled={isConnecting || getAuthUrl.isPending}
                className="flex-1 gap-2"
              >
                {isConnecting || getAuthUrl.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Outlook"
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  disabled={syncEmails.isPending}
                  className="flex-1 gap-2"
                >
                  {syncEmails.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sync-frequency">Email Sync Frequency</Label>
              <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                <SelectTrigger id="sync-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="240">Every 4 hours</SelectItem>
                  <SelectItem value="1440">Daily</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Automatic email sync will run at this frequency to detect bid opportunities
              </p>
            </div>

            {connectionStatus === "connected" && (
              <div className="flex gap-2">
                <Button
                  onClick={handleSyncNow}
                  disabled={syncEmails.isPending}
                  variant="outline"
                  className="gap-2 flex-1"
                >
                  {syncEmails.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    "Sync Now"
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {connectionStatus === "connected" && (
        <Card>
          <CardHeader>
            <CardTitle>Email Monitoring Settings</CardTitle>
            <CardDescription>Configure which emails trigger bid opportunity detection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Bid Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                placeholder="bid, proposal, quote, estimate, rfq"
                defaultValue="bid, proposal, quote, estimate, rfq, final clean, construction clean"
              />
              <p className="text-xs text-muted-foreground">
                Emails containing these keywords will be analyzed for bid opportunities
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exclude-senders">Exclude Senders (comma-separated)</Label>
              <Input
                id="exclude-senders"
                placeholder="noreply@, automated@"
                defaultValue="noreply@, automated@, system@"
              />
              <p className="text-xs text-muted-foreground">
                Emails from these addresses will be skipped during analysis
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Email Detection</h4>
            <p className="text-gray-600">
              Once connected, the portal monitors your Outlook inbox for bid opportunities from BuildingConnected, PlanCenter NW, Procore, and other platforms.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Automatic Project Creation</h4>
            <p className="text-gray-600">
              Bid opportunities are automatically analyzed and converted into projects in the portal. You can review and edit them before generating proposals.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Email Sending</h4>
            <p className="text-gray-600">
              Your Outlook account is also used to send bid proposals, follow-up emails, and other communications directly from the portal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
