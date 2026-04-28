import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PrivateWagePreview {
  companyName: string;
  baseLocation: string;
  privateWageHourly: number;
  workDayHours: number;
  waxingCostPerSqft: number;
  carpetCostPerSqft: number;
  windowBasePricePerWindow: number;
  travelCostPerMile: number;
  hotelCostPerNight: number;
  perDiem: number;
  additionalCostPercentage: number;
}

interface PrevailingWagePreview {
  jurisdiction: string;
  state: string;
  effectiveDate: Date | string;
  wagePerHour: number;
  fringePerHour: number;
  minimumBid: number;
}

export default function ImportParameters() {
  // Helper function to convert ArrayBuffer to base64 without Node.js Buffer
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const uint8Array = new Uint8Array(buffer);
    const binaryString = String.fromCharCode.apply(null, Array.from(uint8Array));
    return btoa(binaryString);
  };

  const privateWageFileRef = useRef<HTMLInputElement>(null);
  const prevailingWageFileRef = useRef<HTMLInputElement>(null);

  const [privateWageFile, setPrivateWageFile] = useState<File | null>(null);
  const [prevailingWageFile, setPrevailingWageFile] = useState<File | null>(null);

  const [privateWagePreview, setPrivateWagePreview] = useState<PrivateWagePreview | null>(null);
  const [prevailingWagePreview, setPrevailingWagePreview] = useState<PrevailingWagePreview[]>([]);

  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importStep, setImportStep] = useState<"select" | "preview" | "complete">("select");

  const uploadPrivateWageMutation = trpc.import.uploadPrivateWage.useMutation();
  const uploadPrevailingWageMutation = trpc.import.uploadPrevailingWage.useMutation();
  const confirmImportMutation = trpc.import.confirmImport.useMutation();

  const handlePrivateWageFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setErrors(["Please select a valid Excel file (.xlsx)"]);
      return;
    }

    setPrivateWageFile(file);
    setErrors([]);
    await previewPrivateWage(file);
  };

  const handlePrevailingWageFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setErrors(["Please select a valid Excel file (.xlsx)"]);
      return;
    }

    setPrevailingWageFile(file);
    setErrors([]);
    await previewPrevailingWage(file);
  };

  const previewPrivateWage = async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await uploadPrivateWageMutation.mutateAsync({
        fileName: file.name,
        fileData: arrayBufferToBase64(arrayBuffer),
      });

      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
        return;
      }

      setPrivateWagePreview(result.parameters);
      setImportStep("preview");
      toast.success("Private wage file preview loaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to preview file";
      setErrors([message]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const previewPrevailingWage = async (file: File) => {
    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await uploadPrevailingWageMutation.mutateAsync({
        fileName: file.name,
        fileData: arrayBufferToBase64(arrayBuffer),
      });

      if (result.errors && result.errors.length > 0) {
        setErrors(result.errors);
        return;
      }

      setPrevailingWagePreview(result.rates);
      setImportStep("preview");
      toast.success("Prevailing wage file preview loaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to preview file";
      setErrors([message]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setIsLoading(true);
    try {
      const paramsToSend = privateWagePreview ? { ...privateWagePreview } : {};
      delete (paramsToSend as any).crewSizeScenarios;
      
      await confirmImportMutation.mutateAsync({
        hasPrivateWage: !!privateWageFile,
        hasPrevailingWage: !!prevailingWageFile,
        parametersJson: Object.keys(paramsToSend).length > 0 ? JSON.stringify(paramsToSend) : undefined,
      });

      setImportStep("complete");
      toast.success("Parameters imported successfully!");

      // Reset after 2 seconds and redirect to Bids
      setTimeout(() => {
        setPrivateWageFile(null);
        setPrevailingWageFile(null);
        setPrivateWagePreview(null);
        setPrevailingWagePreview([]);
        setImportStep("select");
        window.location.href = '/bids';
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import parameters";
      setErrors([message]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Import Bid Parameters</h1>
          <p className="text-muted-foreground">
            Upload your pricing spreadsheets to populate the bid calculation engine
          </p>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {importStep === "select" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Private Wage Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Private Wage Rates
                </CardTitle>
                <CardDescription>
                  Upload MASTERCOPY_PRIVATE.xlsx with your standard wage rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {privateWageFile ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{privateWageFile.name}</p>
                        <p className="text-xs text-muted-foreground">Ready to import</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => privateWageFileRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium mb-1">Click to upload</p>
                      <p className="text-sm text-muted-foreground">or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-2">.xlsx files only</p>
                    </div>
                  )}

                  <input
                    ref={privateWageFileRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handlePrivateWageFileSelect}
                    className="hidden"
                  />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => privateWageFileRef.current?.click()}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {privateWageFile ? "Change File" : "Select File"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Prevailing Wage Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Prevailing Wage Rates
                </CardTitle>
                <CardDescription>
                  Upload MASTERCOPY_PW.xlsx with jurisdiction-specific wage rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {prevailingWageFile ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{prevailingWageFile.name}</p>
                        <p className="text-xs text-muted-foreground">Ready to import</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => prevailingWageFileRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium mb-1">Click to upload</p>
                      <p className="text-sm text-muted-foreground">or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-2">.xlsx files only</p>
                    </div>
                  )}

                  <input
                    ref={prevailingWageFileRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handlePrevailingWageFileSelect}
                    className="hidden"
                  />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => prevailingWageFileRef.current?.click()}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {prevailingWageFile ? "Change File" : "Select File"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {importStep === "preview" && (
          <div className="space-y-6">
            <Tabs defaultValue="private" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="private">Private Wages</TabsTrigger>
                <TabsTrigger value="prevailing">Prevailing Wages</TabsTrigger>
              </TabsList>

              <TabsContent value="private" className="space-y-4">
                {privateWagePreview && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Private Wage Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Company Name</p>
                          <p className="font-medium">{privateWagePreview.companyName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Base Location</p>
                          <p className="font-medium">{privateWagePreview.baseLocation}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Hourly Rate</p>
                          <p className="font-medium">${(privateWagePreview.privateWageHourly / 100).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Work Day Hours</p>
                          <p className="font-medium">{privateWagePreview.workDayHours}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Waxing Cost Per Sqft</p>
                          <p className="font-medium">${(privateWagePreview.waxingCostPerSqft / 100).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Carpet Cost Per Sqft</p>
                          <p className="font-medium">${(privateWagePreview.carpetCostPerSqft / 100).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Window Base Price</p>
                          <p className="font-medium">${(privateWagePreview.windowBasePricePerWindow / 100).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Travel Cost Per Person/Hour</p>
                          <p className="font-medium">${(privateWagePreview.travelCostPerMile / 100).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="prevailing" className="space-y-4">
                {prevailingWagePreview.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Prevailing Wage Rates ({prevailingWagePreview.length} jurisdictions)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {prevailingWagePreview.map((rate, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 border rounded">
                            <div>
                              <p className="font-medium text-sm">{rate.jurisdiction}</p>
                              <p className="text-xs text-muted-foreground">{rate.state}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">${rate.wagePerHour.toFixed(2)}/hr</p>
                              <p className="text-xs text-muted-foreground">Fringe: ${rate.fringePerHour.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setImportStep("select")}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Confirm Import
              </Button>
            </div>
          </div>
        )}

        {importStep === "complete" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
                <div>
                  <h3 className="font-semibold text-lg">Import Successful!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your bid parameters have been imported and are ready to use.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
