import { describe, it, expect } from 'vitest';
import { estimateCrewSize, calculateBidWithCrewEstimation, formatCrewEstimationBreakdown } from './crewEstimation';

describe('Crew Estimation Engine', () => {
  describe('Private Wage - Base Cleaning', () => {
    it('should estimate crew for 5000 sqft private wage project', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // 5000 × $0.27 = $1,350 ÷ $350/day ÷ 1 day = 3.86 ≈ 4 people
      expect(result.baseCost).toBe(1350);
      expect(result.totalServiceCost).toBe(1350);
      expect(result.estimatedCrewPeople).toBe(4);
    });

    it('should apply $595 minimum for small private wage projects', () => {
      const result = estimateCrewSize({
        projectSqft: 1000,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // 1000 × $0.27 = $270, but minimum is $595
      // $595 ÷ $350/day ÷ 1 day = 1.7 ≈ 1.5 people
      expect(result.baseCost).toBe(270);
      expect(result.estimatedCrewPeople).toBe(1.5);
    });

    it('should handle multiple days correctly', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 2,
      });

      // 5000 × $0.27 = $1,350 ÷ $350/day ÷ 2 days = 1.93 ≈ 2 people
      expect(result.estimatedCrewPeople).toBe(2);
    });

    it('should support fractional days', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1.5,
      });

      // 5000 × $0.27 = $1,350 ÷ $350/day ÷ 1.5 days = 2.57 ≈ 2.5 people
      expect(result.estimatedCrewPeople).toBe(2.5);
    });
  });

  describe('Private Wage - With Waxing', () => {
    it('should include waxing cost in crew estimation', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: true,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // Base: 5000 × $0.27 = $1,350
      // Waxing: 5000 × $0.47 = $2,350
      // Total: $3,700 ÷ $350/day ÷ 1 day = 10.57 ≈ 10.5 people
      expect(result.baseCost).toBe(1350);
      expect(Math.round(result.waxingCost)).toBe(2350);
      expect(Math.round(result.totalServiceCost)).toBe(3700);
      expect(result.estimatedCrewPeople).toBe(10.5);
    });

    it('should handle waxing with multiple days', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: true,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 2,
      });

      // Total: $3,700 ÷ $350/day ÷ 2 days = 5.29 ≈ 5.5 people
      expect(result.estimatedCrewPeople).toBe(5.5);
    });
  });

  describe('Private Wage - With Carpet', () => {
    it('should include carpet cost in crew estimation', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: true,
        includeWindows: false,
        crewDays: 1,
      });

      // Base: 5000 × $0.27 = $1,350
      // Carpet: 5000 × $0.13 = $650
      // Total: $2,000 ÷ $350/day ÷ 1 day = 5.71 ≈ 5.5 people
      expect(result.baseCost).toBe(1350);
      expect(result.carpetCost).toBe(650);
      expect(result.totalServiceCost).toBe(2000);
      expect(result.estimatedCrewPeople).toBe(5.5);
    });
  });

  describe('Private Wage - Multiple Services', () => {
    it('should combine waxing and carpet costs', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: true,
        includeCarpet: true,
        includeWindows: false,
        crewDays: 1,
      });

      // Base: 5000 × $0.27 = $1,350
      // Waxing: 5000 × $0.47 = $2,350
      // Carpet: 5000 × $0.13 = $650
      // Total: $4,350 ÷ $350/day ÷ 1 day = 12.43 ≈ 12.5 people
      expect(Math.round(result.totalServiceCost)).toBe(4350);
      expect(result.estimatedCrewPeople).toBe(12.5);
    });
  });

  describe('Prevailing Wage - Base Cleaning', () => {
    it('should estimate crew for 5000 sqft prevailing wage project', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: false,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // 5000 × $0.59 = $2,950 ÷ $940.50/day ÷ 1 day = 3.14 ≈ 3 people
      expect(result.baseCost).toBe(2950);
      expect(result.estimatedCrewPeople).toBe(3);
    });

    it('should not apply minimum for prevailing wage', () => {
      const result = estimateCrewSize({
        projectSqft: 1000,
        isPrivateWage: false,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // 1000 × $0.59 = $590 ÷ $940.50/day ÷ 1 day = 0.63 ≈ 0.5 (but min 1)
      expect(result.baseCost).toBe(590);
      expect(result.estimatedCrewPeople).toBe(1); // Minimum 1 person
    });
  });

  describe('Prevailing Wage - With Waxing', () => {
    it('should include waxing cost in prevailing wage estimation', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: false,
        includeWaxing: true,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // Base: 5000 × $0.59 = $2,950
      // Waxing: 5000 × $1.50 = $7,500
      // Total: $10,450 ÷ $940.50/day ÷ 1 day = 11.1 ≈ 11 people
      expect(result.baseCost).toBe(2950);
      expect(Math.round(result.waxingCost)).toBe(7500);
      expect(Math.round(result.totalServiceCost)).toBe(10450);
      expect(result.estimatedCrewPeople).toBe(11);
    });
  });

  describe('Prevailing Wage - With Carpet', () => {
    it('should include carpet cost in prevailing wage estimation', () => {
      const result = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: false,
        includeWaxing: false,
        includeCarpet: true,
        includeWindows: false,
        crewDays: 1,
      });

      // Base: 5000 × $0.59 = $2,950
      // Carpet: 5000 × $0.81 = $4,050
      // Total: $7,000 ÷ $940.50/day ÷ 1 day = 7.44 ≈ 7.5 people
      expect(result.baseCost).toBe(2950);
      expect(Math.round(result.carpetCost)).toBe(4050);
      expect(Math.round(result.totalServiceCost)).toBe(7000);
      expect(result.estimatedCrewPeople).toBe(7.5);
    });
  });

  describe('Bid Calculation with Crew Estimation', () => {
    it('should calculate total bid with crew estimation', () => {
      const result = calculateBidWithCrewEstimation({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
        travelCost: 200,
        additionalCosts: 100,
      });

      // Base bid: 4 people × $350/day × 1 day = $1,400
      // Total: $1,400 + $200 + $100 = $1,700
      expect(result.estimatedCrewPeople).toBe(4);
      expect(result.baseBidAmount).toBe(1400);
      expect(result.totalBidAmount).toBe(1700);
    });

    it('should apply minimum bid for private wage', () => {
      const result = calculateBidWithCrewEstimation({
        projectSqft: 1000,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
        travelCost: 0,
        additionalCosts: 0,
      });

      // Base bid: 1.5 people × $350/day × 1 day = $525, but minimum is $595
      expect(result.baseBidAmount).toBe(595);
      expect(result.totalBidAmount).toBe(595);
    });
  });

  describe('Breakdown Formatting', () => {
    it('should format breakdown with all services', () => {
      const estimation = estimateCrewSize({
        projectSqft: 5000,
        isPrivateWage: true,
        includeWaxing: true,
        includeCarpet: true,
        includeWindows: false,
        crewDays: 1,
      });

      const formatted = formatCrewEstimationBreakdown(estimation);

      expect(formatted).toContain('Square Footage: 5,000 sqft');
      expect(formatted).toContain('Base Cleaning');
      expect(formatted).toContain('Waxing');
      expect(formatted).toContain('Carpet');
      expect(formatted).toContain('Total Service Cost');
      expect(formatted).toContain('Crew Estimation');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero square footage', () => {
      const result = estimateCrewSize({
        projectSqft: 0,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // Zero sqft returns null
      expect(result).toBeNull();
    });

    it('should round crew size to nearest 0.5', () => {
      const result = estimateCrewSize({
        projectSqft: 3500,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // 3500 × $0.27 = $945 ÷ $350/day ÷ 1 day = 2.7 ≈ 2.5
      expect(result).not.toBeNull();
      if (result) {
        expect(result.estimatedCrewPeople).toBe(2.5);
      }
    });

    it('should ensure minimum crew of 1 person', () => {
      const result = estimateCrewSize({
        projectSqft: 100,
        isPrivateWage: false,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        crewDays: 1,
      });

      // 100 × $0.59 = $59 ÷ $940.50/day ÷ 1 day = 0.06 ≈ 0, but minimum is 1
      expect(result).not.toBeNull();
      if (result) {
        expect(result.estimatedCrewPeople).toBeGreaterThanOrEqual(1);
      }
    });

    it('should handle large projects', () => {
      const result = estimateCrewSize({
        projectSqft: 100000,
        isPrivateWage: true,
        includeWaxing: true,
        includeCarpet: true,
        includeWindows: false,
        crewDays: 1,
      });

      // Base: 100000 × $0.27 = $27,000
      // Waxing: 100000 × $0.47 = $47,000
      // Carpet: 100000 × $0.13 = $13,000
      // Total: $87,000 ÷ $350/day ÷ 1 day = 248.57 ≈ 248.5 people
      expect(result).not.toBeNull();
      if (result) {
        expect(result.estimatedCrewPeople).toBe(248.5);
      }
    });
  });
});
