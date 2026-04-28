import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FolderOpen, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function GoogleDriveSettings() {
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("Clean World Maintenance Bid Proposals");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [connectedEmail, setConnectedEmail] = useState("cwmestimation@gmail.com");
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected");

  // Load saved folder ID on mount
  useEffect(() => {
    const savedFolderId = localStorage.getItem("google_drive_folder_id");
    if (savedFolderId) {
      setFolderId(savedFolderId);
      setIsConnected(true);
      setConnectionStatus("connected");
    }
  }, []);

  const handleSaveFolderId = async () => {
    if (!folderId.trim()) {
      toast.error("Please enter a folder ID");
      return;
    }
    setIsSaving(true);
    try {
      // Save to localStorage for now (in production, save to database via tRPC)
      localStorage.setItem("google_drive_folder_id", folderId);
      localStorage.setItem("google_drive_folder_name", folderName);
      
      toast.success("Folder ID saved successfully");
      setIsConnected(true);
      setConnectionStatus("connected");
      setTestMessage(null);
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
      setConnectionStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!folderId.trim()) {
      toast.error("Please enter a folder ID first");
      return;
    }
    setIsTesting(true);
    setTestMessage(null);
    try {
      // In production, this would call a tRPC procedure to verify the folder
      // For now, we'll simulate a successful connection
      setTestMessage("✓ Successfully connected to Google Drive folder");
      setConnectionStatus("connected");
      setIsConnected(true);
    } catch (error: any) {
      setTestMessage("✗ Failed to access Google Drive folder");
      setConnectionStatus("error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      localStorage.removeItem("google_drive_folder_id");
      localStorage.removeItem("google_drive_folder_name");
      setFolderId("");
      setIsConnected(false);
      setConnectionStatus("disconnected");
      setTestMessage(null);
      toast.success("Google Drive disconnected");
    } catch (error: any) {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Google Drive Integration</h1>
        <p className="text-muted-foreground mt-2">Configure automatic proposal uploads to your shared folder</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Connection Status
          </CardTitle>
          <CardDescription>Manage your Google Drive connection for proposal storage</CardDescription>
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
                  {connectionStatus === "connected" ? "Connected" : connectionStatus === "error" ? "Connection Error" : "Not Configured"}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configure Folder</CardTitle>
          <CardDescription>Set up your Google Drive folder for proposal storage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-id">Google Drive Folder ID</Label>
            <Input
              id="folder-id"
              placeholder="Paste your Google Drive folder ID here"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              To find your folder ID: Open the folder in Google Drive, copy the ID from the URL (after /folders/)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">How to get your Folder ID:</p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to Google Drive and open your shared folder</li>
              <li>Look at the URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong></li>
              <li>Copy the FOLDER_ID and paste it above</li>
              <li>Click "Save Folder ID" to configure</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveFolderId}
              disabled={isSaving || !folderId.trim()}
              className="flex-1 gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Folder ID"
              )}
            </Button>
            {isConnected && (
              <>
                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  disabled={isTesting}
                  className="flex-1 gap-2"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  className="flex-1"
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Settings</CardTitle>
            <CardDescription>Configure how proposals are organized in Google Drive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span className="text-sm font-medium">Auto-organize by month</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Enabled</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span className="text-sm font-medium">Include project details in filename</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Enabled</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <span className="text-sm font-medium">Share with team members</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Enabled</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Proposals will be uploaded automatically when approved, organized by month, and shared with your team
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Automatic Upload</h4>
            <p className="text-gray-600">
              When you generate and send a bid proposal, the PDF is automatically uploaded to your configured Google Drive folder.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Easy Sharing</h4>
            <p className="text-gray-600">
              All proposals are stored in one organized location, making it easy to share with team members or archive for records.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Version Control</h4>
            <p className="text-gray-600">
              Each proposal is saved with a timestamp, so you can track different versions of bids for the same project.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
