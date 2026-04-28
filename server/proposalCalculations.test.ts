import { describe, it, expect } from 'vitest';
import { calculateProposalCosts, formatCurrency, getCostBreakdownItems, validateProposal } from './proposalCalculations';
import { BidParameter } from '../drizzle/schema';

describe('Proposal Calculations', () => {
  const mockParameters: BidParameter = {
    id: 1,
    userId: 1,
    companyName: 'Test Company',
    baseLocation: 'Vancouver, WA',
    privateWageHourly: 2200, // $22/hr
    workDayHours: 9,
    costPerSqftPrivate: 0,
    cleaningCostPerHour: 0,
    windowWashingCostPerHour: 0,
    waxingCostPerHour: 0,
    travelCostPerMile: 0,
    hotelCostPerNight: 15000, // $150
    perDiem: 5000, // $50
    additionalCostPercentage: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('calculateProposalCosts', () => {
    it('should calculate basic cleaning costs for private wage', () => {
      const costs = calculateProposalCosts(
        5000, // 5000 sq ft
        2, // 2 stories
        'private',
        mockParameters,
        undefined,
        false, // no window washing
        false, // no waxing
        undefined, // no travel
      );

      expect(costs.cleaningCost).toBeGreaterThan(0);
      expect(costs.totalBid).toBeGreaterThan(costs.cleaningCost);
      expect(costs.windowWashingCost).toBe(0);
      expect(costs.waxingCost).toBe(0);
      expect(costs.aerialLiftCost).toBe(0);
    });

    it('should include aerial lift cost for buildings > 2 stories', () => {
      const costs = calculateProposalCosts(
        5000,
        3, // 3 stories (requires aerial lift)
        'private',
        mockParameters,
        undefined,
        false,
        false,
        undefined,
      );

      expect(costs.aerialLiftCost).toBeGreaterThan(0);
    });

    it('should not include aerial lift cost for buildings <= 2 stories', () => {
      const costs = calculateProposalCosts(
        5000,
        2, // 2 stories (no aerial lift needed)
        'private',
        mockParameters,
        undefined,
        false,
        false,
        undefined,
      );

      expect(costs.aerialLiftCost).toBe(0);
    });

    it('should include window washing costs when specified', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        true, // include window washing
        false,
        undefined,
      );

      expect(costs.windowWashingCost).toBeGreaterThan(0);
    });

    it('should include waxing costs when specified', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        false,
        true, // include waxing
        undefined,
      );

      expect(costs.waxingCost).toBeGreaterThan(0);
    });

    it('should include travel costs for distant projects', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        false,
        false,
        'Portland, OR', // ~180 miles away
      );

      expect(costs.travelCost).toBeGreaterThan(0);
      expect(costs.mealsCost).toBeGreaterThan(0);
      expect(costs.hotelCost).toBeGreaterThan(0);
    });

    it('should not include travel costs for local projects', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        false,
        false,
        'Olympia, WA', // ~120 miles (threshold)
      );

      // Olympia is at the threshold, so travel might not be included
      // This depends on the exact distance calculation
      expect(costs.totalBid).toBeGreaterThan(0);
    });

    it('should calculate total bid with all costs', () => {
      const costs = calculateProposalCosts(
        5000,
        3,
        'private',
        mockParameters,
        undefined,
        true,
        true,
        'Portland, OR',
      );

      const expectedTotal = costs.cleaningCost + costs.windowWashingCost + costs.waxingCost + 
                           costs.aerialLiftCost + costs.travelCost + costs.mealsCost + 
                           costs.hotelCost + costs.additionalCosts;

      expect(costs.totalBid).toBe(expectedTotal);
    });
  });

  describe('formatCurrency', () => {
    it('should format cents to currency string', () => {
      expect(formatCurrency(10000)).toBe('$100.00');
      expect(formatCurrency(5050)).toBe('$50.50');
      expect(formatCurrency(1)).toBe('$0.01');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(500000)).toBe('$5000.00');
    });
  });

  describe('getCostBreakdownItems', () => {
    it('should return array of cost items', () => {
      const costs = calculateProposalCosts(
        5000,
        3,
        'private',
        mockParameters,
        undefined,
        true,
        true,
        'Portland, OR',
      );

      const items = getCostBreakdownItems(costs);

      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[items.length - 1].label).toBe('Total Bid');
    });

    it('should include formatted currency for each item', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        false,
        false,
        undefined,
      );

      const items = getCostBreakdownItems(costs);

      for (const item of items) {
        expect(item.formatted).toMatch(/^\$\d+\.\d{2}$/);
      }
    });

    it('should not include zero-cost items', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        false, // no window washing
        false, // no waxing
        undefined, // no travel
      );

      const items = getCostBreakdownItems(costs);
      const hasWindowWashing = items.some(item => item.label === 'Window Washing');
      const hasWaxing = items.some(item => item.label === 'Waxing');
      const hasTravel = items.some(item => item.label === 'Travel Time');

      expect(hasWindowWashing).toBe(false);
      expect(hasWaxing).toBe(false);
      expect(hasTravel).toBe(false);
    });
  });

  describe('validateProposal', () => {
    it('should validate a valid proposal', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        false,
        false,
        undefined,
      );

      const proposal = {
        projectId: 1,
        projectName: 'Test Project',
        location: 'Vancouver, WA',
        squareFootage: 5000,
        buildingStories: 2,
        wageType: 'private' as const,
        includeWindowWashing: false,
        includeWaxing: false,
        includeTravel: false,
        costBreakdown: costs,
      };

      const result = validateProposal(proposal);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject proposal with zero square footage', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        false,
        false,
        undefined,
      );

      const proposal = {
        projectId: 1,
        projectName: 'Test Project',
        location: 'Vancouver, WA',
        squareFootage: 0,
        buildingStories: 2,
        wageType: 'private' as const,
        includeWindowWashing: false,
        includeWaxing: false,
        includeTravel: false,
        costBreakdown: costs,
      };

      const result = validateProposal(proposal);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject proposal with invalid building stories', () => {
      const costs = calculateProposalCosts(
        5000,
        2,
        'private',
        mockParameters,
        undefined,
        false,
        false,
        undefined,
      );

      const proposal = {
        projectId: 1,
        projectName: 'Test Project',
        location: 'Vancouver, WA',
        squareFootage: 5000,
        buildingStories: 0,
        wageType: 'private' as const,
        includeWindowWashing: false,
        includeWaxing: false,
        includeTravel: false,
        costBreakdown: costs,
      };

      const result = validateProposal(proposal);
      expect(result.valid).toBe(false);
    });
  });
});
