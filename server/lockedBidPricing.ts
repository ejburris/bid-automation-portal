import { calculateBid, type BidInput } from "./core/pricing";

export type LockedBidPricingInput = {
  sqft?: number | null;
  projectSqft?: number | null;
  wageType?: BidInput["wageType"] | null;
  crewDays?: number | null;
  crewPeople?: number | null;
  isPrivateWage?: boolean | null;
  travelDistance?: number | null;
  travelCostOverride?: number | null;
  manualOverride?: number | null;
  waxSqft?: number | null;
  waxingSqft?: number | null;
  carpetSqft?: number | null;
  windowCount?: number | null;
  windowFloor?: number | null;
  floorCount?: number | null;
  exteriorWindows?: boolean | null;
  useLift?: boolean | null;
  aerialLiftEnabled?: boolean | null;
  liftCost?: number | null;
  aerialLiftCostOverride?: number | null;
  usePressure?: boolean | null;
  pressureWashingEnabled?: boolean | null;
  pressureCost?: number | null;
  pressureWashingCost?: number | null;
};

export type LockedBidPricingSnapshot = {
  crewDays: number;
  crewPeople: number;
  wageType: 'private' | 'prevailing';
  rates: {
    dailyRate: number;
    minimumPerDay: number;
    waxingPerSqft: number;
    carpetPerSqft: number;
    windowPerUnit: number;
    aerialLiftFlat: number;
  };
  base: {
    projectSqft: number;
    crewCost: number;
    travelDistance: number;
    travelCost: number;
  };
  services: {
    waxingSqft: number;
    waxingCost: number;
    carpetSqft: number;
    carpetCost: number;
    windowCount: number;
    windowCost: number;
    floorCount: number;
    needsAerialLift: boolean;
    aerialLiftCost: number;
    pressureWashingCost: number;
    additionalCosts: number;
  };
  totals: {
    subtotal: number;
    total: number;
  };
};

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateLockedBidPricing(input: LockedBidPricingInput): LockedBidPricingSnapshot {
  const projectSqft = Math.max(0, Number(input.sqft ?? input.projectSqft) || 0);
  const crewDays = Math.max(1, Number(input.crewDays) || 1);
  const crewPeople = Math.max(1, Number(input.crewPeople) || 1);
  const travelDistance = Math.max(0, Number(input.travelDistance) || 0);
  const waxingSqft = Math.max(0, Number(input.waxSqft ?? input.waxingSqft) || 0);
  const carpetSqft = Math.max(0, Number(input.carpetSqft) || 0);
  const windowCount = Math.max(0, Number(input.windowCount) || 0);
  const windowFloor = Math.max(1, Number(input.windowFloor ?? input.floorCount) || 1);
  const floorCount = Math.max(1, Number(input.floorCount ?? windowFloor) || 1);

  const wageType = input.wageType ?? (input.isPrivateWage === false ? "prevailing" : "private");
  const useLift = input.useLift ?? input.aerialLiftEnabled === true;
  const liftCost = Number(input.liftCost ?? input.aerialLiftCostOverride) || undefined;
  const usePressure = input.usePressure ?? input.pressureWashingEnabled === true;
  const pressureCost = Number(input.pressureCost ?? input.pressureWashingCost) || undefined;
  const bidInput: BidInput = {
    sqft: projectSqft,
    waxSqft: waxingSqft,
    carpetSqft,
    windowCount,
    windowFloor,
    exteriorWindows: input.exteriorWindows ?? true,
    useLift,
    liftCost,
    usePressure,
    pressureCost,
    wageType,
    manualOverride: input.manualOverride ? Number(input.manualOverride) : undefined,
  };
  const calculated = calculateBid(bidInput);

  const travelCost =
    typeof input.travelCostOverride === 'number' && input.travelCostOverride > 0
      ? roundMoney(input.travelCostOverride)
      : 0;

  const crewCost = roundMoney(calculated.base);
  const waxingCost = roundMoney(calculated.wax);
  const carpetCost = roundMoney(calculated.carpet);
  const windowCost = roundMoney(calculated.windows);
  const aerialLiftCost = roundMoney(calculated.lift);
  const pressureWashingCost = roundMoney(calculated.pressure);
  const needsAerialLift = useLift && aerialLiftCost > 0;
  const additionalCosts = roundMoney(waxingCost + carpetCost + windowCost + aerialLiftCost + pressureWashingCost);
  const subtotal = roundMoney(calculated.total + travelCost);
  const effectiveRate = (cost: number, quantity: number) => quantity > 0 ? roundMoney(cost / quantity) : 0;

  return {
    crewDays,
    crewPeople,
    wageType,
    rates: {
      dailyRate: effectiveRate(crewCost, projectSqft),
      minimumPerDay: 0,
      waxingPerSqft: effectiveRate(waxingCost, waxingSqft),
      carpetPerSqft: effectiveRate(carpetCost, carpetSqft),
      windowPerUnit: effectiveRate(windowCost, windowCount),
      aerialLiftFlat: aerialLiftCost,
    },
    base: {
      projectSqft,
      crewCost,
      travelDistance,
      travelCost,
    },
    services: {
      waxingSqft,
      waxingCost,
      carpetSqft,
      carpetCost,
      windowCount,
      windowCost,
      floorCount,
      needsAerialLift,
      aerialLiftCost,
      pressureWashingCost,
      additionalCosts,
    },
    totals: {
      subtotal,
      total: subtotal,
    },
  };
}
