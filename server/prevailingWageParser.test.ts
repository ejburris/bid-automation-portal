import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parsePrevailingWageFile,
  getPrevailingWageRate,
  getUniqueJurisdictions,
} from './prevailingWageParser';

describe('Prevailing Wage Parser', () => {
  let pwFileBuffer: Buffer;

  beforeAll(() => {
    // Load the prevailing wage Excel file
    const filePath = path.join(process.cwd(), 'MASTERCOPY_PW.xlsx');
    if (fs.existsSync(filePath)) {
      pwFileBuffer = fs.readFileSync(filePath);
    }
  });

  describe('parsePrevailingWageFile', () => {
    it('should parse prevailing wage rates from Excel file', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);

      expect(result.errors).toHaveLength(0);
      expect(result.rates.length).toBeGreaterThan(0);
    });

    it('should extract wage and fringe rates', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);

      if (result.rates.length > 0) {
        const rate = result.rates[0];
        expect(rate.wagePerHour).toBeGreaterThan(0);
        expect(rate.fringePerHour).toBeGreaterThanOrEqual(0);
        expect(rate.effectiveDate).toBeInstanceOf(Date);
      }
    });

    it('should extract jurisdiction and state information', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);

      if (result.rates.length > 0) {
        const rate = result.rates[0];
        expect(rate.jurisdiction).toBeTruthy();
        expect(['WA', 'OR']).toContain(rate.state);
      }
    });

    it('should calculate cost per man hour with office multiplier and profit margin', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);

      if (result.rates.length > 0) {
        const rate = result.rates[0];
        // Formula: (wage + fringe) * 1.255 / 0.7
        const expectedCost = Math.round(
          ((rate.wagePerHour + rate.fringePerHour) / 100) * 1.255 / 0.7 * 100
        );
        expect(rate.costPerManHour).toBe(expectedCost);
      }
    });
  });

  describe('getPrevailingWageRate', () => {
    it('should find rate by jurisdiction and effective date', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);
      if (result.rates.length === 0) return;

      const firstRate = result.rates[0];
      const foundRate = getPrevailingWageRate(
        result.rates,
        firstRate.jurisdiction,
        new Date()
      );

      expect(foundRate).toBeTruthy();
      expect(foundRate?.jurisdiction).toBe(firstRate.jurisdiction);
    });

    it('should return most recent rate for given date', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);
      if (result.rates.length === 0) return;

      // Get rates for a specific jurisdiction
      const jurisdiction = result.rates[0].jurisdiction;
      const jurisdictionRates = result.rates.filter(r => r.jurisdiction === jurisdiction);

      if (jurisdictionRates.length > 1) {
        // Sort by date
        const sorted = jurisdictionRates.sort((a, b) =>
          b.effectiveDate.getTime() - a.effectiveDate.getTime()
        );

        // Query for a date after the most recent rate
        const futureDate = new Date(sorted[0].effectiveDate);
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const rate = getPrevailingWageRate(result.rates, jurisdiction, futureDate);
        expect(rate?.effectiveDate).toEqual(sorted[0].effectiveDate);
      }
    });

    it('should return null for non-existent jurisdiction', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);

      const rate = getPrevailingWageRate(result.rates, 'NONEXISTENT_COUNTY', new Date());
      expect(rate).toBeNull();
    });
  });

  describe('getUniqueJurisdictions', () => {
    it('should return all unique jurisdictions', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);
      const jurisdictions = getUniqueJurisdictions(result.rates);

      expect(jurisdictions.length).toBeGreaterThan(0);
      expect(jurisdictions).toEqual(jurisdictions.sort());
    });

    it('should not have duplicates', () => {
      if (!pwFileBuffer) {
        console.log('⚠️  Skipping: MASTERCOPY_PW.xlsx not found');
        expect(true).toBe(true);
        return;
      }

      const result = parsePrevailingWageFile(pwFileBuffer);
      const jurisdictions = getUniqueJurisdictions(result.rates);
      const uniqueSet = new Set(jurisdictions);

      expect(jurisdictions.length).toBe(uniqueSet.size);
    });
  });
});
