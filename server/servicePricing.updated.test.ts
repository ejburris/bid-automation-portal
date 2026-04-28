import { describe, it, expect } from 'vitest';
import { calculateServicePricing, getDefaultAerialLiftCost } from './servicePricing';

describe('Service Pricing - Updated Aerial Lift Model', () => {
  describe('Aerial Lift Flat Fee ($850)', () => {
    it('should apply $850 flat fee for 2nd+ floors', () => {
      const result = calculateServicePricing({
        windowCount: 100,
        floorCount: 2,
        isPrivateWage: true,
      });

      const baseWindowCost = 100 * 15 * 100; // 100 windows × $15 = $1,500
      const aerialLiftCost = 850 * 100; // $850 flat fee in cents

      expect(result.windowCost).toBe(baseWindowCost);
      expect(result.aerialLiftCost).toBe(aerialLiftCost);
      expect(result.totalServiceCost).toBe(baseWindowCost + aerialLiftCost);
    });

    it('should not apply aerial lift for single floor', () => {
      const result = calculateServicePricing({
        windowCount: 100,
        floorCount: 1,
        isPrivateWage: true,
      });

      expect(result.aerialLiftCost).toBe(0);
      expect(result.windowCost).toBe(100 * 15 * 100);
    });

    it('should allow custom aerial lift cost', () => {
      const result = calculateServicePricing({
        windowCount: 100,
        floorCount: 2,
        isPrivateWage: true,
        aerialLiftCost: 1200, // Special lift
      });

      const customLiftCost = 1200 * 100; // $1,200 in cents
      expect(result.aerialLiftCost).toBe(customLiftCost);
    });

    it('should use default $850 when not specified', () => {
      expect(getDefaultAerialLiftCost()).toBe(850);
    });
  });

  describe('Window Pricing with Aerial Lift', () => {
    it('should calculate prevailing wage windows with $850 aerial lift', () => {
      const result = calculateServicePricing({
        windowCount: 50,
        floorCount: 3,
        isPrivateWage: false, // Prevailing wage
      });

      const baseWindowCost = 50 * 35 * 100; // 50 windows × $35 = $1,750
      const aerialLiftCost = 850 * 100; // $850 flat fee

      expect(result.windowCost).toBe(baseWindowCost);
      expect(result.aerialLiftCost).toBe(aerialLiftCost);
      expect(result.totalServiceCost).toBe(baseWindowCost + aerialLiftCost);
    });

    it('should calculate private wage windows with $850 aerial lift', () => {
      const result = calculateServicePricing({
        windowCount: 75,
        floorCount: 2,
        isPrivateWage: true,
      });

      const baseWindowCost = 75 * 15 * 100; // 75 windows × $15 = $1,125
      const aerialLiftCost = 850 * 100; // $850 flat fee

      expect(result.windowCost).toBe(baseWindowCost);
      expect(result.aerialLiftCost).toBe(aerialLiftCost);
      expect(result.totalServiceCost).toBe(baseWindowCost + aerialLiftCost);
    });
  });

  describe('Combined Services with Aerial Lift', () => {
    it('should calculate waxing + carpet + windows + aerial lift', () => {
      const result = calculateServicePricing({
        waxingSqft: 1000,
        carpetSqft: 500,
        windowCount: 100,
        floorCount: 2,
        isPrivateWage: false, // Prevailing wage
      });

      const waxingCost = 1000 * 1.5 * 100; // $1,500
      const carpetCost = 500 * 0.81 * 100; // $405
      const windowCost = 100 * 35 * 100; // $3,500
      const aerialLiftCost = 850 * 100; // $850

      expect(result.waxingCost).toBe(waxingCost);
      expect(result.carpetCost).toBe(carpetCost);
      expect(result.windowCost).toBe(windowCost);
      expect(result.aerialLiftCost).toBe(aerialLiftCost);
      expect(result.totalServiceCost).toBe(
        waxingCost + carpetCost + windowCost + aerialLiftCost
      );
    });

    it('should calculate private wage combined services', () => {
      const result = calculateServicePricing({
        waxingSqft: 2000,
        carpetSqft: 1000,
        windowCount: 50,
        floorCount: 2,
        isPrivateWage: true,
      });

      const waxingCost = 2000 * 0.47 * 100; // $940
      const carpetCost = 1000 * 0.13 * 100; // $130
      const windowCost = 50 * 15 * 100; // $750
      const aerialLiftCost = 850 * 100; // $850

      expect(result.waxingCost).toBe(waxingCost);
      expect(result.carpetCost).toBe(carpetCost);
      expect(result.windowCost).toBe(windowCost);
      expect(result.aerialLiftCost).toBe(aerialLiftCost);
      expect(result.totalServiceCost).toBe(
        waxingCost + carpetCost + windowCost + aerialLiftCost
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero windows with aerial lift needed', () => {
      const result = calculateServicePricing({
        windowCount: 0,
        floorCount: 2,
        isPrivateWage: true,
      });

      expect(result.windowCost).toBe(0);
      expect(result.aerialLiftCost).toBe(0); // No aerial lift if no windows
    });

    it('should handle high floor count', () => {
      const result = calculateServicePricing({
        windowCount: 200,
        floorCount: 10,
        isPrivateWage: false,
      });

      const baseWindowCost = 200 * 35 * 100;
      const aerialLiftCost = 850 * 100;

      expect(result.windowCost).toBe(baseWindowCost);
      expect(result.aerialLiftCost).toBe(aerialLiftCost);
    });

    it('should handle custom high aerial lift cost', () => {
      const result = calculateServicePricing({
        windowCount: 100,
        floorCount: 2,
        isPrivateWage: true,
        aerialLiftCost: 2500, // Very specialized lift
      });

      expect(result.aerialLiftCost).toBe(2500 * 100);
    });
  });

  describe('Breakdown Information', () => {
    it('should include aerial lift flat fee in breakdown', () => {
      const result = calculateServicePricing({
        windowCount: 50,
        floorCount: 2,
        isPrivateWage: true,
      });

      expect(result.breakdown.needsAerialLift).toBe(true);
      expect(result.breakdown.aerialLiftFlatFee).toBe(850);
    });

    it('should show zero aerial lift fee when not needed', () => {
      const result = calculateServicePricing({
        windowCount: 50,
        floorCount: 1,
        isPrivateWage: true,
      });

      expect(result.breakdown.needsAerialLift).toBe(false);
      expect(result.breakdown.aerialLiftFlatFee).toBe(0);
    });

    it('should show custom aerial lift fee in breakdown', () => {
      const result = calculateServicePricing({
        windowCount: 50,
        floorCount: 2,
        isPrivateWage: true,
        aerialLiftCost: 1500,
      });

      expect(result.breakdown.aerialLiftFlatFee).toBe(1500);
    });
  });
});
