import { BidParameter, PrevailingWageRate } from "../drizzle/schema";

export interface PricingInput {
  squareFootage: number;
  wageType: "private" | "prevailing";

  waxSquareFootage?: number;
  carpetSquareFootage?: number;

  windowPieces?: number;
  windowFloor?: 1 | 2 | 3 | 4;
  exteriorWindows?: boolean;

  useAerialLift?: boolean;
  aerialLiftCost?: number;

  usePressureWashing?: boolean;
  pressureWashingCost?: number;

  travelCost?: number;

  parameters: BidParameter;
  prevailingRate?: PrevailingWageRate;
}

export interface PricingBreakdown {
  cleaningCost: number;
  windowWashingCost: number;
  waxingCost: number;
  carpetCleaningCost: number;
  aerialLiftCost: number;
  pressureWashingCost: number;
  travelCost: number;
  subtotal: number;
  additionalCosts: number;
  total: number;
  breakdown: {
    baseRatePerSqft: number;
    waxRatePerSqft: number;
    carpetRatePerSqft: number;
    windowRatePerPiece: number;
  };
}

function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

function calculateWindowRate(
  wageType: "private" | "prevailing",
  floor: number = 1,
  exteriorWindows: boolean = false
): number {
  if (wageType === "prevailing") {
    if (!exteriorWindows) return 28.5;
    if (floor === 2) return 35;
    if (floor === 3) return 39;
    if (floor === 4) return 45;
    return 28.5;
  }

  if (!exteriorWindows) return 12.5;
  if (floor === 2) return 16;
  if (floor === 3) return 18;
  if (floor === 4) return 25;
  return 12.5;
}

export function calculateBidPrice(input: PricingInput): PricingBreakdown {
  const isPrevailing = input.wageType === "prevailing";

  // Base final clean
  const baseRate = isPrevailing ? 0.59 : 0.27;
  const cleaningCost = dollarsToCents(input.squareFootage * baseRate);

  // Waxing
  const waxSqft = input.waxSquareFootage || 0;
  const waxRate = isPrevailing ? 0.81 : 0.27;
  const waxMinimum = isPrevailing ? 940 : 305;
  const waxingCost =
    waxSqft > 0 ? dollarsToCents(Math.max(waxSqft * waxRate, waxMinimum)) : 0;

  // Carpet
  const carpetSqft = input.carpetSquareFootage || 0;
  const carpetRate = isPrevailing ? 0.81 : 0.13;
  const carpetMinimum = isPrevailing ? 940 : 305;
  const carpetCleaningCost =
    carpetSqft > 0 ? dollarsToCents(Math.max(carpetSqft * carpetRate, carpetMinimum)) : 0;

  // Windows
  const windowPieces = input.windowPieces || 0;
  const windowRate = calculateWindowRate(
    input.wageType,
    input.windowFloor || 1,
    input.exteriorWindows || false
  );
  const windowWashingCost = dollarsToCents(windowPieces * windowRate);

  // Aerial lift
  const aerialLiftCost = input.useAerialLift
    ? dollarsToCents(input.aerialLiftCost || 850)
    : 0;

  // Pressure washing
  const pressureWashingCost = input.usePressureWashing
    ? dollarsToCents(input.pressureWashingCost || (isPrevailing ? 1881 : 702))
    : 0;

  // Travel stays manual for now
  const travelCost = input.travelCost || 0;

  const subtotal =
    cleaningCost +
    waxingCost +
    carpetCleaningCost +
    windowWashingCost +
    aerialLiftCost +
    pressureWashingCost +
    travelCost;

  const additionalCosts = 0;
  const total = subtotal + additionalCosts;

  return {
    cleaningCost,
    windowWashingCost,
    waxingCost,
    carpetCleaningCost,
    aerialLiftCost,
    pressureWashingCost,
    travelCost,
    subtotal,
    additionalCosts,
    total,
    breakdown: {
      baseRatePerSqft: baseRate,
      waxRatePerSqft: waxRate,
      carpetRatePerSqft: carpetRate,
      windowRatePerPiece: windowRate,
    },
  };
}

export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function getMinimumBid(prevailingRate: PrevailingWageRate | null): number {
  if (prevailingRate?.minimumBid) {
    return prevailingRate.minimumBid;
  }
  return 0;
}