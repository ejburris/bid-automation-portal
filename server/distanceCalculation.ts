/**
 * Distance Calculation Engine
 * Calculates distance from project address to base location (Vancouver, WA)
 * and determines travel costs based on distance
 */

// Base location: Vancouver, WA 47990
const BASE_LOCATION = {
  latitude: 45.6387,
  longitude: -122.6615,
  name: 'Vancouver, WA',
};

// Travel cost parameters
const TRAVEL_COSTS = {
  DISTANCE_THRESHOLD: 75, // miles - trigger travel costs above this
  TRAVEL_RATE_PER_HOUR: 39, // $/person/hour
  AVERAGE_SPEED_MPH: 50, // assumed average driving speed
  MEAL_PER_DIEM_PER_DAY: 50, // $/person/day
  HOTEL_COST_PER_NIGHT: 150, // $/person/night (rough estimate)
};

export interface DistanceResult {
  distance: number; // miles
  travelTimeHours: number;
  requiresTravel: boolean; // true if > 75 miles
  travelTimeCost: number; // $39/person/hour cost
  mealCost: number; // $50/person/day per diem
  hotelCost: number; // $150/person/night for overnight trips
  totalTravelCost: number; // sum of all travel-related costs
  breakdown: {
    distance: number;
    travelHours: number;
    crewPeople: number;
    crewDays: number;
    travelTimePerPerson: number;
    mealPerPerson: number;
    hotelPerPerson: number;
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate travel costs based on distance and crew details
 * Assumes crew travels together for the project duration
 */
export function calculateTravelCosts(
  distance: number,
  crewPeople: number,
  crewDays: number
): DistanceResult {
  const requiresTravel = distance > TRAVEL_COSTS.DISTANCE_THRESHOLD;

  if (!requiresTravel) {
    return {
      distance,
      travelTimeHours: 0,
      requiresTravel: false,
      travelTimeCost: 0,
      mealCost: 0,
      hotelCost: 0,
      totalTravelCost: 0,
      breakdown: {
        distance,
        travelHours: 0,
        crewPeople,
        crewDays,
        travelTimePerPerson: 0,
        mealPerPerson: 0,
        hotelPerPerson: 0,
      },
    };
  }

  // Calculate travel time (round trip)
  const roundTripDistance = distance * 2;
  const travelTimeHours = roundTripDistance / TRAVEL_COSTS.AVERAGE_SPEED_MPH;

  // Travel time cost: $39/person/hour
  const travelTimePerPerson = travelTimeHours * TRAVEL_COSTS.TRAVEL_RATE_PER_HOUR;
  const travelTimeCost = Math.round(travelTimePerPerson * crewPeople);

  // Meal cost: $50/person/day
  const mealPerPerson = TRAVEL_COSTS.MEAL_PER_DIEM_PER_DAY * crewDays;
  const mealCost = Math.round(mealPerPerson * crewPeople);

  // Hotel cost: only if overnight trip (> 4 hours travel time)
  let hotelCost = 0;
  let hotelPerPerson = 0;
  if (travelTimeHours > 4) {
    // Estimate nights needed: 1 night for trips up to 8 hours, 2 nights for longer
    const nightsNeeded = travelTimeHours > 8 ? 2 : 1;
    hotelPerPerson = TRAVEL_COSTS.HOTEL_COST_PER_NIGHT * nightsNeeded;
    hotelCost = Math.round(hotelPerPerson * crewPeople);
  }

  const totalTravelCost = travelTimeCost + mealCost + hotelCost;

  return {
    distance,
    travelTimeHours,
    requiresTravel: true,
    travelTimeCost,
    mealCost,
    hotelCost,
    totalTravelCost,
    breakdown: {
      distance,
      travelHours: travelTimeHours,
      crewPeople,
      crewDays,
      travelTimePerPerson,
      mealPerPerson,
      hotelPerPerson,
    },
  };
}

/**
 * Format distance result for display
 */
export function formatDistanceResult(result: DistanceResult): string {
  const lines: string[] = [];

  lines.push(`Distance: ${result.distance.toFixed(1)} miles`);
  lines.push(`Travel Time: ${result.travelTimeHours.toFixed(1)} hours (round trip)`);

  if (!result.requiresTravel) {
    lines.push('Status: No travel charges (< 75 miles)');
  } else {
    lines.push('Status: Travel charges apply (> 75 miles)');
    lines.push('');
    lines.push('Travel Cost Breakdown:');
    lines.push(
      `  Travel Time: ${result.breakdown.travelTimePerPerson.toFixed(2)}/person/hr × ${result.breakdown.crewPeople} people = $${result.travelTimeCost}`
    );
    lines.push(
      `  Meals: ${result.breakdown.mealPerPerson}/person × ${result.breakdown.crewPeople} people = $${result.mealCost}`
    );
    if (result.hotelCost > 0) {
      lines.push(
        `  Hotel: ${result.breakdown.hotelPerPerson}/person × ${result.breakdown.crewPeople} people = $${result.hotelCost}`
      );
    }
    lines.push(`  Total Travel Cost: $${result.totalTravelCost}`);
  }

  return lines.join('\n');
}

/**
 * Get base location coordinates
 */
export function getBaseLocation() {
  return BASE_LOCATION;
}

/**
 * Get travel cost parameters (for reference/testing)
 */
export function getTravelCostParameters() {
  return TRAVEL_COSTS;
}
