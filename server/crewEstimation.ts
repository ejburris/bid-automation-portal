/**
 * Crew Estimation Engine
 * Estimates crew size based on square footage and service pricing rates
 */

export interface CrewEstimationInput {
  projectSqft: number;
  isPrivateWage: boolean;
  includeWaxing: boolean;
  includeCarpet: boolean;
  includeWindows: boolean;
  crewDays?: number; // Default to 1 if not provided
}

export interface CrewEstimationBreakdown {
  baseCost: number; // Cost for base cleaning (windows)
  waxingCost: number;
  carpetCost: number;
  totalServiceCost: number;
  estimatedCrewPeople: number;
  dailyRate: number;
  breakdown: {
    sqft: number;
    baseRate: number;
    waxingRate: number;
    carpetRate: number;
    days: number;
  };
}

// Pricing rates per square foot
const PRICING_RATES = {
  private: {
    base: 0.27, // Windows/general cleaning
    waxing: 0.47,
    carpet: 0.13,
    dailyRate: 350, // $350/person/day
    minimumDaily: 595, // $595/day minimum
  },
  prevailing: {
    base: 0.59, // Windows/general cleaning
    waxing: 1.50,
    carpet: 0.81,
    dailyRate: 940.50, // $940.50/person/day
  },
};

/**
 * Estimate crew size based on square footage and services
 * Returns estimated crew people and detailed breakdown
 */
export function estimateCrewSize(input: CrewEstimationInput): CrewEstimationBreakdown | null {
  const crewDays = input.crewDays || 1;
  const isPrivate = input.isPrivateWage;
  const rates = isPrivate ? PRICING_RATES.private : PRICING_RATES.prevailing;

  // Return null for zero square footage
  if (input.projectSqft === 0) {
    return null;
  }

  // Calculate service costs
  let baseCost = input.projectSqft * rates.base;
  const waxingCost = input.includeWaxing ? input.projectSqft * rates.waxing : 0;
  const carpetCost = input.includeCarpet ? input.projectSqft * rates.carpet : 0;

  const totalServiceCost = baseCost + waxingCost + carpetCost;

  // Estimate crew people needed
  // Formula: totalCost ÷ dailyRate ÷ days = people needed
  let estimatedCrewPeople = totalServiceCost / rates.dailyRate / crewDays;

  // Apply minimum for private wage
  if (isPrivate && estimatedCrewPeople * rates.dailyRate * crewDays < PRICING_RATES.private.minimumDaily) {
    // Adjust crew people to meet minimum
    estimatedCrewPeople = PRICING_RATES.private.minimumDaily / rates.dailyRate / crewDays;
  }

  return {
    baseCost,
    waxingCost,
    carpetCost,
    totalServiceCost,
    estimatedCrewPeople: Math.max(1, Math.round(estimatedCrewPeople * 2) / 2), // Round to nearest 0.5
    dailyRate: rates.dailyRate,
    breakdown: {
      sqft: input.projectSqft,
      baseRate: rates.base,
      waxingRate: rates.waxing,
      carpetRate: rates.carpet,
      days: crewDays,
    },
  };
}

/**
 * Format the crew estimation breakdown for display
 */
export function formatCrewEstimationBreakdown(breakdown: CrewEstimationBreakdown | null): string {
  if (!breakdown) {
    return 'No crew estimation available';
  }
  const { sqft, baseRate, waxingRate, carpetRate, days } = breakdown.breakdown;
  const { baseCost, waxingCost, carpetCost, totalServiceCost, estimatedCrewPeople, dailyRate } = breakdown;

  let lines: string[] = [];

  lines.push(`Square Footage: ${sqft.toLocaleString()} sqft`);
  lines.push('');
  lines.push('Service Costs:');
  lines.push(`  Base Cleaning: ${sqft.toLocaleString()} sqft × $${baseRate}/sqft = $${baseCost.toFixed(2)}`);

  if (waxingCost > 0) {
    lines.push(`  Waxing: ${sqft.toLocaleString()} sqft × $${waxingRate}/sqft = $${waxingCost.toFixed(2)}`);
  }

  if (carpetCost > 0) {
    lines.push(`  Carpet: ${sqft.toLocaleString()} sqft × $${carpetRate}/sqft = $${carpetCost.toFixed(2)}`);
  }

  lines.push('');
  lines.push(`Total Service Cost: $${totalServiceCost.toFixed(2)}`);
  lines.push('');
  lines.push('Crew Estimation:');
  lines.push(`  $${totalServiceCost.toFixed(2)} ÷ $${dailyRate}/person/day ÷ ${days} day(s) = ${estimatedCrewPeople} people`);

  return lines.join('\n');
}

/**
 * Calculate the final bid amount with crew estimation
 */
export function calculateBidWithCrewEstimation(
  input: CrewEstimationInput & { travelCost?: number; additionalCosts?: number }
): {
  estimatedCrewPeople: number;
  baseBidAmount: number;
  totalBidAmount: number;
  breakdown: CrewEstimationBreakdown | null;
} {
  const breakdown = estimateCrewSize(input);
  if (!breakdown) {
    return {
      estimatedCrewPeople: 0,
      baseBidAmount: 0,
      totalBidAmount: 0,
      breakdown: null,
    };
  }
  const crewDays = input.crewDays || 1;
  const travelCost = input.travelCost || 0;
  const additionalCosts = input.additionalCosts || 0;

  // Calculate base bid from crew estimation
  const baseBidAmount = breakdown.estimatedCrewPeople * breakdown.dailyRate * crewDays;

  // Apply minimum for private wage
  let finalBaseBid = baseBidAmount;
  if (input.isPrivateWage && baseBidAmount < PRICING_RATES.private.minimumDaily) {
    finalBaseBid = PRICING_RATES.private.minimumDaily;
  }

  const totalBidAmount = finalBaseBid + travelCost + additionalCosts;

  return {
    estimatedCrewPeople: breakdown.estimatedCrewPeople,
    baseBidAmount: finalBaseBid,
    totalBidAmount,
    breakdown,
  };
}
