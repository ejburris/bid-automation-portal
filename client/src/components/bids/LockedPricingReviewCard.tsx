import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatUsd, type LockedPricingSnapshot } from '@/lib/pricingSnapshot';
import {
  DEFAULT_REALITY_ESTIMATION_CONFIG,
  calculateRealityEstimation,
  formatRealityNumber,
  type RealityEstimationConfig,
} from '@/lib/realityEstimation';
import { Calculator, Truck, Sparkles, Building2, Users } from 'lucide-react';

function LineItem({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className={muted ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
      <span className="font-medium">{formatUsd(value)}</span>
    </div>
  );
}

export function LockedPricingReviewCard({
  snapshot,
  title = 'Locked Pricing Review',
  description = 'Shared pricing snapshot used by the bid workflow.',
  realityConfig = DEFAULT_REALITY_ESTIMATION_CONFIG,
  onRealityConfigChange,
  showRealityEstimation = true,
}: {
  snapshot: LockedPricingSnapshot;
  title?: string;
  description?: string;
  realityConfig?: RealityEstimationConfig;
  onRealityConfigChange?: (config: RealityEstimationConfig) => void;
  showRealityEstimation?: boolean;
}) {
  const reality = calculateRealityEstimation(snapshot, realityConfig);
  const updateRealityConfig = (field: keyof RealityEstimationConfig, value: string) => {
    if (!onRealityConfigChange) return;
    onRealityConfigChange({
      ...realityConfig,
      [field]: Number(value),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{snapshot.wageType === 'private' ? 'Private Wage' : 'Prevailing Wage'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Square Footage</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.base.projectSqft.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Crew Days</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.crewDays}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Crew Size</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.crewPeople}</div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 font-medium"><Building2 className="h-4 w-4" /> Base Cleaning</div>
            <LineItem label="Base Cleaning" value={snapshot.base.crewCost} />
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 font-medium"><Truck className="h-4 w-4" /> Travel</div>
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">Distance</span>
              <span className="font-medium">{snapshot.base.travelDistance} mi</span>
            </div>
            <LineItem label="Travel cost" value={snapshot.base.travelCost} />
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4" /> Service Add-ons</div>
          <LineItem label={`Wax (${snapshot.services.waxingSqft.toLocaleString()} sqft)`} value={snapshot.services.waxingCost} muted={snapshot.services.waxingSqft === 0} />
          <LineItem label={`Carpet (${snapshot.services.carpetSqft.toLocaleString()} sqft)`} value={snapshot.services.carpetCost} muted={snapshot.services.carpetSqft === 0} />
          <LineItem label={`Windows (${snapshot.services.windowCount})`} value={snapshot.services.windowCost} muted={snapshot.services.windowCount === 0} />
          <LineItem label={`Aerial Lift${snapshot.services.floorCount > 1 ? ` (${snapshot.services.floorCount} floors)` : ''}`} value={snapshot.services.aerialLiftCost} muted={!snapshot.services.needsAerialLift} />
          <LineItem label="Pressure Washing" value={snapshot.services.pressureWashingCost} muted={!snapshot.services.pressureWashingCost} />
          <Separator className="my-2" />
          <LineItem label="Total" value={snapshot.totals.total} />
        </div>

        {showRealityEstimation && (
        <div className="rounded-lg border p-4">
          <div className="mb-3 flex items-center gap-2 font-medium"><Users className="h-4 w-4" /> Reality Estimation</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Base Cleaning Cost</div>
              <div className="mt-1 text-lg font-semibold">{formatUsd(reality.baseCleaningCost)}</div>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Add-on Costs</div>
              <div className="mt-1 text-lg font-semibold">{formatUsd(reality.addOnCosts)}</div>
            </div>
            <div className="rounded-md bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Workers Needed</div>
              <div className="mt-1 text-lg font-semibold">{reality.workersNeeded}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="realityCostPerManHour">Cost Per Man Hour</Label>
              <Input
                id="realityCostPerManHour"
                type="number"
                min="0.01"
                step="0.01"
                value={snapshot.wageType === 'private' ? realityConfig.privateCostPerManHour : realityConfig.prevailingCostPerManHour}
                onChange={(event) => updateRealityConfig(
                  snapshot.wageType === 'private' ? 'privateCostPerManHour' : 'prevailingCostPerManHour',
                  event.target.value,
                )}
                disabled={!onRealityConfigChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="realityWorkDayHours">Work Day Hours</Label>
              <Input
                id="realityWorkDayHours"
                type="number"
                min="0.5"
                step="0.5"
                value={realityConfig.workDayHours}
                onChange={(event) => updateRealityConfig('workDayHours', event.target.value)}
                disabled={!onRealityConfigChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="realityDesiredProjectDays">Desired Days</Label>
              <Input
                id="realityDesiredProjectDays"
                type="number"
                min="0.5"
                step="0.5"
                value={realityConfig.desiredProjectDays}
                onChange={(event) => updateRealityConfig('desiredProjectDays', event.target.value)}
                disabled={!onRealityConfigChange}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Total worker-days</span>
              <span className="font-medium">{formatRealityNumber(reality.totalWorkerDays)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Total labor hours</span>
              <span className="font-medium">{formatRealityNumber(reality.totalLaborHours)} hrs</span>
            </div>
          </div>
        </div>
        )}

        <div className="rounded-lg bg-muted/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Locked total</span>
            <span className="text-2xl font-bold">{formatUsd(snapshot.totals.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
