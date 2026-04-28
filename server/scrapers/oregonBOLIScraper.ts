import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

/**
 * Oregon BOLI Prevailing Wage Scraper
 * Fetches and parses prevailing wage rates from Oregon BOLI PDF rate books
 */

export interface OregonWageRate {
  jurisdiction: string;
  county: string;
  state: 'OR';
  occupation: string;
  occupationCode?: string;
  wageRate: number; // in cents
  fringeRate?: number; // in cents
  totalRate: number; // in cents
  effectiveDate: Date;
  source: 'OREGON_BOLI';
}

export interface ScraperResult {
  success: boolean;
  wageRates: OregonWageRate[];
  errors: string[];
  scrapedAt: Date;
  effectiveDate: Date;
}

/**
 * Get the latest Oregon BOLI prevailing wage rate book URL
 * BOLI publishes rate books quarterly on January 5, April 5, July 5, October 5
 */
export function getLatestOregonBOLIRateBookUrl(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Determine the most recent quarterly update
  let updateMonth = 1;
  if (month >= 10) {
    updateMonth = 10;
  } else if (month >= 7) {
    updateMonth = 7;
  } else if (month >= 4) {
    updateMonth = 4;
  }

  const updateDate = new Date(year, updateMonth - 1, 5);
  const formattedDate = updateDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `https://www.oregon.gov/boli/workers/Prevailing%20Wage%20Rate%20Books/BOLI%20${formattedDate}%20Prevailing%20Wage%20Rate%20Book.pdf`;
}

/**
 * Download PDF from Oregon BOLI
 */
async function downloadPDF(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Failed to download PDF from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Oregon BOLI PDF to extract wage rates
 * The PDF structure typically has:
 * - County name as section headers
 * - Occupation classifications
 * - Wage rates and fringe benefits
 */
async function parsePDF(pdfBuffer: Buffer, effectiveDate: Date): Promise<OregonWageRate[]> {
  const wageRates: OregonWageRate[] = [];

  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    // Split by common county headers
    const lines = text.split('\n').filter((line: string) => line.trim().length > 0);

    let currentCounty = '';
    let currentJurisdiction = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect county headers (typically in CAPS or with specific patterns)
      if (line.match(/^[A-Z\s]+\s+COUNTY$/i) || line.match(/^COUNTY OF/i)) {
        currentCounty = line.replace(/COUNTY/i, '').trim();
        currentJurisdiction = currentCounty;
        continue;
      }

      // Try to parse wage rate lines
      // Pattern: Occupation Name ... $XX.XX ... $XX.XX
      const wageMatch = line.match(/^(.+?)\s+\$?([\d.]+)\s+\$?([\d.]+)$/);
      if (wageMatch && currentCounty) {
        const occupation = wageMatch[1].trim();
        const wageStr = wageMatch[2];
        const fringeStr = wageMatch[3];

        // Skip header rows and non-numeric patterns
        if (isNaN(parseFloat(wageStr)) || occupation.length < 3) {
          continue;
        }

        const wageRate = Math.round(parseFloat(wageStr) * 100);
        const fringeRate = Math.round(parseFloat(fringeStr) * 100);
        const totalRate = wageRate + fringeRate;

        wageRates.push({
          jurisdiction: currentJurisdiction,
          county: currentCounty,
          state: 'OR',
          occupation,
          wageRate,
          fringeRate,
          totalRate,
          effectiveDate,
          source: 'OREGON_BOLI',
        });
      }
    }

    return wageRates;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main scraper function
 */
export async function scrapeOregonBOLIWages(): Promise<ScraperResult> {
  const errors: string[] = [];
  const wageRates: OregonWageRate[] = [];
  const scrapedAt = new Date();

  try {
    // Determine effective date from the rate book
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let updateMonth = 1;
    if (month >= 10) {
      updateMonth = 10;
    } else if (month >= 7) {
      updateMonth = 7;
    } else if (month >= 4) {
      updateMonth = 4;
    }

    const effectiveDate = new Date(year, updateMonth - 1, 5);

    // Get the rate book URL
    const url = getLatestOregonBOLIRateBookUrl();
    console.log(`[Oregon BOLI Scraper] Downloading from: ${url}`);

    // Download PDF
    const pdfBuffer = await downloadPDF(url);
    console.log(`[Oregon BOLI Scraper] Downloaded PDF (${pdfBuffer.length} bytes)`);

    // Parse PDF
    const rates = await parsePDF(pdfBuffer, effectiveDate);
    console.log(`[Oregon BOLI Scraper] Extracted ${rates.length} wage rates`);

    wageRates.push(...rates);

    if (wageRates.length === 0) {
      errors.push('No wage rates extracted from PDF. PDF parsing may need adjustment.');
    }

    return {
      success: errors.length === 0 && wageRates.length > 0,
      wageRates,
      errors,
      scrapedAt,
      effectiveDate,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    console.error(`[Oregon BOLI Scraper] Error: ${errorMsg}`);

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
 * Scrape with fallback to cached/mock data for testing
 */
export async function scrapeOregonBOLIWagesWithFallback(): Promise<ScraperResult> {
  try {
    return await scrapeOregonBOLIWages();
  } catch (error) {
    console.warn('[Oregon BOLI Scraper] Live scraping failed, returning mock data for testing');

    // Return mock data for testing
    const mockDate = new Date();
    return {
      success: true,
      wageRates: [
        {
          jurisdiction: 'Multnomah County',
          county: 'Multnomah',
          state: 'OR',
          occupation: 'Laborer',
          wageRate: 4500,
          fringeRate: 1500,
          totalRate: 6000,
          effectiveDate: mockDate,
          source: 'OREGON_BOLI',
        },
        {
          jurisdiction: 'Multnomah County',
          county: 'Multnomah',
          state: 'OR',
          occupation: 'Carpenter',
          wageRate: 5200,
          fringeRate: 1800,
          totalRate: 7000,
          effectiveDate: mockDate,
          source: 'OREGON_BOLI',
        },
        {
          jurisdiction: 'Marion County',
          county: 'Marion',
          state: 'OR',
          occupation: 'Laborer',
          wageRate: 4200,
          fringeRate: 1400,
          totalRate: 5600,
          effectiveDate: mockDate,
          source: 'OREGON_BOLI',
        },
      ],
      errors: [],
      scrapedAt: new Date(),
      effectiveDate: mockDate,
    };
  }
}
