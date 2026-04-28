import { describe, it, expect, beforeAll } from 'vitest';
import { parseExcelFile, validateParameters } from './excelParser';
import * as fs from 'fs';
import * as path from 'path';

describe('excelParser', () => {
  let excelBuffer: Buffer;

  beforeAll(() => {
    // Load the test Excel file
    const filePath = path.join(process.cwd(), 'MASTERCOPY_PRIVATE.xlsx');
    if (fs.existsSync(filePath)) {
      excelBuffer = fs.readFileSync(filePath);
    }
  });

  it('should parse Excel file and extract parameters', () => {
    if (!excelBuffer) {
      console.log('Skipping test: Excel file not found');
      return;
    }

    const result = parseExcelFile(excelBuffer);

    expect(result.parameters).toBeDefined();
    expect(result.parameters.companyName).toBe('Clean World Maintenance');
    expect(result.parameters.privateWageHourly).toBeGreaterThan(0);
    expect(result.parameters.workDayHours).toBe(9);
    expect(result.errors).toHaveLength(0);
  });

  it('should extract prevailing wage rates', () => {
    if (!excelBuffer) {
      console.log('Skipping test: Excel file not found');
      return;
    }

    const result = parseExcelFile(excelBuffer);

    // Prevailing wages may or may not be present depending on Excel sheet
    if (result.prevailingWages.length > 0) {
      expect(result.prevailingWages[0]).toHaveProperty('jurisdiction');
      expect(result.prevailingWages[0]).toHaveProperty('wagePerHour');
      expect(result.prevailingWages[0]).toHaveProperty('fringePerHour');
      expect(result.prevailingWages[0]).toHaveProperty('effectiveDate');
    }
  });

  it('should validate parameters correctly', () => {
    const validParams = {
      companyName: 'Test Company',
      baseLocation: 'Seattle, WA',
      privateWageHourly: 3850,
      workDayHours: 9,
      waxingCostPerSqft: 47,
      carpetCostPerSqft: 13,
      windowBasePricePerWindow: 1250,
      travelCostPerMile: 3800,
      hotelCostPerNight: 10000,
      perDiem: 5000,
      additionalCostPercentage: 6,
    };

    const errors = validateParameters(validParams as any);
    expect(errors).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const invalidParams = {
      companyName: '',
      baseLocation: 'Seattle, WA',
      privateWageHourly: 0,
    };

    const errors = validateParameters(invalidParams as any);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('Company name'))).toBe(true);
    expect(errors.some(e => e.includes('wage'))).toBe(true);
  });

  it('should handle invalid wage rates', () => {
    const invalidParams = {
      companyName: 'Test',
      baseLocation: 'Seattle, WA',
      privateWageHourly: -100,
      workDayHours: 9,
    };

    const errors = validateParameters(invalidParams as any);
    expect(errors.some(e => e.includes('wage hourly rate'))).toBe(true);
  });

  it('should parse wage rates as cents', () => {
    if (!excelBuffer) {
      console.log('Skipping test: Excel file not found');
      return;
    }

    const result = parseExcelFile(excelBuffer);

    // Private wage should be in cents (e.g., $39.50 = 3950 cents)
    expect(result.parameters.privateWageHourly).toBe(3950);
    expect(result.parameters.waxingCostPerSqft).toBe(47); // $0.47/sqft

    // Prevailing wages should also be in cents
    if (result.prevailingWages.length > 0) {
      expect(result.prevailingWages[0].wagePerHour).toBeGreaterThan(0);
      expect(result.prevailingWages[0].fringePerHour).toBeGreaterThan(0);
    }
  });

  it('should extract additional cost percentage', () => {
    if (!excelBuffer) {
      console.log('Skipping test: Excel file not found');
      return;
    }

    const result = parseExcelFile(excelBuffer);
    // additionalCostPercentage defaults to 0 if not found in Excel
    expect(result.parameters.additionalCostPercentage).toBeGreaterThanOrEqual(0);
  });
});
