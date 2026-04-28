import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Plus, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from 'wouter';

interface PrivateWageForm {
  companyName: string;
  baseLocation: string;
  privateWageHourly: string; // in dollars
  workDayHours: string;
  waxingCostPerSqft: string;
  carpetCostPerSqft: string;
  windowBasePricePerWindow: string;
  travelCostPerMile: string;
  hotelCostPerNight: string;
  perDiem: string;
  additionalCostPercentage: string;
}

interface PrevailingWageForm {
  jurisdiction: string;
  state: string;
  effectiveDate: string;
  wagePerHour: string;
  fringePerHour: string;
  minimumBid: string;
}

interface PrevailingWageRow extends PrevailingWageForm {
  id?: string;
}

export default function ParametersSetup() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('private');
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Private wage form state
  const [privateWage, setPrivateWage] = useState<PrivateWageForm>({
    companyName: 'Clean World Maintenance',
    baseLocation: '19312 NE 58th St.',
    privateWageHourly: '39.50',
    workDayHours: '9',
    waxingCostPerSqft: '0.47',
    carpetCostPerSqft: '0.13',
    windowBasePricePerWindow: '12.50',
    travelCostPerMile: '38.00',
    hotelCostPerNight: '100.00',
    perDiem: '50.00',
    additionalCostPercentage: '6',
  });

  // Prevailing wage form state
  const [prevailingWages, setPrevailingWages] = useState<PrevailingWageRow[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newPrevailingWage, setNewPrevailingWage] = useState<PrevailingWageForm>({
    jurisdiction: '',
    state: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    wagePerHour: '',
    fringePerHour: '',
    minimumBid: '',
  });

  const saveParametersMutation = trpc.parameters.save.useMutation();
  const savePrevailingWagesMutation = trpc.prevailingWages.saveMultiple.useMutation();

  const validatePrivateWage = (): boolean => {
    const newErrors: string[] = [];

    if (!privateWage.companyName.trim()) {
      newErrors.push('Company name is required');
    }
    if (!privateWage.baseLocation.trim()) {
      newErrors.push('Base location is required');
    }
    if (!privateWage.privateWageHourly || parseFloat(privateWage.privateWageHourly) <= 0) {
      newErrors.push('Private wage hourly rate must be greater than 0');
    }
    if (!privateWage.workDayHours || parseFloat(privateWage.workDayHours) <= 0) {
      newErrors.push('Work day hours must be greater than 0');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const validatePrevailingWage = (wage: PrevailingWageForm): boolean => {
    const newErrors: string[] = [];

    if (!wage.jurisdiction.trim()) {
      newErrors.push('Jurisdiction is required');
    }
    if (!wage.state.trim() || wage.state.length !== 2) {
      newErrors.push('State code must be 2 characters (e.g., OR, WA)');
    }
    if (!wage.effectiveDate) {
      newErrors.push('Effective date is required');
    }
    if (!wage.wagePerHour || parseFloat(wage.wagePerHour) <= 0) {
      newErrors.push('Wage per hour must be greater than 0');
    }
    if (!wage.fringePerHour || parseFloat(wage.fringePerHour) < 0) {
      newErrors.push('Fringe per hour cannot be negative');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handlePrivateWageChange = (field: keyof PrivateWageForm, value: string) => {
    setPrivateWage(prev => ({ ...prev, [field]: value }));
  };

  const handlePrevailingWageChange = (field: keyof PrevailingWageForm, value: string) => {
    setNewPrevailingWage(prev => ({ ...prev, [field]: value }));
  };

  const addPrevailingWage = () => {
    if (!validatePrevailingWage(newPrevailingWage)) return;

    setPrevailingWages(prev => [...prev, { ...newPrevailingWage, id: Date.now().toString() }]);
    setNewPrevailingWage({
      jurisdiction: '',
      state: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      wagePerHour: '',
      fringePerHour: '',
      minimumBid: '',
    });
    setErrors([]);
    toast.success('Prevailing wage rate added');
  };

  const removePrevailingWage = (index: number) => {
    setPrevailingWages(prev => prev.filter((_, i) => i !== index));
    toast.success('Prevailing wage rate removed');
  };

  const handleSaveAll = async () => {
    if (!validatePrivateWage()) return;

    setIsLoading(true);
    try {
      // Convert dollar amounts to cents for storage
      const privateWageParams = {
        companyName: privateWage.companyName,
        baseLocation: privateWage.baseLocation,
        privateWageHourly: Math.round(parseFloat(privateWage.privateWageHourly) * 100),
        workDayHours: parseInt(privateWage.workDayHours),
        waxingCostPerSqft: Math.round(parseFloat(privateWage.waxingCostPerSqft) * 100),
        carpetCostPerSqft: Math.round(parseFloat(privateWage.carpetCostPerSqft) * 100),
        windowBasePricePerWindow: Math.round(parseFloat(privateWage.windowBasePricePerWindow) * 100),
        travelCostPerMile: Math.round(parseFloat(privateWage.travelCostPerMile) * 100),
        hotelCostPerNight: Math.round(parseFloat(privateWage.hotelCostPerNight) * 100),
        perDiem: Math.round(parseFloat(privateWage.perDiem) * 100),
        additionalCostPercentage: parseInt(privateWage.additionalCostPercentage),
      };

      // Try to save to database, but fall back to localStorage if it fails
      try {
        await saveParametersMutation.mutateAsync(privateWageParams);
      } catch (dbError) {
        console.warn('Database save failed, using localStorage:', dbError);
        localStorage.setItem('bidParameters', JSON.stringify(privateWageParams));
        toast.info('Parameters saved locally (database temporarily unavailable)');
      }

      // Save prevailing wages if any
      if (prevailingWages.length > 0) {
        const prevailingWageParams = prevailingWages.map(wage => ({
          jurisdiction: wage.jurisdiction,
          state: wage.state,
          effectiveDate: new Date(wage.effectiveDate),
          wagePerHour: Math.round(parseFloat(wage.wagePerHour) * 100),
          fringePerHour: Math.round(parseFloat(wage.fringePerHour) * 100),
          minimumBid: wage.minimumBid ? Math.round(parseFloat(wage.minimumBid) * 100) : 0,
        }));

        await savePrevailingWagesMutation.mutateAsync(prevailingWageParams);
      }

      toast.success('Parameters saved successfully!');
      setTimeout(() => {
        navigate('/bids');
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save parameters';
      setErrors([message]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Setup Bid Parameters</h1>
          <p className="text-muted-foreground">
            Enter your pricing and wage rates to configure the bid calculation engine
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="private">Private Wage Parameters</TabsTrigger>
            <TabsTrigger value="prevailing">Prevailing Wage Rates</TabsTrigger>
          </TabsList>

          {/* Private Wage Tab */}
          <TabsContent value="private" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company & Location</CardTitle>
                <CardDescription>Basic company information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={privateWage.companyName}
                      onChange={(e) => handlePrivateWageChange('companyName', e.target.value)}
                      placeholder="Clean World Maintenance"
                    />
                  </div>
                  <div>
                    <Label htmlFor="baseLocation">Base Location</Label>
                    <Input
                      id="baseLocation"
                      value={privateWage.baseLocation}
                      onChange={(e) => handlePrivateWageChange('baseLocation', e.target.value)}
                      placeholder="19312 NE 58th St."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Wage & Hours</CardTitle>
                <CardDescription>Hourly rates and work schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="privateWageHourly">Private Wage Hourly Rate ($)</Label>
                    <Input
                      id="privateWageHourly"
                      type="number"
                      step="0.01"
                      value={privateWage.privateWageHourly}
                      onChange={(e) => handlePrivateWageChange('privateWageHourly', e.target.value)}
                      placeholder="39.50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workDayHours">Work Day Hours</Label>
                    <Input
                      id="workDayHours"
                      type="number"
                      value={privateWage.workDayHours}
                      onChange={(e) => handlePrivateWageChange('workDayHours', e.target.value)}
                      placeholder="9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing per Square Foot</CardTitle>
                <CardDescription>Base cleaning and add-on services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="waxingCostPerSqft">Waxing Cost per Sqft ($)</Label>
                    <Input
                      id="waxingCostPerSqft"
                      type="number"
                      step="0.01"
                      value={privateWage.waxingCostPerSqft}
                      onChange={(e) => handlePrivateWageChange('waxingCostPerSqft', e.target.value)}
                      placeholder="0.47"
                    />
                  </div>
                  <div>
                    <Label htmlFor="carpetCostPerSqft">Carpet Cost per Sqft ($)</Label>
                    <Input
                      id="carpetCostPerSqft"
                      type="number"
                      step="0.01"
                      value={privateWage.carpetCostPerSqft}
                      onChange={(e) => handlePrivateWageChange('carpetCostPerSqft', e.target.value)}
                      placeholder="0.13"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Window & Travel Costs</CardTitle>
                <CardDescription>Per-unit and per-mile pricing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="windowBasePricePerWindow">Window Base Price per Window ($)</Label>
                    <Input
                      id="windowBasePricePerWindow"
                      type="number"
                      step="0.01"
                      value={privateWage.windowBasePricePerWindow}
                      onChange={(e) => handlePrivateWageChange('windowBasePricePerWindow', e.target.value)}
                      placeholder="12.50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="travelCostPerMile">Travel Cost per Mile ($)</Label>
                    <Input
                      id="travelCostPerMile"
                      type="number"
                      step="0.01"
                      value={privateWage.travelCostPerMile}
                      onChange={(e) => handlePrivateWageChange('travelCostPerMile', e.target.value)}
                      placeholder="38.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Travel Expenses</CardTitle>
                <CardDescription>Hotel and per diem for overnight travel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hotelCostPerNight">Hotel Cost per Night ($)</Label>
                    <Input
                      id="hotelCostPerNight"
                      type="number"
                      step="0.01"
                      value={privateWage.hotelCostPerNight}
                      onChange={(e) => handlePrivateWageChange('hotelCostPerNight', e.target.value)}
                      placeholder="100.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="perDiem">Per Diem per Day ($)</Label>
                    <Input
                      id="perDiem"
                      type="number"
                      step="0.01"
                      value={privateWage.perDiem}
                      onChange={(e) => handlePrivateWageChange('perDiem', e.target.value)}
                      placeholder="50.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Costs</CardTitle>
                <CardDescription>Markup percentage for overhead and profit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="additionalCostPercentage">Additional Cost Percentage (%)</Label>
                    <Input
                      id="additionalCostPercentage"
                      type="number"
                      value={privateWage.additionalCostPercentage}
                      onChange={(e) => handlePrivateWageChange('additionalCostPercentage', e.target.value)}
                      placeholder="6"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prevailing Wage Tab */}
          <TabsContent value="prevailing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Prevailing Wage Rate</CardTitle>
                <CardDescription>Add jurisdiction-specific prevailing wage rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Input
                      id="jurisdiction"
                      value={newPrevailingWage.jurisdiction}
                      onChange={(e) => handlePrevailingWageChange('jurisdiction', e.target.value)}
                      placeholder="e.g., Multnomah County"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State Code</Label>
                    <Input
                      id="state"
                      value={newPrevailingWage.state}
                      onChange={(e) => handlePrevailingWageChange('state', e.target.value.toUpperCase())}
                      placeholder="OR or WA"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="effectiveDate">Effective Date</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      value={newPrevailingWage.effectiveDate}
                      onChange={(e) => handlePrevailingWageChange('effectiveDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="wagePerHour">Wage per Hour ($)</Label>
                    <Input
                      id="wagePerHour"
                      type="number"
                      step="0.01"
                      value={newPrevailingWage.wagePerHour}
                      onChange={(e) => handlePrevailingWageChange('wagePerHour', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fringePerHour">Fringe per Hour ($)</Label>
                    <Input
                      id="fringePerHour"
                      type="number"
                      step="0.01"
                      value={newPrevailingWage.fringePerHour}
                      onChange={(e) => handlePrevailingWageChange('fringePerHour', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minimumBid">Minimum Bid ($)</Label>
                    <Input
                      id="minimumBid"
                      type="number"
                      step="0.01"
                      value={newPrevailingWage.minimumBid}
                      onChange={(e) => handlePrevailingWageChange('minimumBid', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <Button onClick={addPrevailingWage} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Prevailing Wage Rate
                </Button>
              </CardContent>
            </Card>

            {prevailingWages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Prevailing Wage Rates</CardTitle>
                  <CardDescription>{prevailingWages.length} rate(s) configured</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jurisdiction</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Effective Date</TableHead>
                          <TableHead>Wage/hr</TableHead>
                          <TableHead>Fringe/hr</TableHead>
                          <TableHead>Min Bid</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prevailingWages.map((wage, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{wage.jurisdiction}</TableCell>
                            <TableCell>{wage.state}</TableCell>
                            <TableCell>{wage.effectiveDate}</TableCell>
                            <TableCell>${parseFloat(wage.wagePerHour).toFixed(2)}</TableCell>
                            <TableCell>${parseFloat(wage.fringePerHour).toFixed(2)}</TableCell>
                            <TableCell>${parseFloat(wage.minimumBid || '0').toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePrevailingWage(idx)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex gap-4">
          <Button
            onClick={handleSaveAll}
            disabled={isLoading}
            size="lg"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save All Parameters
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
