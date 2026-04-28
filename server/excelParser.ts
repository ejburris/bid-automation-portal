import XLSX from 'xlsx';
import { z } from 'zod';

export interface CrewSizeScenario {
  days: number;
  people: number;
  totalHours: number;
  totalCost: number;
  sqftRange: string; // e.g., "0-500", "500-1000"
}

export interface ParsedBidParameters {
  companyName: string;
  baseLocation: string;
  privateWageHourly: number; // in cents ($39.50/hour)
  workDayHours: number; // 9 hours
  waxingCostPerSqft: number; // $0.47/sqft in cents
  carpetCostPerSqft: number; // $0.13/sqft in cents
  windowBasePricePerWindow: number; // in cents (from C85)
  travelCostPerMile: number; // in cents ($38/person/hour for 75-150 miles)
  crewSizeScenarios?: CrewSizeScenario[]; // 10x10 matrix (optional - calculated dynamically)
  hotelCostPerNight: number; // in cents
  perDiem: number; // in cents
  additionalCostPercentage: number;
  // Legacy database column names (for compatibility)
  cleaningCostPerHour?: number;
  windowWashingCostPerHour?: number;
  waxingCostPerHour?: number;
}

export interface ParsedPrevailingWageRate {
  jurisdiction: string;
  state: string;
  effectiveDate: Date;
  wagePerHour: number; // in cents
  fringePerHour: number; // in cents
  minimumBid: number; // in cents
}

/**
 * Parse MASTERCOPY_PRIVATE.xlsx and extract bid parameters
 * Expected structure:
 * - NORMAL WAGE sheet: Contains pricing data and crew size scenarios
 * - Row 73-77, Columns A-H: Crew size scenario matrix (1-10 days × 1-10 people)
 * - C85: Window base price per window
 * - C89: Waxing cost per sqft ($0.47)
 * - C96: Carpet cost per sqft ($0.13)
 * - Travel: $38/person/hour for 75-150 miles, full Travel Mode for 150+ miles
 */
export function parseExcelFile(fileBuffer: Buffer): {
  parameters: ParsedBidParameters;
  prevailingWages: ParsedPrevailingWageRate[];
  errors: string[];
} {
  const errors: string[] = [];
  let parameters: Partial<ParsedBidParameters> = {
    companyName: 'Clean World Maintenance',
    baseLocation: '19312 NE 58th St.',
    privateWageHourly: 3950, // $39.50/hour
    workDayHours: 9,
    waxingCostPerSqft: 47, // $0.47/sqft
    carpetCostPerSqft: 13, // $0.13/sqft
    travelCostPerMile: 3800, // $38/person/hour
    hotelCostPerNight: 10000, // $100/night default
    perDiem: 5000, // $50/day default
    additionalCostPercentage: 0,
    crewSizeScenarios: [],
  };
  const prevailingWages: ParsedPrevailingWageRate[] = [];

  try {
    const workbook = XLSX.read(fileBuffer, { cellFormula: false });

    // Parse NORMAL WAGE sheet
    if (workbook.SheetNames.includes('NORMAL WAGE')) {
      const normalWageSheet = workbook.Sheets['NORMAL WAGE'];
      const normalWageData = XLSX.utils.sheet_to_json(normalWageSheet, { header: 1 }) as any[][];

      // Extract company name from row 0 (usually)
      if (normalWageData[0]?.[0]) {
        parameters.companyName = normalWageData[0][0]?.toString().trim() || parameters.companyName;
      }

      // Extract base location from row 1 or 2
      if (normalWageData[1]?.[0]) {
        const location = normalWageData[1][0]?.toString().trim();
        if (location && location.length > 0) {
          parameters.baseLocation = location;
        }
      }

      // Extract hourly rate from C10 (row 9, column C = index 2)
      if (normalWageData[9]?.[2]) {
        const hourlyRate = parseFloat(normalWageData[9][2]);
        if (!isNaN(hourlyRate)) {
          parameters.privateWageHourly = Math.round(hourlyRate * 100);
        }
      }

      // Extract window base price (C85 = row 84, column C = index 2)
      if (normalWageData[84]?.[2]) {
        const windowPrice = parseFloat(normalWageData[84][2]);
        if (!isNaN(windowPrice)) {
          parameters.windowBasePricePerWindow = Math.round(windowPrice * 100);
        }
      }

      // Extract waxing cost per sqft (C89 = row 88, column C = index 2)
      if (normalWageData[88]?.[2]) {
        const waxingPrice = parseFloat(normalWageData[88][2]);
        if (!isNaN(waxingPrice)) {
          parameters.waxingCostPerSqft = Math.round(waxingPrice * 100);
        }
      }

      // Extract carpet cost per sqft (C96 = row 95, column C = index 2)
      if (normalWageData[95]?.[2]) {
        const carpetPrice = parseFloat(normalWageData[95][2]);
        if (!isNaN(carpetPrice)) {
          parameters.carpetCostPerSqft = Math.round(carpetPrice * 100);
        }
      }

      // Parse crew size scenario matrix (rows 73-77, columns A-H)
      // Each scenario: days × people × 9 hours × hourly rate = total cost
      const scenarios: CrewSizeScenario[] = [];
      const hourlyRateForCalc = parameters.privateWageHourly || 3950;
      for (let days = 1; days <= 10; days++) {
        for (let people = 1; people <= 10; people++) {
          const totalHours = days * people * 9; // 9 hours per work day
          const totalCost = Math.round(totalHours * hourlyRateForCalc);
          
          // Estimate sqft range (rough estimate: each person-hour covers ~50 sqft)
          const minSqft = (days * people - 1) * 500;
          const maxSqft = days * people * 500;
          
          scenarios.push({
            days,
            people,
            totalHours,
            totalCost,
            sqftRange: `${minSqft}-${maxSqft}`,
          });
        }
      }
      parameters.crewSizeScenarios = scenarios;
    }

    // Parse PREVAILING WAGE sheet if it exists
    if (workbook.SheetNames.includes('PREVAILING WAGE')) {
      const prevailingSheet = workbook.Sheets['PREVAILING WAGE'];
      const prevailingData = XLSX.utils.sheet_to_json(prevailingSheet, { header: 1 }) as any[][];

      // Look for PREVAILING WAGE blocks with dates and rates
      let currentDate: Date | null = null;
      let currentJurisdiction: string | null = null;
      let currentMinimum: number = 0;

      for (let i = 0; i < prevailingData.length; i++) {
        const row = prevailingData[i];
        if (!row) continue;

        // Look for date pattern (e.g., "1.5.2025 - DATE")
        const rowStr = row.join(' ');
        const dateMatch = rowStr.match(/(\d+)\.(\d+)\.(\d+)\s*-\s*DATE/);
        if (dateMatch) {
          const [, month, day, year] = dateMatch;
          currentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }

        // Look for WAGE and FRINGE values
        if (rowStr.includes('WAGE:') && rowStr.includes('FRINGE:')) {
          const wageMatch = rowStr.match(/WAGE:\s*([\d.]+)/);
          const fringeMatch = rowStr.match(/FRINGE:\s*([\d.]+)/);

          if (wageMatch && fringeMatch && currentDate && currentJurisdiction) {
            const wage = parseFloat(wageMatch[1]);
            const fringe = parseFloat(fringeMatch[1]);

            if (!isNaN(wage) && !isNaN(fringe)) {
              prevailingWages.push({
                jurisdiction: currentJurisdiction,
                state: 'OR', // Default to Oregon, can be overridden
                effectiveDate: currentDate,
                wagePerHour: Math.round(wage * 100),
                fringePerHour: Math.round(fringe * 100),
                minimumBid: Math.round((wage + fringe) * 100 * 8), // Default 8-hour minimum
              });
            }
          }
        }

        // Look for jurisdiction names
        if (rowStr.match(/^[A-Z\s]+$/) && rowStr.length > 3 && rowStr.length < 50) {
          currentJurisdiction = rowStr.trim();
        }
      }
    }

    // Validate required parameters
    if (!parameters.companyName) {
      errors.push('Company name not found in spreadsheet');
    }
    if (!parameters.baseLocation) {
      errors.push('Base location not found in spreadsheet');
    }
  // crewSizeScenarios are now optional - calculated dynamically in frontend

  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error parsing Excel file');
  }

  return {
    parameters: parameters as ParsedBidParameters,
    prevailingWages,
    errors,
  };
}

export function validateParameters(parameters: ParsedBidParameters): string[] {
  const errors: string[] = [];

  if (!parameters.companyName || parameters.companyName.trim().length === 0) {
    errors.push('Company name is required');
  }

  if (!parameters.baseLocation || parameters.baseLocation.trim().length === 0) {
    errors.push('Base location is required');
  }

  if (parameters.privateWageHourly <= 0) {
    errors.push('Private wage hourly rate must be greater than 0');
  }

  if (parameters.workDayHours <= 0 || parameters.workDayHours > 24) {
    errors.push('Work day hours must be between 1 and 24');
  }

  // crewSizeScenarios are now optional - calculated dynamically in frontend

  return errors;
}
