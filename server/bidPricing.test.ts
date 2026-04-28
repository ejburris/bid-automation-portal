import { describe, it, expect } from 'vitest';

/**
 * Test suite for the new bid pricing model
 * - Private wage: $350/person/day with $595 minimum
 * - Prevailing wage: $940.50/person/day
 * - Services (waxing, carpet, windows) are add-ons
 */

interface BidPricingInput {
  crewPeople: number;
  crewDays: number;
  isPrivateWage: boolean;
  includeWaxing: boolean;
  includeCarpet: boolean;
  includeWindows: boolean;
  projectSqft?: number;
  travelCost?: number;
}

function calculateBidPrice(input: BidPricingInput): number {
  const PRIVATE_WAGE_PER_PERSON_PER_DAY = 350;
  const PREVAILING_WAGE_PER_PERSON_PER_DAY = 940.50;
  const PRIVATE_WAGE_MINIMUM = 595;
  
  // Base crew cost
  let baseCost = 0;
  if (input.isPrivateWage) {
    baseCost = Math.max(
      input.crewPeople * input.crewDays * PRIVATE_WAGE_PER_PERSON_PER_DAY,
      PRIVATE_WAGE_MINIMUM
    );
  } else {
    baseCost = input.crewPeople * input.crewDays * PREVAILING_WAGE_PER_PERSON_PER_DAY;
  }

  // Add-on services (estimated at $50-100 per service for now)
  let addOnCost = 0;
  if (input.includeWaxing) addOnCost += 100;
  if (input.includeCarpet) addOnCost += 100;
  if (input.includeWindows) addOnCost += 100;

  // Travel cost
  const travelCost = input.travelCost || 0;

  return Math.round((baseCost + addOnCost + travelCost) * 100); // Return in cents
}

describe('Bid Pricing Model', () => {
  describe('Private Wage Calculations', () => {
    it('should calculate $350/person/day for private wage', () => {
      const bid: BidPricingInput = {
        crewPeople: 2,
        crewDays: 1,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
      };
      
      const price = calculateBidPrice(bid);
      // 2 people × 1 day × $350 = $700
      expect(price).toBe(70000); // in cents
    });

    it('should apply $595 minimum for private wage', () => {
      const bid: BidPricingInput = {
        crewPeople: 1,
        crewDays: 1,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
      };
      
      const price = calculateBidPrice(bid);
      // 1 person × 1 day × $350 = $350, but minimum is $595
      expect(price).toBe(59500); // in cents
    });

    it('should support fractional crew sizes', () => {
      const bid: BidPricingInput = {
        crewPeople: 1.5,
        crewDays: 1,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
      };
      
      const price = calculateBidPrice(bid);
      // 1.5 people × 1 day × $350 = $525, but minimum is $595
      expect(price).toBe(59500); // in cents
    });

    it('should calculate multiple days correctly', () => {
      const bid: BidPricingInput = {
        crewPeople: 2,
        crewDays: 1.5,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
      };
      
      const price = calculateBidPrice(bid);
      // 2 people × 1.5 days × $350 = $1,050
      expect(price).toBe(105000); // in cents
    });
  });

  describe('Prevailing Wage Calculations', () => {
    it('should calculate $940.50/person/day for prevailing wage', () => {
      const bid: BidPricingInput = {
        crewPeople: 2,
        crewDays: 1,
        isPrivateWage: false,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
      };
      
      const price = calculateBidPrice(bid);
      // 2 people × 1 day × $940.50 = $1,881
      expect(price).toBe(188100); // in cents
    });

    it('should support fractional crew for prevailing wage', () => {
      const bid: BidPricingInput = {
        crewPeople: 1.5,
        crewDays: 1,
        isPrivateWage: false,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
      };
      
      const price = calculateBidPrice(bid);
      // 1.5 people × 1 day × $940.50 = $1,410.75
      expect(price).toBe(141075); // in cents
    });
  });

  describe('Add-on Services', () => {
    it('should add waxing cost', () => {
      const bid: BidPricingInput = {
        crewPeople: 1,
        crewDays: 1,
        isPrivateWage: true,
        includeWaxing: true,
        includeCarpet: false,
        includeWindows: false,
      };
      
      const price = calculateBidPrice(bid);
      // $595 minimum + $100 waxing = $695
      expect(price).toBe(69500); // in cents
    });

    it('should add multiple services', () => {
      const bid: BidPricingInput = {
        crewPeople: 2,
        crewDays: 1,
        isPrivateWage: true,
        includeWaxing: true,
        includeCarpet: true,
        includeWindows: true,
      };
      
      const price = calculateBidPrice(bid);
      // $700 base + $100 waxing + $100 carpet + $100 windows = $1,000
      expect(price).toBe(100000); // in cents
    });
  });

  describe('Travel Costs', () => {
    it('should include travel costs in total', () => {
      const bid: BidPricingInput = {
        crewPeople: 2,
        crewDays: 1,
        isPrivateWage: true,
        includeWaxing: false,
        includeCarpet: false,
        includeWindows: false,
        travelCost: 200, // $200 travel cost
      };
      
      const price = calculateBidPrice(bid);
      // $700 base + $200 travel = $900
      expect(price).toBe(90000); // in cents
    });
  });

  describe('Complex Scenarios', () => {
    it('should calculate a realistic private wage project', () => {
      const bid: BidPricingInput = {
        crewPeople: 2,
        crewDays: 1.5,
        isPrivateWage: true,
        includeWaxing: true,
        includeCarpet: false,
        includeWindows: true,
        travelCost: 150,
      };
      
      const price = calculateBidPrice(bid);
      // $1,050 base + $100 waxing + $100 windows + $150 travel = $1,400
      expect(price).toBe(140000); // in cents
    });

    it('should calculate a realistic prevailing wage project', () => {
      const bid: BidPricingInput = {
        crewPeople: 3,
        crewDays: 2,
        isPrivateWage: false,
        includeWaxing: true,
        includeCarpet: true,
        includeWindows: true,
        travelCost: 300,
      };
      
      const price = calculateBidPrice(bid);
      // $5,643 base (3 × 2 × $940.50) + $300 services + $300 travel = $6,243
      expect(price).toBe(624300); // in cents
    });
  });
});
