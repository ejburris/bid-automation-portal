import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { calculateTravelCosts } from './distanceCalculation';
import { geocodeAddress, calculateHaversineDistance, getBaseLocation } from './geocoding';

/**
 * Distance calculation router
 * Provides tRPC procedures for calculating distances and travel costs
 */
export const distanceRouter = router({
  /**
   * Calculate distance from project address to base location
   * Uses hardcoded coordinates for Vancouver, WA base
   * In production, would use Google Maps API for geocoding
   */
  calculateDistance: publicProcedure
    .input(
      z.object({
        projectAddress: z.string().min(1, 'Project address is required'),
        crewPeople: z.number().min(0.5, 'Crew must be at least 0.5 people'),
        crewDays: z.number().min(0.5, 'Duration must be at least 0.5 days'),
      })
    )
    .query(async ({ input }) => {
      try {
        // Geocode the project address
        const projectCoordinates = await geocodeAddress(input.projectAddress);
        const baseLocation = getBaseLocation();

        // Calculate distance using Haversine formula
        const distance = calculateHaversineDistance(
          baseLocation.latitude,
          baseLocation.longitude,
          projectCoordinates.latitude,
          projectCoordinates.longitude
        );

        // Calculate travel costs
        const travelResult = calculateTravelCosts(distance, input.crewPeople, input.crewDays);

        return {
          success: true,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
          travelCost: travelResult.totalTravelCost,
          requiresTravel: travelResult.requiresTravel,
          travelBreakdown: {
            travelTimeCost: travelResult.travelTimeCost,
            mealCost: travelResult.mealCost,
            hotelCost: travelResult.hotelCost,
            travelTimeHours: Math.round(travelResult.travelTimeHours * 10) / 10,
          },
        };
      } catch (error) {
        console.error('Distance calculation error:', error);
        return {
          success: false,
          error: 'Unable to calculate distance. Please check the address and try again.',
          distance: 0,
          travelCost: 0,
          requiresTravel: false,
        };
      }
    }),

  /**
   * Get base location info
   */
  getBaseLocation: publicProcedure.query(() => {
    const baseLocation = getBaseLocation();
    return {
      name: baseLocation.name,
      latitude: baseLocation.latitude,
      longitude: baseLocation.longitude,
    };
  }),
});


