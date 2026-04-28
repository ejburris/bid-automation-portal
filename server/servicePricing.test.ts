import { describe, it, expect } from 'vitest';
import {
  calculateServicePricing,
  formatServicePricing,
  getPricingRates,
  needsAerialLift,
  calculateAerialLiftSurcharge,
} from './servicePricing';

describe('Service Pricing Engine', () => {
  describe('Private Wage Pricing', () => {
    it('should calculate waxing cost correctly', () => {
      const result = calculateServicePricing({
        waxingSqft: 1000,
        carpetSqft: 0,
        windowCount: 0,
        floorCount: 1,
        isPrivateWage: true,
      });

      // 1000 sqft × $0.47 = $470 = 47000 cents
      expect(result.waxingCost).toBe(47000);
      expect(result.carpetCost).toBe(0);
      expect(result.windowCost).toBe(0);
      expect(result.aerialLiftCost).toBe(0);
      expect(result.totalServiceCost).toBe(47000);
    });

    it('should calculate carpet cost correctly', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 500,
        windowCount: 0,
        floorCount: 1,
        isPrivateWage: true,
      });

      // 500 sqft × $0.13 = $65 = 6500 cents
      expect(result.carpetCost).toBe(6500);
      expect(result.totalServiceCost).toBe(6500);
    });

    it('should calculate window cost without aerial lift', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 20,
        floorCount: 1,
        isPrivateWage: true,
      });

      // 20 windows × $15 = $300 = 30000 cents
      expect(result.windowCost).toBe(30000);
      expect(result.aerialLiftCost).toBe(0);
      expect(result.totalServiceCost).toBe(30000);
    });

    it('should add aerial lift surcharge for 2nd+ floors', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 20,
        floorCount: 2,
        isPrivateWage: true,
      });

      // Base: 20 × $15 = $300 = 30000 cents
      // Aerial Lift: 20 × $25 = $500 = 50000 cents
      // Total: 80000 cents
      expect(result.windowCost).toBe(30000);
      expect(result.aerialLiftCost).toBe(50000);
      expect(result.totalServiceCost).toBe(80000);
    });

    it('should calculate combined services correctly', () => {
      const result = calculateServicePricing({
        waxingSqft: 500,
        carpetSqft: 300,
        windowCount: 15,
        floorCount: 1,
        isPrivateWage: true,
      });

      // Waxing: 500 × $0.47 = $235 = 23500 cents
      // Carpet: 300 × $0.13 = $39 = 3900 cents
      // Windows: 15 × $15 = $225 = 22500 cents
      // Total: 49900 cents
      expect(result.waxingCost).toBe(23500);
      expect(result.carpetCost).toBe(3900);
      expect(result.windowCost).toBe(22500);
      expect(result.aerialLiftCost).toBe(0);
      expect(result.totalServiceCost).toBe(49900);
    });
  });

  describe('Prevailing Wage Pricing', () => {
    it('should calculate waxing cost correctly', () => {
      const result = calculateServicePricing({
        waxingSqft: 1000,
        carpetSqft: 0,
        windowCount: 0,
        floorCount: 1,
        isPrivateWage: false,
      });

      // 1000 sqft × $1.50 = $1500 = 150000 cents
      expect(result.waxingCost).toBe(150000);
      expect(result.totalServiceCost).toBe(150000);
    });

    it('should calculate carpet cost correctly', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 500,
        windowCount: 0,
        floorCount: 1,
        isPrivateWage: false,
      });

      // 500 sqft × $0.81 = $405 = 40500 cents
      expect(result.carpetCost).toBe(40500);
      expect(result.totalServiceCost).toBe(40500);
    });

    it('should calculate window cost without aerial lift', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 20,
        floorCount: 1,
        isPrivateWage: false,
      });

      // 20 windows × $35 = $700 = 70000 cents
      expect(result.windowCost).toBe(70000);
      expect(result.aerialLiftCost).toBe(0);
      expect(result.totalServiceCost).toBe(70000);
    });

    it('should add aerial lift surcharge for 2nd+ floors', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 20,
        floorCount: 2,
        isPrivateWage: false,
      });

      // Base: 20 × $35 = $700 = 70000 cents
      // Aerial Lift: 20 × $60 = $1200 = 120000 cents
      // Total: 190000 cents
      expect(result.windowCost).toBe(70000);
      expect(result.aerialLiftCost).toBe(120000);
      expect(result.totalServiceCost).toBe(190000);
    });

    it('should calculate combined services correctly', () => {
      const result = calculateServicePricing({
        waxingSqft: 500,
        carpetSqft: 300,
        windowCount: 15,
        floorCount: 1,
        isPrivateWage: false,
      });

      // Waxing: 500 × $1.50 = $750 = 75000 cents
      // Carpet: 300 × $0.81 = $243 = 24300 cents
      // Windows: 15 × $35 = $525 = 52500 cents
      // Total: 151800 cents
      expect(result.waxingCost).toBe(75000);
      expect(result.carpetCost).toBe(24300);
      expect(result.windowCost).toBe(52500);
      expect(result.aerialLiftCost).toBe(0);
      expect(result.totalServiceCost).toBe(151800);
    });
  });

  describe('Aerial Lift Detection', () => {
    it('should not require aerial lift for single floor', () => {
      expect(needsAerialLift(1)).toBe(false);
    });

    it('should require aerial lift for 2 floors', () => {
      expect(needsAerialLift(2)).toBe(true);
    });

    it('should require aerial lift for 3+ floors', () => {
      expect(needsAerialLift(3)).toBe(true);
      expect(needsAerialLift(5)).toBe(true);
      expect(needsAerialLift(10)).toBe(true);
    });
  });

  describe('Aerial Lift Surcharge Calculation', () => {
    it('should return 0 for single floor private wage', () => {
      const surcharge = calculateAerialLiftSurcharge(20, 1, true);
      expect(surcharge).toBe(0);
    });

    it('should calculate surcharge for 2 floors private wage', () => {
      const surcharge = calculateAerialLiftSurcharge(20, 2, true);
      // 20 × $25 = $500 = 50000 cents
      expect(surcharge).toBe(50000);
    });

    it('should calculate surcharge for 2 floors prevailing wage', () => {
      const surcharge = calculateAerialLiftSurcharge(20, 2, false);
      // 20 × $60 = $1200 = 120000 cents
      expect(surcharge).toBe(120000);
    });

    it('should scale with window count', () => {
      const surcharge10 = calculateAerialLiftSurcharge(10, 2, true);
      const surcharge20 = calculateAerialLiftSurcharge(20, 2, true);
      expect(surcharge20).toBe(surcharge10 * 2);
    });
  });

  describe('Pricing Rates', () => {
    it('should return private wage rates', () => {
      const rates = getPricingRates(true);
      expect(rates.waxing).toBe(0.47);
      expect(rates.carpet).toBe(0.13);
      expect(rates.windowBase).toBe(15);
      expect(rates.windowAerialLift).toBe(25);
    });

    it('should return prevailing wage rates', () => {
      const rates = getPricingRates(false);
      expect(rates.waxing).toBe(1.5);
      expect(rates.carpet).toBe(0.81);
      expect(rates.windowBase).toBe(35);
      expect(rates.windowAerialLift).toBe(60);
    });
  });

  describe('Formatting', () => {
    it('should format service pricing result', () => {
      const result = calculateServicePricing({
        waxingSqft: 500,
        carpetSqft: 300,
        windowCount: 15,
        floorCount: 1,
        isPrivateWage: true,
      });

      const formatted = formatServicePricing(result);

      expect(formatted).toContain('Waxing: 500 sqft');
      expect(formatted).toContain('Carpet: 300 sqft');
      expect(formatted).toContain('Windows: 15 windows');
      expect(formatted).toContain('Total Service Cost');
      expect(formatted).not.toContain('Aerial Lift');
    });

    it('should include aerial lift in formatted output', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 20,
        floorCount: 2,
        isPrivateWage: true,
      });

      const formatted = formatServicePricing(result);

      expect(formatted).toContain('Aerial Lift Surcharge');
      expect(formatted).toContain('$500.00');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 0,
        floorCount: 1,
        isPrivateWage: true,
      });

      expect(result.totalServiceCost).toBe(0);
    });

    it('should handle large window counts', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 500,
        floorCount: 1,
        isPrivateWage: true,
      });

      // 500 × $15 = $7500 = 750000 cents
      expect(result.windowCost).toBe(750000);
    });

    it('should handle large sqft values', () => {
      const result = calculateServicePricing({
        waxingSqft: 50000,
        carpetSqft: 30000,
        windowCount: 0,
        floorCount: 1,
        isPrivateWage: true,
      });

      // Waxing: 50000 × $0.47 = $23500 = 2350000 cents
      // Carpet: 30000 × $0.13 = $3900 = 390000 cents
      expect(result.waxingCost).toBe(2350000);
      expect(result.carpetCost).toBe(390000);
    });

    it('should handle high floor counts', () => {
      const result = calculateServicePricing({
        waxingSqft: 0,
        carpetSqft: 0,
        windowCount: 20,
        floorCount: 20,
        isPrivateWage: true,
      });

      // Aerial lift still applies for 20 floors
      expect(result.aerialLiftCost).toBe(50000);
    });
  });

  describe('Breakdown Information', () => {
    it('should provide detailed breakdown', () => {
      const result = calculateServicePricing({
        waxingSqft: 500,
        carpetSqft: 300,
        windowCount: 15,
        floorCount: 2,
        isPrivateWage: true,
      });

      expect(result.breakdown.waxingSqft).toBe(500);
      expect(result.breakdown.carpetSqft).toBe(300);
      expect(result.breakdown.windowCount).toBe(15);
      expect(result.breakdown.floorCount).toBe(2);
      expect(result.breakdown.needsAerialLift).toBe(true);
      expect(result.breakdown.waxingPricePerSqft).toBe(0.47);
      expect(result.breakdown.carpetPricePerSqft).toBe(0.13);
      expect(result.breakdown.windowPricePerUnit).toBe(15);
      expect(result.breakdown.aerialLiftSurchargePerWindow).toBe(25);
    });
  });
});
