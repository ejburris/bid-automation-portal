import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { calculateBid, getPricingDefaults, type WageType } from '@/lib/sharedBidPricing';
import { formatUsd } from '@/lib/pricingSnapshot';

interface ServicesConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ServicesConfig) => void;
  initialConfig?: ServicesConfig;
  isPrivateWage: boolean;
}

export interface ServicesConfig {
  waxingSqft: number;
  carpetSqft: number;
  windowCount: number;
  floorCount: number;
  windowsByFloor: { floor: number; count: number }[];
  exteriorWindows?: boolean;
  aerialLiftEnabled?: boolean;
  aerialLiftCost?: number;
  pressureWashingCost?: number;
  pressureWashingEnabled?: boolean;
}

export function ServicesConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  isPrivateWage,
}: ServicesConfigModalProps) {
  const [waxingSqft, setWaxingSqft] = useState(initialConfig?.waxingSqft || 0);
  const [carpetSqft, setCarpetSqft] = useState(initialConfig?.carpetSqft || 0);
  const [floorCount, setFloorCount] = useState(initialConfig?.floorCount || 1);
  const [windowsByFloor, setWindowsByFloor] = useState<{ floor: number; count: number }[]>(
    initialConfig?.windowsByFloor || [{ floor: 1, count: 0 }],
  );
  const wageType: WageType = isPrivateWage ? 'private' : 'prevailing';
  const pricingDefaults = useMemo(() => getPricingDefaults(wageType), [wageType]);
  const [exteriorWindows, setExteriorWindows] = useState(initialConfig?.exteriorWindows ?? true);
  const [aerialLiftEnabled, setAerialLiftEnabled] = useState(initialConfig?.aerialLiftEnabled === true);
  const [aerialLiftCost, setAerialLiftCost] = useState(initialConfig?.aerialLiftCost || pricingDefaults.lift);
  const [pressureWashingEnabled, setPressureWashingEnabled] = useState(initialConfig?.pressureWashingEnabled === true);
  const [pressureWashingCost, setPressureWashingCost] = useState(
    initialConfig?.pressureWashingCost || pricingDefaults.pressure,
  );

  const totalWindows = windowsByFloor.reduce((sum, windowFloor) => sum + windowFloor.count, 0);
  const pricingPreview = calculateBid({
    sqft: 0,
    waxSqft: waxingSqft,
    carpetSqft,
    windowCount: totalWindows,
    windowFloor: floorCount,
    exteriorWindows,
    useLift: aerialLiftEnabled,
    liftCost: aerialLiftCost,
    usePressure: pressureWashingEnabled,
    pressureCost: pressureWashingCost,
    wageType,
  });

  const waxingCost = pricingPreview.wax;
  const carpetCost = pricingPreview.carpet;
  const windowCost = pricingPreview.windows;
  const liftCost = pricingPreview.lift;
  const pressureCost = pricingPreview.pressure;
  const totalCost = pricingPreview.total;

  useEffect(() => {
    if (!initialConfig?.pressureWashingCost) {
      setPressureWashingCost(pricingDefaults.pressure);
    }
    if (!initialConfig?.aerialLiftCost) {
      setAerialLiftCost(pricingDefaults.lift);
    }
  }, [initialConfig?.aerialLiftCost, initialConfig?.pressureWashingCost, pricingDefaults.lift, pricingDefaults.pressure]);

  const handleFloorCountChange = (newCount: number) => {
    setFloorCount(newCount);
    if (newCount > windowsByFloor.length) {
      const newFloors = [...windowsByFloor];
      for (let floor = windowsByFloor.length + 1; floor <= newCount; floor++) {
        newFloors.push({ floor, count: 0 });
      }
      setWindowsByFloor(newFloors);
      return;
    }
    if (newCount < windowsByFloor.length) {
      setWindowsByFloor(windowsByFloor.slice(0, newCount));
    }
  };

  const handleWindowCountChange = (floor: number, count: number) => {
    setWindowsByFloor(
      windowsByFloor.map((windowFloor) =>
        windowFloor.floor === floor ? { ...windowFloor, count: Math.max(0, count) } : windowFloor,
      ),
    );
  };

  const handleSave = () => {
    onSave({
      waxingSqft: Math.max(0, waxingSqft),
      carpetSqft: Math.max(0, carpetSqft),
      windowCount: totalWindows,
      floorCount,
      windowsByFloor,
      exteriorWindows,
      aerialLiftEnabled,
      aerialLiftCost: Math.max(0, aerialLiftCost),
      pressureWashingCost: Math.max(0, pressureWashingCost),
      pressureWashingEnabled,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Additional Services</DialogTitle>
          <DialogDescription>
            Set up waxing, carpet, window cleaning, pressure washing, and aerial lift details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Waxing</CardTitle>
              <CardDescription>Calculated by the shared pricing engine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="waxingSqft">Square Footage to Wax</Label>
              <Input
                id="waxingSqft"
                type="number"
                min="0"
                value={waxingSqft}
                onChange={(event) => setWaxingSqft(Math.max(0, Number(event.target.value) || 0))}
                placeholder="0"
              />
              <div className="text-sm text-muted-foreground">Cost: {formatUsd(waxingCost)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Carpet</CardTitle>
              <CardDescription>Calculated by the shared pricing engine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="carpetSqft">Square Footage to Clean</Label>
              <Input
                id="carpetSqft"
                type="number"
                min="0"
                value={carpetSqft}
                onChange={(event) => setCarpetSqft(Math.max(0, Number(event.target.value) || 0))}
                placeholder="0"
              />
              <div className="text-sm text-muted-foreground">Cost: {formatUsd(carpetCost)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Windows</CardTitle>
              <CardDescription>Calculated from window count, floor, and wage type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="floorCount">Number of Floors</Label>
                <Input
                  id="floorCount"
                  type="number"
                  min="1"
                  max="20"
                  value={floorCount}
                  onChange={(event) => handleFloorCountChange(Math.max(1, Number(event.target.value) || 1))}
                />
                <div className="text-sm text-muted-foreground">Floor is passed to the shared pricing engine as windowFloor.</div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={exteriorWindows}
                  onCheckedChange={(checked) => setExteriorWindows(checked === true)}
                />
                Exterior windows
              </label>

              <div className="space-y-3">
                <Label>Windows per Floor</Label>
                {windowsByFloor.map((windowFloor) => (
                  <div key={windowFloor.floor} className="flex items-center gap-3">
                    <span className="min-w-20 text-sm font-medium">Floor {windowFloor.floor}:</span>
                    <Input
                      type="number"
                      min="0"
                      value={windowFloor.count}
                      onChange={(event) => handleWindowCountChange(windowFloor.floor, Number(event.target.value) || 0)}
                      placeholder="0"
                      className="max-w-24"
                    />
                    <span className="text-sm text-muted-foreground">windows</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-md bg-muted p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Window Cost:</span>
                    <span>{formatUsd(windowCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aerial Lift Rental:</span>
                    <span>{formatUsd(liftCost)} (manual)</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>Window Total:</span>
                    <span>{formatUsd(windowCost + liftCost)}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={aerialLiftEnabled}
                      onChange={(event) => setAerialLiftEnabled(event.target.checked)}
                    />
                    Aerial Lift ON / OFF
                  </label>
                  <Label htmlFor="aerialLiftCost">Aerial Lift Cost</Label>
                  <Input
                    id="aerialLiftCost"
                    type="number"
                    min="0"
                    step="50"
                    value={aerialLiftCost}
                    onChange={(event) => setAerialLiftCost(Math.max(0, Number(event.target.value) || pricingDefaults.lift))}
                    placeholder={String(pricingDefaults.lift)}
                    disabled={!aerialLiftEnabled}
                  />
                  <div className="text-xs text-muted-foreground">Default comes from the shared pricing engine. If OFF, aerial lift pricing is $0.</div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={pressureWashingEnabled}
                      onChange={(event) => setPressureWashingEnabled(event.target.checked)}
                    />
                    Include Pressure Washing
                  </label>
                  <Label htmlFor="pressureWashingCost">Pressure Washing</Label>
                  <Input
                    id="pressureWashingCost"
                    type="number"
                    min="0"
                    value={pressureWashingCost}
                    onChange={(event) => setPressureWashingCost(Math.max(0, Number(event.target.value) || 0))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: {formatUsd(pricingDefaults.pressure)} for the selected wage type.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Service Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Waxing:</span>
                  <span>{formatUsd(waxingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Carpet:</span>
                  <span>{formatUsd(carpetCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Windows:</span>
                  <span>{formatUsd(windowCost + liftCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pressure Washing:</span>
                  <span>{formatUsd(pressureCost)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total:</span>
                  <span>{formatUsd(totalCost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
