import { calculateBid, type BidInput, type WageType } from '../../../server/core/pricing';

export { calculateBid };
export type { BidInput, WageType };

export function getPricingDefaults(wageType: WageType) {
  return calculateBid({
    sqft: 0,
    wageType,
    useLift: true,
    usePressure: true,
  });
}
