import { describe, it, expect } from 'vitest';
import {
  scrapeOregonBOLIWagesWithFallback,
  getLatestOregonBOLIRateBookUrl,
} from './oregonBOLIScraper';
import {
  scrapeWashingtonLNIWagesWithFallback,
  getLatestWashingtonLNIUpdateDate,
} from './washingtonLNIScraper';

describe('Prevailing Wage Scrapers', () => {
  describe('Oregon BOLI Scraper', () => {
    it('should return a valid URL for the latest rate book', () => {
      const url = getLatestOregonBOLIRateBookUrl();
      expect(url).toContain('oregon.gov');
      expect(url).toContain('Prevailing%20Wage%20Rate%20Book.pdf');
    });

    it('should scrape Oregon BOLI wages with fallback', async () => {
      const result = await scrapeOregonBOLIWagesWithFallback();

      expect(result).toBeDefined();
      expect(result.scrapedAt).toBeInstanceOf(Date);
      expect(result.effectiveDate).toBeInstanceOf(Date);
      expect(Array.isArray(result.wageRates)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return Oregon wage rates with correct structure', async () => {
      const result = await scrapeOregonBOLIWagesWithFallback();

      if (result.wageRates.length > 0) {
        const rate = result.wageRates[0];
        expect(rate.jurisdiction).toBeDefined();
        expect(rate.state).toBe('OR');
        expect(rate.wageRate).toBeGreaterThan(0);
        expect(rate.totalRate).toBeGreaterThanOrEqual(rate.wageRate);
        expect(rate.source).toBe('OREGON_BOLI');
      }
    });
  });

  describe('Washington LNI Scraper', () => {
    it('should return a valid effective date', () => {
      const date = getLatestWashingtonLNIUpdateDate();
      expect(date).toBeInstanceOf(Date);
      // Should be within 2 years (future or past)
      const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
      expect(Math.abs(date.getTime() - new Date().getTime())).toBeLessThan(twoYearsMs);
    });

    it('should scrape Washington LNI wages with fallback', async () => {
      const result = await scrapeWashingtonLNIWagesWithFallback();

      expect(result).toBeDefined();
      expect(result.scrapedAt).toBeInstanceOf(Date);
      expect(result.effectiveDate).toBeInstanceOf(Date);
      expect(Array.isArray(result.wageRates)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return Washington wage rates with correct structure', async () => {
      const result = await scrapeWashingtonLNIWagesWithFallback();

      if (result.wageRates.length > 0) {
        const rate = result.wageRates[0];
        expect(rate.jurisdiction).toBeDefined();
        expect(rate.state).toBe('WA');
        expect(rate.journeyLevelRate).toBeGreaterThan(0);
        expect(rate.totalRate).toBeGreaterThanOrEqual(rate.journeyLevelRate);
        expect(rate.source).toBe('WASHINGTON_LNI');
      }
    });
  });

  describe('Scraper Data Validation', () => {
    it('Oregon rates should have reasonable wage values', async () => {
      const result = await scrapeOregonBOLIWagesWithFallback();

      for (const rate of result.wageRates) {
        // Wage rates should be between $10 and $100 per hour
        expect(rate.wageRate).toBeGreaterThan(1000); // $10 in cents
        expect(rate.wageRate).toBeLessThan(10000); // $100 in cents
      }
    });

    it('Washington rates should have reasonable wage values', async () => {
      const result = await scrapeWashingtonLNIWagesWithFallback();

      for (const rate of result.wageRates) {
        // Wage rates should be between $10 and $100 per hour
        expect(rate.journeyLevelRate).toBeGreaterThan(1000); // $10 in cents
        expect(rate.journeyLevelRate).toBeLessThan(10000); // $100 in cents
      }
    });

    it('Oregon rates should have valid jurisdictions', async () => {
      const result = await scrapeOregonBOLIWagesWithFallback();

      for (const rate of result.wageRates) {
        expect(rate.jurisdiction).toBeTruthy();
        expect(rate.jurisdiction.length).toBeGreaterThan(0);
      }
    });

    it('Washington rates should have valid jurisdictions', async () => {
      const result = await scrapeWashingtonLNIWagesWithFallback();

      for (const rate of result.wageRates) {
        expect(rate.jurisdiction).toBeTruthy();
        expect(rate.jurisdiction.length).toBeGreaterThan(0);
      }
    });
  });
});
