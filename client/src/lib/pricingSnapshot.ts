import { calculateBid, type BidInput } from './sharedBidPricing';

export type LockedPricingSnapshot = {
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

export const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export function buildLockedSnapshotFromBid(bid: any): LockedPricingSnapshot {
  const crewDays = Number(bid?.crewDays || 0) / 10 || 1;
  const crewPeople = Number(bid?.crewPeople || 0) / 10 || 1;
  const travelDistance = Number(bid?.travelDistance || 0);
  const travelCost = Number(bid?.travelCost || 0) / 100;
  const additionalCosts = Number(bid?.additionalCosts || 0) / 100;
  const aerialLiftCost = Number(bid?.aerialLiftCost || 0) / 100;
  const pressureWashingCost = Number(bid?.pressureWashingCost || 0) / 100;
  const waxingSqft = Number(bid?.waxingSqft || 0);
  const carpetSqft = Number(bid?.carpetSqft || 0);
  const windowCount = Number(bid?.windowCount || 0);
  const floorCount = Number(bid?.floorCount || 1) || 1;
  const bidAmount = Number(bid?.bidAmount || 0) / 100;
  const wageType = bid?.isPrivateWage ? 'private' : 'prevailing';
  const bidInput: BidInput = {
    sqft: Number(bid?.projectSqft || 0),
    waxSqft: waxingSqft,
    carpetSqft,
    windowCount,
    windowFloor: floorCount,
    exteriorWindows: true,
    useLift: aerialLiftCost > 0 || Boolean(bid?.needsAerialLift),
    liftCost: aerialLiftCost || undefined,
    usePressure: pressureWashingCost > 0,
    pressureCost: pressureWashingCost || undefined,
    wageType,
  };
  const calculated = calculateBid(bidInput);
  const waxingCost = calculated.wax;
  const carpetCost = calculated.carpet;
  const windowCost = calculated.windows;
  const crewCost = Math.max(bidAmount - travelCost - additionalCosts, 0);
  const effectiveRate = (cost: number, quantity: number) => quantity > 0 ? cost / quantity : 0;

  return {
    crewDays,
    crewPeople,
    wageType,
    rates: {
      dailyRate: effectiveRate(calculated.base, bidInput.sqft),
      minimumPerDay: 0,
      waxingPerSqft: effectiveRate(waxingCost, waxingSqft),
      carpetPerSqft: effectiveRate(carpetCost, carpetSqft),
      windowPerUnit: effectiveRate(windowCost, windowCount),
      aerialLiftFlat: aerialLiftCost,
    },
    base: {
      projectSqft: Number(bid?.projectSqft || 0),
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
      needsAerialLift: Boolean(bid?.needsAerialLift),
      aerialLiftCost,
      pressureWashingCost,
      additionalCosts,
    },
    totals: {
      subtotal: bidAmount,
      total: bidAmount,
    },
  };
}
