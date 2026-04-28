import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  calculateTravelCosts,
  formatDistanceResult,
  getBaseLocation,
  getTravelCostParameters,
} from './distanceCalculation';

describe('Distance Calculation Engine', () => {
  describe('Haversine Distance Calculation', () => {
    it('should calculate distance between two points', () => {
      // Vancouver, WA to Portland, OR (approximately 170 miles)
      const vancouverWA = { lat: 45.6387, lon: -122.6615 };
      const portlandOR = { lat: 45.5152, lon: -122.6784 };

      const distance = calculateHaversineDistance(
        vancouverWA.lat,
        vancouverWA.lon,
        portlandOR.lat,
        portlandOR.lon
      );

      // Should be approximately 8-9 miles (Portland is very close to Vancouver)
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(15);
    });

    it('should calculate distance from Vancouver WA to Seattle WA', () => {
      // Vancouver, WA to Seattle, WA (approximately 170 miles)
      const vancouverWA = { lat: 45.6387, lon: -122.6615 };
      const seattleWA = { lat: 47.6062, lon: -122.3321 };

      const distance = calculateHaversineDistance(
        vancouverWA.lat,
        vancouverWA.lon,
        seattleWA.lat,
        seattleWA.lon
      );

      // Should be approximately 137 miles
      expect(distance).toBeGreaterThan(130);
      expect(distance).toBeLessThan(145);
    });

    it('should calculate distance from Vancouver WA to Spokane WA', () => {
      // Vancouver, WA to Spokane, WA (approximately 280 miles)
      const vancouverWA = { lat: 45.6387, lon: -122.6615 };
      const spokaneWA = { lat: 47.6587, lon: -117.426 };

      const distance = calculateHaversineDistance(
        vancouverWA.lat,
        vancouverWA.lon,
        spokaneWA.lat,
        spokaneWA.lon
      );

      // Should be approximately 280 miles
      expect(distance).toBeGreaterThan(270);
      expect(distance).toBeLessThan(290);
    });

    it('should return 0 for same location', () => {
      const distance = calculateHaversineDistance(45.6387, -122.6615, 45.6387, -122.6615);
      expect(distance).toBe(0);
    });
  });

  describe('Travel Cost Calculation - No Travel (< 75 miles)', () => {
    it('should not charge travel costs for short distances', () => {
      const result = calculateTravelCosts(50, 2, 1);

      expect(result.distance).toBe(50);
      expect(result.requiresTravel).toBe(false);
      expect(result.travelTimeCost).toBe(0);
      expect(result.mealCost).toBe(0);
      expect(result.hotelCost).toBe(0);
      expect(result.totalTravelCost).toBe(0);
    });

    it('should not charge travel costs at exactly 75 miles threshold', () => {
      const result = calculateTravelCosts(75, 2, 1);

      expect(result.requiresTravel).toBe(false);
      expect(result.totalTravelCost).toBe(0);
    });
  });

  describe('Travel Cost Calculation - With Travel (> 75 miles)', () => {
    it('should calculate travel costs for 150 mile trip with 2 people, 1 day', () => {
      const result = calculateTravelCosts(150, 2, 1);

      expect(result.distance).toBe(150);
      expect(result.travelTimeHours).toBe(6); // 300 miles round trip / 50 mph
      expect(result.requiresTravel).toBe(true);

      // Travel time: 6 hours * $39/hour * 2 people = $468
      expect(result.travelTimeCost).toBe(468);

      // Meals: $50/person/day * 2 people = $100
      expect(result.mealCost).toBe(100);

      // Hotel: 6 hours > 4 hours, so 1 night * $150/person * 2 people = $300
      expect(result.hotelCost).toBe(300);

      // Total: $468 + $100 + $300 = $868
      expect(result.totalTravelCost).toBe(868);
    });

    it('should calculate travel costs for 200 mile trip with 3 people, 2 days', () => {
      const result = calculateTravelCosts(200, 3, 2);

      expect(result.distance).toBe(200);
      expect(result.travelTimeHours).toBe(8); // 400 miles round trip / 50 mph
      expect(result.requiresTravel).toBe(true);

      // Travel time: 8 hours * $39/hour * 3 people = $936
      expect(result.travelTimeCost).toBe(936);

      // Meals: $50/person/day * 3 people * 2 days = $300
      expect(result.mealCost).toBe(300);

      // Hotel: 8 hours = 8 hours (not > 8), so 1 night * $150/person * 3 people = $450
      expect(result.hotelCost).toBe(450);

      // Total: $936 + $300 + $450 = $1,686
      expect(result.totalTravelCost).toBe(1686);
    });

    it('should not charge hotel for short overnight trips (4-8 hours)', () => {
      // 100 miles = 4 hours travel time (exactly at threshold)
      const result = calculateTravelCosts(100, 2, 1);

      expect(result.travelTimeHours).toBe(4);
      expect(result.hotelCost).toBe(0); // No hotel for exactly 4 hours
    });

    it('should charge hotel for trips over 8 hours', () => {
      // 210 miles = 8.4 hours travel time (> 8)
      const result = calculateTravelCosts(210, 2, 1);

      expect(result.travelTimeHours).toBe(8.4);
      expect(result.hotelCost).toBeGreaterThan(0); // Hotel for > 8 hours
      // Should be 2 nights * $150 * 2 people = $600
      expect(result.hotelCost).toBe(600);
    });

    it('should calculate travel costs for single person', () => {
      const result = calculateTravelCosts(150, 1, 1);

      expect(result.distance).toBe(150);
      expect(result.travelTimeHours).toBe(6);

      // Travel time: 6 hours * $39/hour * 1 person = $234
      expect(result.travelTimeCost).toBe(234);

      // Meals: $50/person/day * 1 person = $50
      expect(result.mealCost).toBe(50);

      // Hotel: $150/person * 1 person = $150
      expect(result.hotelCost).toBe(150);

      // Total: $234 + $50 + $150 = $434
      expect(result.totalTravelCost).toBe(434);
    });

    it('should calculate travel costs for fractional crew', () => {
      const result = calculateTravelCosts(150, 1.5, 1);

      expect(result.distance).toBe(150);
      expect(result.travelTimeHours).toBe(6);

      // Travel time: 6 hours * $39/hour * 1.5 people = $351
      expect(result.travelTimeCost).toBe(351);

      // Meals: $50/person/day * 1.5 people = $75
      expect(result.mealCost).toBe(75);

      // Hotel: $150/person * 1.5 people = $225
      expect(result.hotelCost).toBe(225);

      // Total: $351 + $75 + $225 = $651
      expect(result.totalTravelCost).toBe(651);
    });
  });

  describe('Travel Cost Breakdown', () => {
    it('should include correct breakdown information', () => {
      const result = calculateTravelCosts(150, 2, 1);

      expect(result.breakdown.distance).toBe(150);
      expect(result.breakdown.travelHours).toBe(6);
      expect(result.breakdown.crewPeople).toBe(2);
      expect(result.breakdown.crewDays).toBe(1);
      expect(result.breakdown.travelTimePerPerson).toBe(234); // 6 * 39
      expect(result.breakdown.mealPerPerson).toBe(50);
      expect(result.breakdown.hotelPerPerson).toBe(150);
    });
  });

  describe('Formatting', () => {
    it('should format short distance result', () => {
      const result = calculateTravelCosts(50, 2, 1);
      const formatted = formatDistanceResult(result);

      expect(formatted).toContain('Distance: 50.0 miles');
      expect(formatted).toContain('Travel Time: 0.0 hours');
      expect(formatted).toContain('No travel charges');
    });

    it('should format long distance result with travel costs', () => {
      const result = calculateTravelCosts(150, 2, 1);
      const formatted = formatDistanceResult(result);

      expect(formatted).toContain('Distance: 150.0 miles');
      expect(formatted).toContain('Travel Time: 6.0 hours');
      expect(formatted).toContain('Travel charges apply');
      expect(formatted).toContain('Travel Cost Breakdown');
      expect(formatted).toContain('Travel Time');
      expect(formatted).toContain('Meals');
      expect(formatted).toContain('Hotel');
      expect(formatted).toContain('Total Travel Cost');
    });
  });

  describe('Base Location', () => {
    it('should return correct base location', () => {
      const baseLocation = getBaseLocation();

      expect(baseLocation.name).toBe('Vancouver, WA');
      expect(baseLocation.latitude).toBe(45.6387);
      expect(baseLocation.longitude).toBe(-122.6615);
    });
  });

  describe('Travel Cost Parameters', () => {
    it('should return correct travel cost parameters', () => {
      const params = getTravelCostParameters();

      expect(params.DISTANCE_THRESHOLD).toBe(75);
      expect(params.TRAVEL_RATE_PER_HOUR).toBe(39);
      expect(params.AVERAGE_SPEED_MPH).toBe(50);
      expect(params.MEAL_PER_DIEM_PER_DAY).toBe(50);
      expect(params.HOTEL_COST_PER_NIGHT).toBe(150);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long distances', () => {
      const result = calculateTravelCosts(1000, 2, 1);

      expect(result.distance).toBe(1000);
      expect(result.travelTimeHours).toBe(40); // 2000 miles / 50 mph
      expect(result.requiresTravel).toBe(true);
      expect(result.totalTravelCost).toBeGreaterThan(0);
    });

    it('should handle large crews', () => {
      const result = calculateTravelCosts(150, 10, 1);

      expect(result.distance).toBe(150);
      expect(result.travelTimeHours).toBe(6);

      // Travel time: 6 * $39 * 10 = $2,340
      expect(result.travelTimeCost).toBe(2340);

      // Meals: $50 * 10 = $500
      expect(result.mealCost).toBe(500);

      // Hotel: $150 * 10 = $1,500
      expect(result.hotelCost).toBe(1500);

      // Total: $2,340 + $500 + $1,500 = $4,340
      expect(result.totalTravelCost).toBe(4340);
    });

    it('should handle multi-day projects', () => {
      const result = calculateTravelCosts(150, 2, 5);

      expect(result.distance).toBe(150);
      expect(result.travelTimeHours).toBe(6);

      // Travel time: 6 * $39 * 2 = $468 (one-time)
      expect(result.travelTimeCost).toBe(468);

      // Meals: $50 * 2 * 5 days = $500
      expect(result.mealCost).toBe(500);

      // Hotel: $150 * 2 = $300 (one night assumed)
      expect(result.hotelCost).toBe(300);

      // Total: $468 + $500 + $300 = $1,268
      expect(result.totalTravelCost).toBe(1268);
    });
  });
});
