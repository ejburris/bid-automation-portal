import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Washington LNI Prevailing Wage Scraper
 * Fetches prevailing wage rates from Washington Department of Labor & Industries
 * Note: LNI uses a JavaScript-heavy portal, so we provide mock data for now
 * and a framework for future Puppeteer integration
 */

export interface WashingtonWageRate {
  jurisdiction: string;
  county?: string;
  state: 'WA';
  trade: string;
  tradeCode?: string;
  journeyLevelRate: number; // in cents
  apprenticeRate?: number; // in cents
  totalRate: number; // in cents
  effectiveDate: Date;
  source: 'WASHINGTON_LNI';
}

export interface ScraperResult {
  success: boolean;
  wageRates: WashingtonWageRate[];
  errors: string[];
  scrapedAt: Date;
  effectiveDate: Date;
}

/**
 * Get the latest Washington LNI prevailing wage update date
 * LNI updates on the first business day of February and August
 */
export function getLatestWashingtonLNIUpdateDate(): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Determine the most recent update
  let updateMonth = 2; // February
  if (month > 8) {
    updateMonth = 8; // August
  } else if (month > 2) {
    updateMonth = 8; // Next August
    return new Date(year + 1, updateMonth - 1, 1);
  }

  return new Date(year, updateMonth - 1, 1);
}

/**
 * Scrape Washington LNI wage rates
 * Currently returns mock data due to JavaScript-heavy portal
 * TODO: Implement Puppeteer-based scraping for live data
 */
export async function scrapeWashingtonLNIWages(): Promise<ScraperResult> {
  const errors: string[] = [];
  const wageRates: WashingtonWageRate[] = [];
  const scrapedAt = new Date();

  try {
    // Get the effective date (first business day of February or August)
    const now = new Date();
    const month = now.getMonth() + 1;

    let effectiveDate: Date;
    if (month >= 8) {
      effectiveDate = new Date(now.getFullYear(), 7, 1); // August 1st
    } else if (month >= 2) {
      effectiveDate = new Date(now.getFullYear(), 7, 1); // Next August 1st
    } else {
      effectiveDate = new Date(now.getFullYear(), 1, 1); // February 1st
    }

    // Add 30 days for effective date (rates take effect 30 days after publication)
    effectiveDate.setDate(effectiveDate.getDate() + 30);

    console.log(`[Washington LNI Scraper] Fetching rates effective ${effectiveDate.toISOString()}`);

    // Return mock data for now
    // In production, this would use Puppeteer to render the JavaScript portal
    // and extract actual rates from https://secure.lni.wa.gov/wagelookup/rates/journey-level-rates

    wageRates.push(
      {
        jurisdiction: 'King County',
        county: 'King',
        state: 'WA',
        trade: 'Laborer',
        journeyLevelRate: 5200,
        apprenticeRate: 2600,
        totalRate: 5200,
        effectiveDate,
        source: 'WASHINGTON_LNI',
      },
      {
        jurisdiction: 'King County',
        county: 'King',
        state: 'WA',
        trade: 'Carpenter',
        journeyLevelRate: 6000,
        apprenticeRate: 3000,
        totalRate: 6000,
        effectiveDate,
        source: 'WASHINGTON_LNI',
      },
      {
        jurisdiction: 'Multnomah County',
        county: 'Multnomah',
        state: 'WA',
        trade: 'Laborer',
        journeyLevelRate: 4800,
        apprenticeRate: 2400,
        totalRate: 4800,
        effectiveDate,
        source: 'WASHINGTON_LNI',
      }
    );

    return {
      success: true,
      wageRates,
      errors,
      scrapedAt,
      effectiveDate,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    console.error(`[Washington LNI Scraper] Error: ${errorMsg}`);

    return {
      success: false,
      wageRates: [],
      errors,
      scrapedAt,
      effectiveDate: new Date(),
    };
  }
}

/**
 * Scrape with fallback to mock data
 */
export async function scrapeWashingtonLNIWagesWithFallback(): Promise<ScraperResult> {
  try {
    return await scrapeWashingtonLNIWages();
  } catch (error) {
    console.warn('[Washington LNI Scraper] Live scraping failed, returning mock data');
    return await scrapeWashingtonLNIWages();
  }
}

/**
 * Future implementation: Use Puppeteer to scrape JavaScript-rendered content
 * This would be called to get actual live data from the LNI portal
 */
export async function scrapeWashingtonLNIWagesWithPuppeteer(): Promise<ScraperResult> {
  const errors: string[] = [];
  errors.push('Puppeteer-based scraping not yet implemented. Using mock data.');

  return {
    success: false,
    wageRates: [],
    errors,
    scrapedAt: new Date(),
    effectiveDate: new Date(),
  };
}
