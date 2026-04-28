import { calculateAdvancedBidPrice, calculateTravelCosts, detectAerialLiftNeeded, estimateDistance, AdvancedPricingInput, AdvancedPricingBreakdown } from './advancedPricing';
import { BidParameter, PrevailingWageRate } from '../drizzle/schema';

/**
 * Proposal Calculation Engine
 * Generates detailed cost breakdowns for bid proposals
 */

export interface CostBreakdown {
  cleaningCost: number; // in cents
  windowWashingCost: number; // in cents
  waxingCost: number; // in cents
  aerialLiftCost: number; // in cents
  travelCost: number; // in cents
  mealsCost: number; // in cents
  hotelCost: number; // in cents
  subtotal: number; // in cents
  additionalCosts: number; // in cents
  totalBid: number; // in cents
}

export interface ProposalData {
  projectId: number;
  projectName: string;
  location: string;
  squareFootage: number;
  buildingStories: number;
  wageType: 'private' | 'prevailing';
  prevailingWageRate?: number; // in cents
  includeWindowWashing: boolean;
  includeWaxing: boolean;
  includeTravel: boolean;
  travelDistance?: number; // in miles
  costBreakdown: CostBreakdown;
  notes?: string;
}

export interface ProposalReview {
  proposal: ProposalData;
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approvalNotes?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
}

/**
 * Calculate detailed cost breakdown for a proposal using the advanced pricing engine
 */
export function calculateProposalCosts(
  squareFootage: number,
  buildingStories: number,
  wageType: 'private' | 'prevailing',
  parameters: BidParameter,
  prevailingRate?: PrevailingWageRate,
  includeWindowWashing: boolean = false,
  includeWaxing: boolean = false,
  projectLocation?: string,
): CostBreakdown {
  // Build input for advanced pricing engine
  const pricingInput: AdvancedPricingInput = {
    squareFootage,
    wageType,
    buildingStories,
    projectLocation,
    includeWindowWashing,
    includeWaxing,
    parameters,
    prevailingRate,
  };

  // Calculate using advanced pricing engine
  const breakdown: AdvancedPricingBreakdown = calculateAdvancedBidPrice(pricingInput);

  // Extract travel cost details if available
  let travelCost = 0;
  let mealsCost = 0;
  let hotelCost = 0;

  if (breakdown.travelBreakdown) {
    travelCost = breakdown.travelBreakdown.travelCost;
    mealsCost = breakdown.travelBreakdown.mealCost;
    hotelCost = breakdown.travelBreakdown.hotelCost;
  }

  return {
    cleaningCost: breakdown.cleaningCost,
    windowWashingCost: breakdown.windowWashingCost,
    waxingCost: breakdown.waxingCost,
    aerialLiftCost: breakdown.aerialLiftCost,
    travelCost,
    mealsCost,
    hotelCost,
    subtotal: breakdown.subtotal,
    additionalCosts: breakdown.additionalCosts,
    totalBid: breakdown.total,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get cost breakdown items as array for display
 */
export function getCostBreakdownItems(breakdown: CostBreakdown): Array<{ label: string; amount: number; formatted: string }> {
  const items = [];

  if (breakdown.cleaningCost > 0) {
    items.push({ label: 'Cleaning', amount: breakdown.cleaningCost, formatted: formatCurrency(breakdown.cleaningCost) });
  }

  if (breakdown.windowWashingCost > 0) {
    items.push({ label: 'Window Washing', amount: breakdown.windowWashingCost, formatted: formatCurrency(breakdown.windowWashingCost) });
  }

  if (breakdown.waxingCost > 0) {
    items.push({ label: 'Waxing', amount: breakdown.waxingCost, formatted: formatCurrency(breakdown.waxingCost) });
  }

  if (breakdown.aerialLiftCost > 0) {
    items.push({ label: 'Aerial Lift', amount: breakdown.aerialLiftCost, formatted: formatCurrency(breakdown.aerialLiftCost) });
  }

  if (breakdown.travelCost > 0) {
    items.push({ label: 'Travel Time', amount: breakdown.travelCost, formatted: formatCurrency(breakdown.travelCost) });
  }

  if (breakdown.mealsCost > 0) {
    items.push({ label: 'Meals & Per Diem', amount: breakdown.mealsCost, formatted: formatCurrency(breakdown.mealsCost) });
  }

  if (breakdown.hotelCost > 0) {
    items.push({ label: 'Hotel/Lodging', amount: breakdown.hotelCost, formatted: formatCurrency(breakdown.hotelCost) });
  }

  items.push({ label: 'Subtotal', amount: breakdown.subtotal, formatted: formatCurrency(breakdown.subtotal) });
  items.push({ label: 'Additional Costs', amount: breakdown.additionalCosts, formatted: formatCurrency(breakdown.additionalCosts) });
  items.push({ label: 'Total Bid', amount: breakdown.totalBid, formatted: formatCurrency(breakdown.totalBid) });

  return items;
}

/**
 * Validate proposal data
 */
export function validateProposal(data: ProposalData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.squareFootage <= 0) {
    errors.push('Square footage must be greater than 0');
  }

  if (data.buildingStories < 1) {
    errors.push('Building stories must be at least 1');
  }

  if (data.wageType === 'prevailing' && !data.prevailingWageRate) {
    errors.push('Prevailing wage rate must be specified for prevailing wage bids');
  }

  if (data.costBreakdown.totalBid <= 0) {
    errors.push('Total bid must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
