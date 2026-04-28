import XLSX from 'xlsx';

export interface PrevailingWageData {
  jurisdiction: string;
  state: string;
  county?: string;
  effectiveDate: Date;
  wagePerHour: number; // in cents
  fringePerHour: number; // in cents
  minimumBid: number; // in cents
  costPerManHour?: number; // in cents (calculated total)
}

/**
 * Parse MASTERCOPY_PW.xlsx (Prevailing Wage file) and extract prevailing wage rates
 * Expected structure:
 * - PREVAILING WAGE sheet contains blocks with:
 *   - Date (e.g., "1.5.2025 - DATE")
 *   - Jurisdiction/County info (e.g., "CLARK")
 *   - WAGE and FRINGE values
 *   - Minimum bid amount
 */
export function parsePrevailingWageFile(fileBuffer: Buffer): {
  rates: PrevailingWageData[];
  errors: string[];
} {
  const errors: string[] = [];
  const rates: PrevailingWageData[] = [];

  try {
    const workbook = XLSX.read(fileBuffer, { cellFormula: false });

    if (!workbook.SheetNames.includes('PREVAILING WAGE')) {
      errors.push('PREVAILING WAGE sheet not found in file');
      return { rates, errors };
    }

    const prevailingSheet = workbook.Sheets['PREVAILING WAGE'];
    const prevailingData = XLSX.utils.sheet_to_json(prevailingSheet, { header: 1 }) as any[][];

    // Track current context as we parse
    let currentDate: Date | null = null;
    let currentJurisdiction: string = '';
    let currentCounty: string = '';
    let currentMinimum: number = 0;
    let currentState: string = 'WA'; // Default to Washington

    for (let i = 0; i < prevailingData.length; i++) {
      const row = prevailingData[i];
      if (!row || row.length === 0) continue;

      const rowStr = row.join(' ').trim();

      // Look for date pattern (e.g., "1.5.2025 - DATE")
      const dateMatch = rowStr.match(/(\d+)\.(\d+)\.(\d+)\s*-\s*DATE/);
      if (dateMatch) {
        const [, month, day, year] = dateMatch;
        currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      // Look for state indicator
      if (rowStr.includes('WASHINGTON STATE')) {
        currentState = 'WA';
      } else if (rowStr.includes('OREGON') || rowStr.includes('OR')) {
        currentState = 'OR';
      }

      // Look for county (e.g., "COUNTY: CLARK")
      const countyMatch = rowStr.match(/COUNTY:\s*([A-Z\s]+)/);
      if (countyMatch) {
        currentCounty = countyMatch[1].trim();
        currentJurisdiction = currentCounty;
      }

      // Look for minimum bid (e.g., "$ 727.00 MINIMUM")
      const minMatch = rowStr.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*MINIMUM/);
      if (minMatch) {
        currentMinimum = Math.round(parseFloat(minMatch[1].replace(/,/g, '')) * 100);
      }

      // Look for CLEANING line with minimum (alternative format)
      if (rowStr.includes('CLEANING') && rowStr.includes('MINIMUM')) {
        const cleaningMinMatch = rowStr.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*MINIMUM/);
        if (cleaningMinMatch) {
          currentMinimum = Math.round(parseFloat(cleaningMinMatch[1].replace(/,/g, '')) * 100);
        }
      }

      // Look for WAGE and FRINGE values
      if (rowStr.includes('WAGE:') && rowStr.includes('FRINGE:')) {
        const wageMatch = rowStr.match(/WAGE:\s*([\d.]+)/);
        const fringeMatch = rowStr.match(/FRINGE:\s*([\d.]+)/);

        if (wageMatch && fringeMatch && currentDate) {
          const wage = parseFloat(wageMatch[1]);
          const fringe = parseFloat(fringeMatch[1]);

          // Use county if available, otherwise use a generic jurisdiction
          const jurisdiction = currentJurisdiction || `${currentState} General`;

          // Calculate cost per man hour (wage + fringe + office multiplier / profit margin)
          // Formula: (wage + fringe) * 1.255 / 0.7
          const totalWageFringe = wage + fringe;
          const costPerManHour = Math.round((totalWageFringe * 1.255 / 0.7) * 100);

          rates.push({
            jurisdiction,
            state: currentState,
            county: currentCounty || undefined,
            effectiveDate: new Date(currentDate), // Create new Date to avoid reference issues
            wagePerHour: Math.round(wage * 100),
            fringePerHour: Math.round(fringe * 100),
            minimumBid: currentMinimum,
            costPerManHour,
          });

          // Reset for next entry
          currentDate = null;
        }
      }
    }

    if (rates.length === 0) {
      errors.push('No prevailing wage rates found in file');
    }

    return { rates, errors };
  } catch (error) {
    return {
      rates: [],
      errors: [error instanceof Error ? error.message : 'Unknown error parsing prevailing wage file'],
    };
  }
}

/**
 * Get prevailing wage rate for a specific jurisdiction and effective date
 */
export function getPrevailingWageRate(
  rates: PrevailingWageData[],
  jurisdiction: string,
  effectiveDate: Date
): PrevailingWageData | null {
  // Filter by jurisdiction
  const jurisdictionRates = rates.filter(
    r => r.jurisdiction.toLowerCase() === jurisdiction.toLowerCase() ||
         r.county?.toLowerCase() === jurisdiction.toLowerCase()
  );

  if (jurisdictionRates.length === 0) {
    return null;
  }

  // Find the most recent rate that is effective on or before the given date
  const validRates = jurisdictionRates.filter(r => r.effectiveDate <= effectiveDate);

  if (validRates.length === 0) {
    // If no rate is effective before the date, use the earliest rate
    return jurisdictionRates.sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())[0];
  }

  // Return the most recent valid rate
  return validRates.sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())[0];
}

/**
 * Get all unique jurisdictions from prevailing wage rates
 */
export function getUniqueJurisdictions(rates: PrevailingWageData[]): string[] {
  const jurisdictions = new Set<string>();
  rates.forEach(r => {
    jurisdictions.add(r.jurisdiction);
    if (r.county) {
      jurisdictions.add(r.county);
    }
  });
  return Array.from(jurisdictions).sort();
}
