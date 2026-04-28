/**
 * Service Pricing Calculator
 * Handles pricing for waxing, carpet, windows, and explicit aerial lift flat fee
 */

export interface ServicePricingParams {
  waxingSqft?: number; // Square footage to be waxed
  carpetSqft?: number; // Square footage to be carpeted
  windowCount?: number; // Total number of windows
  floorCount?: number; // Number of floors, informational only
  aerialLiftEnabled?: boolean; // Explicit aerial lift toggle
  isPrivateWage: boolean; // true = private wage, false = prevailing wage
  aerialLiftCost?: number; // Aerial lift rental cost in dollars (default $850, configurable)
  pressureWashingEnabled?: boolean;
  pressureWashingCost?: number;
}

export interface ServicePricingResult {
  waxingCost: number; // in cents
  carpetCost: number; // in cents
  windowCost: number; // in cents (base, without aerial lift)
  aerialLiftCost: number; // in cents (flat fee for project)
  pressureWashingCost: number; // in cents
  totalServiceCost: number; // in cents (sum of all services)
  breakdown: {
    waxingSqft: number;
    waxingPricePerSqft: number;
    carpetSqft: number;
    carpetPricePerSqft: number;
    windowCount: number;
    windowPricePerUnit: number;
    floorCount: number;
    needsAerialLift: boolean;
    aerialLiftFlatFee: number; // $850 default, configurable
    pressureWashingEnabled: boolean;
  };
}

// Pricing rates per square foot
const PRICING_RATES = {
  private: {
    waxing: 0.47, // $/sqft
    carpet: 0.13, // $/sqft
    windowBase: 15, // $/window (base price)
  },
  prevailing: {
    waxing: 1.5, // $/sqft
    carpet: 0.81, // $/sqft
    windowBase: 35, // $/window (base price)
  },
};

// Aerial lift flat fee (configurable per project)
const DEFAULT_AERIAL_LIFT_COST = 850; // $ per project
const DEFAULT_PRESSURE_WASHING_COST = {
  private: 702,
  prevailing: 1881,
};

/**
 * Calculate service pricing based on waxing sqft, carpet sqft, window count, and explicit aerial lift selection
 */
export function calculateServicePricing(params: ServicePricingParams): ServicePricingResult {
  const isPrivate = params.isPrivateWage;
  const rates = isPrivate ? PRICING_RATES.private : PRICING_RATES.prevailing;

  // Waxing cost
  const waxingSqft = params.waxingSqft || 0;
  const waxingCost = Math.round(waxingSqft * rates.waxing * 100); // Convert to cents

  // Carpet cost
  const carpetSqft = params.carpetSqft || 0;
  const carpetCost = Math.round(carpetSqft * rates.carpet * 100); // Convert to cents

  // Window cost and explicit aerial lift selection
  const windowCount = params.windowCount || 0;
  const floorCount = params.floorCount || 1;
  const needsAerialLift = params.aerialLiftEnabled === true;

  // Base window cost
  const windowCost = Math.round(windowCount * rates.windowBase * 100); // Convert to cents

  // Aerial lift cost: flat fee for the project (default $850, configurable)
  const aerialLiftCost = needsAerialLift
    ? Math.round((params.aerialLiftCost || DEFAULT_AERIAL_LIFT_COST) * 100) // Convert to cents
    : 0;

  const pressureWashingEnabled = params.pressureWashingEnabled === true;
  const pressureWashingDefault = isPrivate
    ? DEFAULT_PRESSURE_WASHING_COST.private
    : DEFAULT_PRESSURE_WASHING_COST.prevailing;
  const pressureWashingAmount = params.pressureWashingCost ?? pressureWashingDefault;
  const pressureWashingCost = pressureWashingEnabled
    ? Math.round(Math.max(0, pressureWashingAmount) * 100)
    : 0;

  // Total service cost
  const totalServiceCost = waxingCost + carpetCost + windowCost + aerialLiftCost + pressureWashingCost;

  return {
    waxingCost,
    carpetCost,
    windowCost,
    aerialLiftCost,
    pressureWashingCost,
    totalServiceCost,
    breakdown: {
      waxingSqft,
      waxingPricePerSqft: rates.waxing,
      carpetSqft,
      carpetPricePerSqft: rates.carpet,
      windowCount,
      windowPricePerUnit: rates.windowBase,
      floorCount,
      needsAerialLift,
      aerialLiftFlatFee: needsAerialLift ? (params.aerialLiftCost || DEFAULT_AERIAL_LIFT_COST) : 0,
      pressureWashingEnabled,
    },
  };
}

/**
 * Format service pricing result as human-readable string
 */
export function formatServicePricing(result: ServicePricingResult): string {
  const lines: string[] = [];

  if (result.breakdown.waxingSqft > 0) {
    lines.push(
      `Waxing: ${result.breakdown.waxingSqft} sqft × $${result.breakdown.waxingPricePerSqft.toFixed(2)}/sqft = $${(result.waxingCost / 100).toFixed(2)}`
    );
  }

  if (result.breakdown.carpetSqft > 0) {
    lines.push(
      `Carpet: ${result.breakdown.carpetSqft} sqft × $${result.breakdown.carpetPricePerSqft.toFixed(2)}/sqft = $${(result.carpetCost / 100).toFixed(2)}`
    );
  }

  if (result.breakdown.windowCount > 0) {
    lines.push(
      `Windows: ${result.breakdown.windowCount} windows × $${result.breakdown.windowPricePerUnit.toFixed(2)}/window = $${(result.windowCost / 100).toFixed(2)}`
    );

    if (result.breakdown.needsAerialLift) {
      lines.push(
        `Aerial Lift Rental: $${result.breakdown.aerialLiftFlatFee.toFixed(2)} (flat fee for project)`
      );
    }
  }

  if (result.breakdown.pressureWashingEnabled) {
    lines.push(`Pressure Washing: $${(result.pressureWashingCost / 100).toFixed(2)}`);
  }

  lines.push(`---`);
  lines.push(`Total Service Cost: $${(result.totalServiceCost / 100).toFixed(2)}`);

  return lines.join('\n');
}

/**
 * Get pricing rates for a given wage type
 */
export function getPricingRates(isPrivateWage: boolean) {
  return isPrivateWage ? PRICING_RATES.private : PRICING_RATES.prevailing;
}

/**
 * Aerial lift is no longer inferred from floor count.
 */
export function needsAerialLift(floorCount: number): boolean {
  return false;
}

/**
 * Get default aerial lift cost
 */
export function getDefaultAerialLiftCost(): number {
  return DEFAULT_AERIAL_LIFT_COST;
}
