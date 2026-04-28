import { scrapeOregonBOLIWagesWithFallback, OregonWageRate } from './oregonBOLIScraper';
import { scrapeWashingtonLNIWagesWithFallback, WashingtonWageRate } from './washingtonLNIScraper';
import * as db from '../db';

/**
 * Unified Prevailing Wage Scraper
 * Orchestrates scraping from both Oregon BOLI and Washington LNI
 * Stores results in the database
 */

export interface ScrapingResult {
  success: boolean;
  oregonRates: number;
  washingtonRates: number;
  totalRates: number;
  errors: string[];
  scrapedAt: Date;
}

/**
 * Scrape all prevailing wage rates and update database
 */
export async function scrapeAllPrevailingWages(userId: number): Promise<ScrapingResult> {
  const errors: string[] = [];
  let oregonRates = 0;
  let washingtonRates = 0;
  const scrapedAt = new Date();

  try {
    console.log('[Prevailing Wage Scraper] Starting scrape for all jurisdictions');

    // Scrape Oregon BOLI
    console.log('[Prevailing Wage Scraper] Scraping Oregon BOLI...');
    const oregonResult = await scrapeOregonBOLIWagesWithFallback();

    if (oregonResult.success) {
      console.log(`[Prevailing Wage Scraper] Oregon BOLI: ${oregonResult.wageRates.length} rates`);
      for (const rate of oregonResult.wageRates) {
        try {
          await db.upsertPrevailingWageRate(userId, {
            jurisdiction: rate.jurisdiction,
            state: rate.state,
            effectiveDate: rate.effectiveDate,
            wagePerHour: rate.wageRate,
            fringePerHour: rate.fringeRate || 0,
            minimumBid: 0,
          });
          oregonRates++;
        } catch (error) {
          errors.push(`Failed to save Oregon rate for ${rate.jurisdiction}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else {
      errors.push(`Oregon BOLI scrape failed: ${oregonResult.errors.join(', ')}`);
    }

    // Scrape Washington LNI
    console.log('[Prevailing Wage Scraper] Scraping Washington LNI...');
    const washingtonResult = await scrapeWashingtonLNIWagesWithFallback();

    if (washingtonResult.success) {
      console.log(`[Prevailing Wage Scraper] Washington LNI: ${washingtonResult.wageRates.length} rates`);
      for (const rate of washingtonResult.wageRates) {
        try {
          await db.upsertPrevailingWageRate(userId, {
            jurisdiction: rate.jurisdiction,
            state: rate.state,
            effectiveDate: rate.effectiveDate,
            wagePerHour: rate.journeyLevelRate,
            fringePerHour: rate.apprenticeRate || 0,
            minimumBid: 0,
          });
          washingtonRates++;
        } catch (error) {
          errors.push(`Failed to save Washington rate for ${rate.jurisdiction}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else {
      errors.push(`Washington LNI scrape failed: ${washingtonResult.errors.join(', ')}`);
    }

    const totalRates = oregonRates + washingtonRates;
    const success = totalRates > 0;

    console.log(`[Prevailing Wage Scraper] Complete: ${oregonRates} Oregon + ${washingtonRates} Washington = ${totalRates} total rates`);

    return {
      success,
      oregonRates,
      washingtonRates,
      totalRates,
      errors,
      scrapedAt,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    console.error(`[Prevailing Wage Scraper] Fatal error: ${errorMsg}`);

    return {
      success: false,
      oregonRates,
      washingtonRates,
      totalRates: oregonRates + washingtonRates,
      errors,
      scrapedAt,
    };
  }
}

/**
 * Scrape only Oregon BOLI rates
 */
export async function scrapeOregonOnly(userId: number): Promise<ScrapingResult> {
  const errors: string[] = [];
  let oregonRates = 0;
  const scrapedAt = new Date();

  try {
    const oregonResult = await scrapeOregonBOLIWagesWithFallback();

    if (oregonResult.success) {
      for (const rate of oregonResult.wageRates) {
        try {
          await db.upsertPrevailingWageRate(userId, {
            jurisdiction: rate.jurisdiction,
            state: rate.state,
            effectiveDate: rate.effectiveDate,
            wagePerHour: rate.wageRate,
            fringePerHour: rate.fringeRate || 0,
            minimumBid: 0,
          });
          oregonRates++;
        } catch (error) {
          errors.push(`Failed to save rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else {
      errors.push(...oregonResult.errors);
    }

    return {
      success: oregonRates > 0,
      oregonRates,
      washingtonRates: 0,
      totalRates: oregonRates,
      errors,
      scrapedAt,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      oregonRates,
      washingtonRates: 0,
      totalRates: oregonRates,
      errors,
      scrapedAt,
    };
  }
}

/**
 * Scrape only Washington LNI rates
 */
export async function scrapeWashingtonOnly(userId: number): Promise<ScrapingResult> {
  const errors: string[] = [];
  let washingtonRates = 0;
  const scrapedAt = new Date();

  try {
    const washingtonResult = await scrapeWashingtonLNIWagesWithFallback();

    if (washingtonResult.success) {
      for (const rate of washingtonResult.wageRates) {
        try {
          await db.upsertPrevailingWageRate(userId, {
            jurisdiction: rate.jurisdiction,
            state: rate.state,
            effectiveDate: rate.effectiveDate,
            wagePerHour: rate.journeyLevelRate,
            fringePerHour: rate.apprenticeRate || 0,
            minimumBid: 0,
          });
          washingtonRates++;
        } catch (error) {
          errors.push(`Failed to save rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else {
      errors.push(...washingtonResult.errors);
    }

    return {
      success: washingtonRates > 0,
      oregonRates: 0,
      washingtonRates,
      totalRates: washingtonRates,
      errors,
      scrapedAt,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      oregonRates: 0,
      washingtonRates,
      totalRates: washingtonRates,
      errors,
      scrapedAt,
    };
  }
}
