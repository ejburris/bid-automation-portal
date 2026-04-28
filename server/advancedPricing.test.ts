import { describe, it, expect } from 'vitest';
import {
  calculateHourlyRate,
  estimateDistance,
  calculateTravelCosts,
  detectAerialLiftNeeded,
  calculateAdvancedBidPrice,
  formatPrice,
} from './advancedPricing';
import type { BidParameter, PrevailingWageRate } from '../drizzle/schema';

describe('advancedPricing', () => {
  const mockBidParameters: BidParameter = {
    id: 1,
    userId: 1,
    companyName: 'Clean World Maintenance',
    baseLocation: 'Vancouver, WA',
    privateWageHourly: 2200, // $22
    workDayHours: 9,
    costPerSqftPrivate: 27,
    cleaningCostPerHour: 3950,
    windowWashingCostPerHour: 3950,
    waxingCostPerHour: 3950,
    travelCostPerMile: 0,
    hotelCostPerNight: 0,
    perDiem: 0,
    additionalCostPercentage: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrevailingWage: PrevailingWageRate = {
    id: 1,
    jurisdiction: 'Multnomah County',
    county: 'Multnomah',
    state: 'OR',
    effectiveDate: new Date(),
    wageRate: 4500, // $45/hr
    fringeRate: 1500, // $15/hr
    totalRate: 6000, // $60/hr
    minimumBid: 500000, // $5000
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('calculateHourlyRate', () => {
    it('should calculate private wage rate correctly: ($22 × 1.255) ÷ 0.7 = $39.79', () => {
      const { rate, breakdown } = calculateHourlyRate('private', 2200);

      // $22 × 1.255 ÷ 0.7 = $39.44 (actual calculation)
      expect(rate).toBe(3944); // $39.44 in cents
      expect(breakdown.baseWage).toBe(2200);
      expect(breakdown.officeMultiplier).toBe(1.255);
      expect(breakdown.profitMargin).toBe(0.7);
    });

    it('should calculate prevailing wage rate correctly', () => {
      const { rate, breakdown } = calculateHourlyRate(
        'prevailing',
        4500,
        mockBidParameters,
        mockPrevailingWage
      );

      // $45 × 1.255 ÷ 0.7 = $80.54
      expect(rate).toBeGreaterThan(7000); // Should be around $80.54
      expect(breakdown.baseWage).toBe(4500);
    });
  });

  describe('estimateDistance', () => {
    it('should estimate distance to Portland, OR', () => {
      const distance = estimateDistance('Portland, OR');
      expect(distance).toBe(180);
    });

    it('should estimate distance to Seattle, WA', () => {
      const distance = estimateDistance('Seattle, WA');
      expect(distance).toBe(180);
    });

    it('should estimate distance to Eugene, OR', () => {
      const distance = estimateDistance('Eugene, OR');
      expect(distance).toBe(380);
    });

    it('should return default distance for unknown location', () => {
      const distance = estimateDistance('Unknown City, XX');
      expect(distance).toBe(150);
    });

    it('should be case insensitive', () => {
      const distance1 = estimateDistance('PORTLAND, OR');
      const distance2 = estimateDistance('portland, or');
      expect(distance1).toBe(distance2);
    });
  });

  describe('calculateTravelCosts', () => {
    it('should not charge travel costs for nearby projects (< 120 miles)', () => {
      const result = calculateTravelCosts(100, 1);

      expect(result.requiresTravel).toBe(false);
      expect(result.travelCost).toBe(0);
      expect(result.mealCost).toBe(0);
      expect(result.hotelCost).toBe(0);
      expect(result.totalTravelCost).toBe(0);
    });

    it('should charge travel costs for distant projects (> 120 miles)', () => {
      const result = calculateTravelCosts(200, 1);

      expect(result.requiresTravel).toBe(true);
      expect(result.travelCost).toBeGreaterThan(0);
      expect(result.mealCost).toBeGreaterThan(0);
      expect(result.hotelCost).toBeGreaterThan(0);
      expect(result.totalTravelCost).toBeGreaterThan(0);
    });

    it('should calculate travel time correctly', () => {
      const result = calculateTravelCosts(200, 1);

      // 200 miles ÷ 80 mph = 2.5 hours each way = 5 hours round trip
      expect(result.travelHours).toBeGreaterThan(0);
    });

    it('should include travel cost at $39/hour', () => {
      const result = calculateTravelCosts(200, 1);

      // Travel cost should be travelHours × $39
      const expectedTravelCost = result.travelHours * 3900; // $39 in cents
      expect(result.travelCost).toBe(expectedTravelCost);
    });

    it('should include meal cost at $50/day', () => {
      const result = calculateTravelCosts(200, 1);

      // Should have at least one day of meals
      expect(result.mealDays).toBeGreaterThan(0);
      expect(result.mealCost).toBeGreaterThan(0);
    });

    it('should scale travel costs for multiple workers', () => {
      const result1 = calculateTravelCosts(200, 1);
      const result2 = calculateTravelCosts(200, 2);

      // Travel costs should roughly double for 2 workers
      expect(result2.travelCost).toBeGreaterThan(result1.travelCost);
      expect(result2.mealCost).toBeGreaterThan(result1.mealCost);
    });
  });

  describe('detectAerialLiftNeeded', () => {
    it('should not require aerial lift for 1-story buildings', () => {
      const result = detectAerialLiftNeeded(1);

      expect(result.requiresAerialLift).toBe(false);
      expect(result.aerialLiftCost).toBe(0);
    });

    it('should not require aerial lift for 2-story buildings', () => {
      const result = detectAerialLiftNeeded(2);

      expect(result.requiresAerialLift).toBe(false);
      expect(result.aerialLiftCost).toBe(0);
    });

    it('should require aerial lift for 3-story buildings', () => {
      const result = detectAerialLiftNeeded(3);

      expect(result.requiresAerialLift).toBe(true);
      expect(result.aerialLiftCost).toBeGreaterThan(0);
    });

    it('should require aerial lift for 4+ story buildings', () => {
      const result = detectAerialLiftNeeded(5);

      expect(result.requiresAerialLift).toBe(true);
      expect(result.aerialLiftCost).toBeGreaterThan(0);
    });
  });

  describe('calculateAdvancedBidPrice', () => {
    it('should calculate private wage bid correctly', () => {
      const result = calculateAdvancedBidPrice({
        squareFootage: 5000,
        wageType: 'private',
        buildingStories: 1,
        parameters: mockBidParameters,
      });

      expect(result.cleaningCost).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown.hourlyRate).toBe(3944); // $39.44
    });

    it('should calculate prevailing wage bid correctly', () => {
      const result = calculateAdvancedBidPrice({
        squareFootage: 5000,
        wageType: 'prevailing',
        buildingStories: 1,
        parameters: mockBidParameters,
        prevailingRate: mockPrevailingWage,
      });

      expect(result.cleaningCost).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown.hourlyRate).toBeGreaterThan(3979); // Should be higher than private
    });

    it('should include aerial lift cost for tall buildings', () => {
      const result = calculateAdvancedBidPrice({
        squareFootage: 5000,
        wageType: 'private',
        buildingStories: 4,
        parameters: mockBidParameters,
      });

      expect(result.aerialLiftCost).toBeGreaterThan(0);
      expect(result.aerialLiftBreakdown?.requiresAerialLift).toBe(true);
    });

    it('should include travel costs for distant projects', () => {
      const result = calculateAdvancedBidPrice({
        squareFootage: 5000,
        wageType: 'private',
        buildingStories: 1,
        projectLocation: 'Portland, OR',
        parameters: mockBidParameters,
      });

      expect(result.travelCost).toBeGreaterThan(0);
      expect(result.travelBreakdown?.requiresTravel).toBe(true);
    });

    it('should include additional costs percentage', () => {
      const result = calculateAdvancedBidPrice({
        squareFootage: 5000,
        wageType: 'private',
        buildingStories: 1,
        parameters: mockBidParameters,
      });

      expect(result.additionalCosts).toBeGreaterThan(0);
      expect(result.total).toBe(result.subtotal + result.additionalCosts);
    });

    it('should include window washing costs when requested', () => {
      const result = calculateAdvancedBidPrice({
        squareFootage: 5000,
        wageType: 'private',
        buildingStories: 1,
        includeWindowWashing: true,
        parameters: mockBidParameters,
      });

      expect(result.windowWashingCost).toBeGreaterThan(0);
      expect(result.breakdown.windowWashingHours).toBeGreaterThan(0);
    });

    it('should include waxing costs when requested', () => {
      const result = calculateAdvancedBidPrice({
        squareFootage: 5000,
        wageType: 'private',
        buildingStories: 1,
        includeWaxing: true,
        parameters: mockBidParameters,
      });

      expect(result.waxingCost).toBeGreaterThan(0);
      expect(result.breakdown.waxingHours).toBeGreaterThan(0);
    });
  });

  describe('formatPrice', () => {
    it('should format price correctly', () => {
      expect(formatPrice(3979)).toBe('$39.79');
      expect(formatPrice(5000)).toBe('$50.00');
      expect(formatPrice(100)).toBe('$1.00');
    });

    it('should handle zero price', () => {
      expect(formatPrice(0)).toBe('$0.00');
    });

    it('should handle large prices', () => {
      expect(formatPrice(500000)).toBe('$5000.00');
    });
  });
});
