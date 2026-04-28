import { describe, expect, it } from "vitest";
import { calculateBidPrice, formatPrice, getMinimumBid } from "./pricing";
import type { BidParameter, PrevailingWageRate } from "../drizzle/schema";

// Mock data
const mockParameters: BidParameter = {
  id: 1,
  userId: 1,
  companyName: "Clean World Maintenance",
  baseLocation: "Vancouver, WA",
  privateWageHourly: 3850, // $38.50/hour in cents
  workDayHours: 9,
  costPerSqftPrivate: 27, // $0.27/sqft in cents
  cleaningCostPerHour: 3850,
  windowWashingCostPerHour: 3850,
  waxingCostPerHour: 3850,
  travelCostPerMile: 50, // $0.50/mile
  hotelCostPerNight: 10000, // $100/night
  perDiem: 5000, // $50/day
  additionalCostPercentage: 6,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrevailingRate: PrevailingWageRate = {
  id: 1,
  jurisdiction: "Clark County",
  county: "Clark",
  state: "WA",
  effectiveDate: new Date("2025-01-15"),
  wageRate: 4091, // $40.91/hour
  fringeRate: 1730, // $17.30/hour
  totalRate: 10436, // $104.36/hour (wage + fringe)
  minimumBid: 72700, // $727.00 minimum
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Pricing Calculations", () => {
  describe("calculateBidPrice", () => {
    it("should calculate private wage bid for basic cleaning", () => {
      const result = calculateBidPrice({
        squareFootage: 5000,
        wageType: "private",
        includeWindowWashing: false,
        includeWaxing: false,
        includeTravel: false,
        parameters: mockParameters,
      });

      // 5000 sqft should estimate ~3.33 hours (5000/1500)
      // Cost = 3.33 hours * $38.50/hour = ~$128.21
      expect(result.cleaningCost).toBeGreaterThan(0);
      expect(result.windowWashingCost).toBe(0);
      expect(result.waxingCost).toBe(0);
      expect(result.travelCost).toBe(0);
      expect(result.total).toBeGreaterThan(result.subtotal);
    });

    it("should include window washing costs when requested", () => {
      const result = calculateBidPrice({
        squareFootage: 5000,
        wageType: "private",
        includeWindowWashing: true,
        includeWaxing: false,
        includeTravel: false,
        parameters: mockParameters,
      });

      expect(result.windowWashingCost).toBeGreaterThan(0);
      expect(result.waxingCost).toBe(0);
    });

    it("should include waxing costs when requested", () => {
      const result = calculateBidPrice({
        squareFootage: 5000,
        wageType: "private",
        includeWindowWashing: false,
        includeWaxing: true,
        includeTravel: false,
        parameters: mockParameters,
      });

      expect(result.windowWashingCost).toBe(0);
      expect(result.waxingCost).toBeGreaterThan(0);
    });

    it("should calculate prevailing wage bid with higher hourly rate", () => {
      const privateResult = calculateBidPrice({
        squareFootage: 5000,
        wageType: "private",
        includeWindowWashing: false,
        includeWaxing: false,
        includeTravel: false,
        parameters: mockParameters,
      });

      const prevailingResult = calculateBidPrice({
        squareFootage: 5000,
        wageType: "prevailing",
        includeWindowWashing: false,
        includeWaxing: false,
        includeTravel: false,
        parameters: mockParameters,
        prevailingRate: mockPrevailingRate,
      });

      // Prevailing wage should be significantly higher
      expect(prevailingResult.total).toBeGreaterThan(privateResult.total);
    });

    it("should include travel costs when requested", () => {
      const result = calculateBidPrice({
        squareFootage: 5000,
        wageType: "private",
        includeWindowWashing: false,
        includeWaxing: false,
        includeTravel: true,
        travelDistance: 100, // 100 miles
        hotelNights: 1,
        parameters: mockParameters,
      });

      // Travel cost = 100 miles * 2 (round trip) * $0.50 + $100 hotel + $50 per diem
      // = $100 + $100 + $50 = $250
      expect(result.travelCost).toBe(25000); // $250 in cents
      expect(result.total).toBeGreaterThan(0);
    });

    it("should apply additional cost percentage", () => {
      const result = calculateBidPrice({
        squareFootage: 5000,
        wageType: "private",
        includeWindowWashing: false,
        includeWaxing: false,
        includeTravel: false,
        parameters: mockParameters,
      });

      // Additional costs should be 6% of subtotal
      const expectedAdditional = Math.round((result.subtotal * 6) / 100);
      expect(result.additionalCosts).toBe(expectedAdditional);
      expect(result.total).toBe(result.subtotal + result.additionalCosts);
    });
  });

  describe("formatPrice", () => {
    it("should format price from cents to dollars", () => {
      expect(formatPrice(1000)).toBe("$10.00");
      expect(formatPrice(10436)).toBe("$104.36");
      expect(formatPrice(727)).toBe("$7.27");
    });

    it("should handle zero price", () => {
      expect(formatPrice(0)).toBe("$0.00");
    });
  });

  describe("getMinimumBid", () => {
    it("should return minimum bid from prevailing wage rate", () => {
      const minimum = getMinimumBid(mockPrevailingRate);
      expect(minimum).toBe(72700); // $727.00
    });

    it("should return 0 when no prevailing rate provided", () => {
      const minimum = getMinimumBid(null);
      expect(minimum).toBe(0);
    });

    it("should return 0 when prevailing rate has no minimum", () => {
      const rateWithoutMinimum: PrevailingWageRate = {
        ...mockPrevailingRate,
        minimumBid: null,
      };
      const minimum = getMinimumBid(rateWithoutMinimum);
      expect(minimum).toBe(0);
    });
  });
});
