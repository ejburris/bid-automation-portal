import { BidParameter, PrevailingWageRate } from "../drizzle/schema";

/**
 * Advanced pricing engine with travel costs, aerial lift detection, and new formulas
 * 
 * Private Wage: ($22/hr × 1.255 office multiplier) ÷ 0.7 profit margin = $39.79/hr
 * Prevailing Wage: (jurisdiction wage × 1.255 office multiplier) ÷ 0.7 profit margin
 * Travel: $39/person/hr for travel time, $50/person/day for meals
 * Aerial Lift: Required for buildings > 2 stories
 */

export interface AdvancedPricingInput {
  squareFootage: number;
  wageType: "private" | "prevailing";
  buildingStories?: number; // For aerial lift detection
  projectLocation?: string; // For distance calculation
  includeWindowWashing?: boolean;
  includeWaxing?: boolean;
  parameters: BidParameter;
  prevailingRate?: PrevailingWageRate;
}

export interface TravelCostBreakdown {
  distance: number; // miles from Vancouver, WA
  requiresTravel: boolean; // true if > 1.5 hours (approx 120 miles)
  travelHours: number;
  travelCost: number; // $39/person/hr
  mealDays: number;
  mealCost: number; // $50/person/day
  hotelCost: number; // estimated
  totalTravelCost: number;
}

export interface AerialLiftBreakdown {
  requiresAerialLift: boolean;
  buildingStories: number;
  aerialLiftCost: number;
}

export interface AdvancedPricingBreakdown {
  cleaningCost: number;
  windowWashingCost: number;
  waxingCost: number;
  aerialLiftCost: number;
  travelCost: number;
  subtotal: number;
  additionalCosts: number;
  total: number;
  breakdown: {
    cleaningHours: number;
    windowWashingHours: number;
    waxingHours: number;
    hourlyRate: number;
    baseWage: number;
    officeMultiplier: number;
    profitMargin: number;
  };
  travelBreakdown?: TravelCostBreakdown;
  aerialLiftBreakdown?: AerialLiftBreakdown;
}

/**
 * Calculate hourly rate with new formula
 * Private: ($22 × 1.255) ÷ 0.7 = $39.79/hr
 * Prevailing: (jurisdiction wage × 1.255) ÷ 0.7
 */
export function calculateHourlyRate(
  wageType: "private" | "prevailing",
  baseWage: number, // in cents
  parameters?: BidParameter,
  prevailingRate?: PrevailingWageRate
): { rate: number; breakdown: { baseWage: number; officeMultiplier: number; profitMargin: number } } {
  const OFFICE_MULTIPLIER = 1.255;
  const PROFIT_MARGIN = 0.7;

  if (wageType === "prevailing" && prevailingRate) {
    // Use prevailing wage from jurisdiction
    const rateInDollars = (prevailingRate.wageRate / 100) * OFFICE_MULTIPLIER / PROFIT_MARGIN;
    return {
      rate: Math.round(rateInDollars * 100), // Convert back to cents
      breakdown: {
        baseWage: prevailingRate.wageRate,
        officeMultiplier: OFFICE_MULTIPLIER,
        profitMargin: PROFIT_MARGIN,
      },
    };
  }

  // Private wage: $22/hr base
  const privateBaseWage = 2200; // $22 in cents
  const rateInDollars = (privateBaseWage / 100) * OFFICE_MULTIPLIER / PROFIT_MARGIN;
  return {
    rate: Math.round(rateInDollars * 100), // Convert back to cents
    breakdown: {
      baseWage: privateBaseWage,
      officeMultiplier: OFFICE_MULTIPLIER,
      profitMargin: PROFIT_MARGIN,
    },
  };
}

/**
 * Calculate distance from project location to Vancouver, WA
 * Returns approximate distance in miles
 * For now, uses a simple estimation based on common locations
 * TODO: Integrate with Google Maps Distance Matrix API for accurate distances
 */
export function estimateDistance(projectLocation: string): number {
  // Simple distance estimation for common Oregon/Washington locations
  const distances: Record<string, number> = {
    "portland, or": 180,
    "salem, or": 220,
    "eugene, or": 380,
    "bend, or": 480,
    "seattle, wa": 180,
    "tacoma, wa": 160,
    "olympia, wa": 120,
    "spokane, wa": 280,
    "bellingham, wa": 100,
    "salem": 220,
    "eugene": 380,
    "bend": 480,
    "seattle": 180,
    "tacoma": 160,
    "olympia": 120,
    "spokane": 280,
    "bellingham": 100,
  };

  const normalized = projectLocation.toLowerCase().trim();
  for (const [location, distance] of Object.entries(distances)) {
    if (normalized.includes(location)) {
      return distance;
    }
  }

  // Default: assume 150 miles if location not recognized
  return 150;
}

/**
 * Calculate travel costs if project is > 1.5 hours away (approx 120 miles)
 * $39/person/hr for travel time
 * $50/person/day for meals/per diem
 */
export function calculateTravelCosts(
  distance: number,
  workersCount: number = 1
): TravelCostBreakdown {
  const TRAVEL_THRESHOLD_MILES = 120; // 1.5 hours at 80 mph
  const TRAVEL_COST_PER_HOUR = 3900; // $39 in cents
  const MEAL_COST_PER_DAY = 5000; // $50 in cents
  const HOURS_PER_TRIP = Math.ceil(distance / 80); // Assume 80 mph average

  const requiresTravel = distance > TRAVEL_THRESHOLD_MILES;

  if (!requiresTravel) {
    return {
      distance,
      requiresTravel: false,
      travelHours: 0,
      travelCost: 0,
      mealDays: 0,
      mealCost: 0,
      hotelCost: 0,
      totalTravelCost: 0,
    };
  }

  // Calculate travel time (round trip)
  const travelHours = HOURS_PER_TRIP * 2;
  const travelCost = Math.round(travelHours * TRAVEL_COST_PER_HOUR * workersCount);

  // Calculate meal days (assume overnight stay)
  const mealDays = Math.ceil(travelHours / 8); // Assume 8-hour work day
  const mealCost = Math.round(mealDays * MEAL_COST_PER_DAY * workersCount);

  // Estimate hotel cost (approx $100-150 per night per person)
  const hotelCostPerNight = 12500; // $125 in cents
  const hotelCost = Math.round(mealDays * hotelCostPerNight * workersCount);

  return {
    distance,
    requiresTravel: true,
    travelHours,
    travelCost,
    mealDays,
    mealCost,
    hotelCost,
    totalTravelCost: travelCost + mealCost + hotelCost,
  };
}

/**
 * Detect if aerial lift is needed based on building stories
 * Required for buildings > 2 stories
 */
export function detectAerialLiftNeeded(buildingStories: number = 1): AerialLiftBreakdown {
  const AERIAL_LIFT_THRESHOLD = 2;
  const AERIAL_LIFT_COST = 50000; // $500 in cents (base cost)

  const requiresAerialLift = buildingStories > AERIAL_LIFT_THRESHOLD;
  const aerialLiftCost = requiresAerialLift ? AERIAL_LIFT_COST : 0;

  return {
    requiresAerialLift,
    buildingStories,
    aerialLiftCost,
  };
}

/**
 * Estimate hours needed for cleaning tasks
 */
function estimateCleaningHours(squareFootage: number): number {
  // Assume 1 hour per 1500 sqft for general cleaning
  return Math.ceil(squareFootage / 1500);
}

/**
 * Main advanced pricing calculation function
 */
export function calculateAdvancedBidPrice(input: AdvancedPricingInput): AdvancedPricingBreakdown {
  // Calculate hourly rate with new formula
  const { rate: hourlyRate, breakdown: rateBreakdown } = calculateHourlyRate(
    input.wageType,
    2200, // $22 base wage in cents
    input.parameters,
    input.prevailingRate
  );

  // Calculate cleaning hours
  const cleaningHours = estimateCleaningHours(input.squareFootage);
  const cleaningCost = Math.round(cleaningHours * hourlyRate);

  // Calculate window washing hours and cost
  const windowWashingHours = input.includeWindowWashing ? Math.ceil(cleaningHours * 0.3) : 0;
  const windowWashingCost = Math.round(windowWashingHours * hourlyRate);

  // Calculate waxing hours and cost
  const waxingHours = input.includeWaxing ? Math.ceil(cleaningHours * 0.2) : 0;
  const waxingCost = Math.round(waxingHours * hourlyRate);

  // Calculate aerial lift cost
  const aerialLiftBreakdown = detectAerialLiftNeeded(input.buildingStories);
  const aerialLiftCost = aerialLiftBreakdown.aerialLiftCost;

  // Calculate travel costs
  let travelBreakdown: TravelCostBreakdown | undefined;
  let travelCost = 0;
  if (input.projectLocation) {
    const distance = estimateDistance(input.projectLocation);
    travelBreakdown = calculateTravelCosts(distance, 1);
    travelCost = travelBreakdown.totalTravelCost;
  }

  // Calculate subtotal
  const subtotal = cleaningCost + windowWashingCost + waxingCost + aerialLiftCost + travelCost;

  // Add additional costs (typically 6%)
  const additionalCostPercentage = input.parameters?.additionalCostPercentage || 6;
  const additionalCosts = Math.round((subtotal * additionalCostPercentage) / 100);

  // Calculate total
  const total = subtotal + additionalCosts;

  return {
    cleaningCost,
    windowWashingCost,
    waxingCost,
    aerialLiftCost,
    travelCost,
    subtotal,
    additionalCosts,
    total,
    breakdown: {
      cleaningHours,
      windowWashingHours,
      waxingHours,
      hourlyRate,
      baseWage: rateBreakdown.baseWage,
      officeMultiplier: rateBreakdown.officeMultiplier,
      profitMargin: rateBreakdown.profitMargin,
    },
    travelBreakdown,
    aerialLiftBreakdown,
  };
}

/**
 * Format price for display (convert from cents to dollars)
 */
export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}
