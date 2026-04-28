export type WageType = "private" | "prevailing";

export type BidInput = {
  sqft: number;
  wageType: WageType;

  manualOverride?: number;

  waxSqft?: number;
  carpetSqft?: number;

  windowCount?: number;
  windowFloor?: number;
  exteriorWindows?: boolean;

  useLift?: boolean;
  liftCost?: number;

  usePressure?: boolean;
  pressureCost?: number;
};

export function calculateBid(input: BidInput) {
  const isPrevailing = input.wageType === "prevailing";

const baseRate = isPrevailing ? 0.59 : 0.27;
const calculatedBase = input.sqft * baseRate;
const minimumBase = isPrevailing ? calculatedBase : 595;
const base = input.manualOverride
  ? calculatedBase
  : Math.max(calculatedBase, minimumBase);

  let wax = 0;
  if (input.waxSqft) {
    const rate = isPrevailing ? 0.81 : 0.27;
    const min = isPrevailing ? 940 : 305;
    wax = Math.max(input.waxSqft * rate, min);
  }

  let carpet = 0;
  if (input.carpetSqft) {
    const rate = isPrevailing ? 0.81 : 0.13;
    const min = isPrevailing ? 940 : 305;
    carpet = Math.max(input.carpetSqft * rate, min);
  }

  let windows = 0;
  if (input.windowCount) {
    let rate = 0;

    if (isPrevailing) {
      if (!input.exteriorWindows) rate = 28.5;
      else if (input.windowFloor === 2) rate = 35;
      else if (input.windowFloor === 3) rate = 39;
      else if (input.windowFloor === 4) rate = 45;
      else rate = 28.5;
    } else {
      if (!input.exteriorWindows) rate = 12.5;
      else if (input.windowFloor === 2) rate = 16;
      else if (input.windowFloor === 3) rate = 18;
      else if (input.windowFloor === 4) rate = 25;
      else rate = 12.5;
    }

    windows = input.windowCount * rate;
  }

  const lift = input.useLift
    ? input.liftCost || 850
    : 0;

  const pressure = input.usePressure
    ? input.pressureCost || (isPrevailing ? 1881 : 702)
    : 0;

const calculatedTotal = base + wax + carpet + windows + lift + pressure;

const total = input.manualOverride ?? calculatedTotal;

  return {
    base,
    wax,
    carpet,
    windows,
    lift,
    pressure,
    total,
  };
}