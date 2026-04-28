export type TravelDecisionInput = {
  distance: number | null;
  distanceStatus: 'Known' | 'Unknown / needs review';
  workersNeeded: number;
  desiredProjectDays: number;
};

export type TravelDecision = {
  homeBase: string;
  distance: number | null;
  distanceStatus: 'Known' | 'Unknown / needs review';
  travelRequired: boolean;
  travelStatus: 'Local / no travel required' | 'Travel required' | 'Manual review required';
  mileageRate: number;
  hotelPerNight: number;
  perDiemPerDay: number;
  mileageCost: number;
  hotelCost: number;
  perDiemCost: number;
  totalTravelDecisionCost: number;
};

export const TRAVEL_DECISION_ASSUMPTIONS = {
  homeBase: 'Vancouver, WA',
  mileageRate: 0.65,
  hotelPerNight: 120,
  perDiemPerDay: 50,
  travelThresholdMiles: 150,
};

export function calculateTravelDecision(input: TravelDecisionInput): TravelDecision {
  if (input.distanceStatus === 'Unknown / needs review' || input.distance == null) {
    return {
      homeBase: TRAVEL_DECISION_ASSUMPTIONS.homeBase,
      distance: null,
      distanceStatus: 'Unknown / needs review',
      travelRequired: false,
      travelStatus: 'Manual review required',
      mileageRate: TRAVEL_DECISION_ASSUMPTIONS.mileageRate,
      hotelPerNight: TRAVEL_DECISION_ASSUMPTIONS.hotelPerNight,
      perDiemPerDay: TRAVEL_DECISION_ASSUMPTIONS.perDiemPerDay,
      mileageCost: 0,
      hotelCost: 0,
      perDiemCost: 0,
      totalTravelDecisionCost: 0,
    };
  }

  const distance = Math.max(0, Number(input.distance) || 0);
  const workersNeeded = Math.max(1, Math.ceil(Number(input.workersNeeded) || 1));
  const desiredProjectDays = Math.max(1, Number(input.desiredProjectDays) || 1);
  const travelRequired = distance > TRAVEL_DECISION_ASSUMPTIONS.travelThresholdMiles;
  if (!travelRequired) {
    return {
      homeBase: TRAVEL_DECISION_ASSUMPTIONS.homeBase,
      distance,
      distanceStatus: 'Known',
      travelRequired,
      travelStatus: 'Local / no travel required',
      mileageRate: TRAVEL_DECISION_ASSUMPTIONS.mileageRate,
      hotelPerNight: TRAVEL_DECISION_ASSUMPTIONS.hotelPerNight,
      perDiemPerDay: TRAVEL_DECISION_ASSUMPTIONS.perDiemPerDay,
      mileageCost: 0,
      hotelCost: 0,
      perDiemCost: 0,
      totalTravelDecisionCost: 0,
    };
  }
  const mileageCost = distance * 2 * TRAVEL_DECISION_ASSUMPTIONS.mileageRate;
  const hotelCost = TRAVEL_DECISION_ASSUMPTIONS.hotelPerNight * workersNeeded * Math.max(0, desiredProjectDays - 1);
  const perDiemCost = TRAVEL_DECISION_ASSUMPTIONS.perDiemPerDay * workersNeeded * desiredProjectDays;

  return {
    homeBase: TRAVEL_DECISION_ASSUMPTIONS.homeBase,
    distance,
    distanceStatus: 'Known',
    travelRequired,
    travelStatus: 'Travel required',
    mileageRate: TRAVEL_DECISION_ASSUMPTIONS.mileageRate,
    hotelPerNight: TRAVEL_DECISION_ASSUMPTIONS.hotelPerNight,
    perDiemPerDay: TRAVEL_DECISION_ASSUMPTIONS.perDiemPerDay,
    mileageCost,
    hotelCost,
    perDiemCost,
    totalTravelDecisionCost: mileageCost + hotelCost + perDiemCost,
  };
}
