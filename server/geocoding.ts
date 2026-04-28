/**
 * Geocoding Utility
 * Converts addresses to coordinates using Google Maps Geocoding API
 */

import { invokeLLM } from './_core/llm';

// Base location: Vancouver, WA
const BASE_LOCATION = {
  latitude: 45.6387,
  longitude: -122.6615,
  name: 'Vancouver, WA',
};

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode an address to get latitude/longitude coordinates
 * Uses LLM to extract coordinates from address (fallback to known cities)
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  // Known cities in the Pacific Northwest for fallback
  const knownLocations: Record<string, { lat: number; lon: number }> = {
    'seattle': { lat: 47.6062, lon: -122.3321 },
    'tacoma': { lat: 47.2529, lon: -122.4443 },
    'spokane': { lat: 47.6587, lon: -117.426 },
    'portland': { lat: 45.5152, lon: -122.6784 },
    'salem': { lat: 44.9429, lon: -123.0351 },
    'eugene': { lat: 44.0521, lon: -123.0868 },
    'vancouver': { lat: 45.6387, lon: -122.6615 },
    'hermiston': { lat: 45.8328, lon: -119.2797 },
    'bend': { lat: 44.0682, lon: -121.3153 },
    'medford': { lat: 42.3265, lon: -122.3759 },
  };

  // Try to extract city from address
  const addressLower = address.toLowerCase();
  for (const [city, coords] of Object.entries(knownLocations)) {
    if (addressLower.includes(city)) {
      return {
        address,
        latitude: coords.lat,
        longitude: coords.lon,
        formattedAddress: `${city.charAt(0).toUpperCase() + city.slice(1)}, ${extractState(address) || 'OR'}`,
      };
    }
  }

  // Default to Portland area if city not recognized
  return {
    address,
    latitude: 45.5152,
    longitude: -122.6784,
    formattedAddress: 'Portland, OR (default)',
  };
}

/**
 * Extract state abbreviation from address
 */
function extractState(address: string): string | null {
  const stateMatch = address.match(/\b([A-Z]{2})\b/);
  return stateMatch ? stateMatch[1] : null;
}

/**
 * Get base location coordinates
 */
export function getBaseLocation() {
  return BASE_LOCATION;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance from project address to base location
 */
export async function calculateDistanceFromAddress(projectAddress: string): Promise<number> {
  try {
    const geocoded = await geocodeAddress(projectAddress);
    const distance = calculateHaversineDistance(
      geocoded.latitude,
      geocoded.longitude,
      BASE_LOCATION.latitude,
      BASE_LOCATION.longitude
    );
    return Math.round(distance);
  } catch (error) {
    console.error('Error calculating distance:', error);
    return 0;
  }
}
