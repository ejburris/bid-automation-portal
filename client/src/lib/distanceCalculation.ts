export type LocationPoint = {
  name: string;
  latitude: number;
  longitude: number;
};

export type DistanceCalculationResult = {
  distance: number | null;
  distanceStatus: 'Known' | 'Unknown / needs review';
  matchedLocationName?: string;
};

export const VANCOUVER_WA_HOME_BASE: LocationPoint = {
  name: 'Vancouver, WA',
  latitude: 45.6387,
  longitude: -122.6615,
};

const KNOWN_LOCATIONS: Record<string, LocationPoint> = {
  // Oregon
  'portland': { name: 'Portland, OR', latitude: 45.5152, longitude: -122.6784 },
  'salem': { name: 'Salem, OR', latitude: 44.9429, longitude: -123.0351 },
  'eugene': { name: 'Eugene, OR', latitude: 44.0521, longitude: -123.0868 },
  'gresham': { name: 'Gresham, OR', latitude: 45.5001, longitude: -122.4302 },
  'hillsboro': { name: 'Hillsboro, OR', latitude: 45.5229, longitude: -122.9898 },
  'bend': { name: 'Bend, OR', latitude: 44.0582, longitude: -121.3153 },
  'beaverton': { name: 'Beaverton, OR', latitude: 45.4871, longitude: -122.8037 },
  'medford': { name: 'Medford, OR', latitude: 42.3265, longitude: -122.8756 },
  'springfield': { name: 'Springfield, OR', latitude: 44.0462, longitude: -123.0220 },
  'corvallis': { name: 'Corvallis, OR', latitude: 44.5646, longitude: -123.2620 },
  'albany': { name: 'Albany, OR', latitude: 44.6365, longitude: -123.1059 },
  'tigard': { name: 'Tigard, OR', latitude: 45.4312, longitude: -122.7715 },
  'lake oswego': { name: 'Lake Oswego, OR', latitude: 45.4207, longitude: -122.6706 },
  'keizer': { name: 'Keizer, OR', latitude: 44.9901, longitude: -123.0262 },
  'grants pass': { name: 'Grants Pass, OR', latitude: 42.4390, longitude: -123.3284 },
  'oregon city': { name: 'Oregon City, OR', latitude: 45.3573, longitude: -122.6068 },
  'mcminnville': { name: 'McMinnville, OR', latitude: 45.2101, longitude: -123.1987 },
  'redmond or': { name: 'Redmond, OR', latitude: 44.2726, longitude: -121.1739 },
  'redmond, or': { name: 'Redmond, OR', latitude: 44.2726, longitude: -121.1739 },
  'tualatin': { name: 'Tualatin, OR', latitude: 45.3840, longitude: -122.7630 },
  'west linn': { name: 'West Linn, OR', latitude: 45.3657, longitude: -122.6123 },
  'woodburn': { name: 'Woodburn, OR', latitude: 45.1437, longitude: -122.8554 },
  'forest grove': { name: 'Forest Grove, OR', latitude: 45.5198, longitude: -123.1107 },
  'newberg': { name: 'Newberg, OR', latitude: 45.3001, longitude: -122.9732 },
  'roseburg': { name: 'Roseburg, OR', latitude: 43.2165, longitude: -123.3417 },
  'klamath falls': { name: 'Klamath Falls, OR', latitude: 42.2249, longitude: -121.7817 },
  'milwaukie': { name: 'Milwaukie, OR', latitude: 45.4462, longitude: -122.6393 },

  // Washington
  'seattle': { name: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 },
  'spokane': { name: 'Spokane, WA', latitude: 47.6588, longitude: -117.4260 },
  'tacoma': { name: 'Tacoma, WA', latitude: 47.2529, longitude: -122.4443 },
  'vancouver': { name: 'Vancouver, WA', latitude: 45.6387, longitude: -122.6615 },
  'bellevue': { name: 'Bellevue, WA', latitude: 47.6101, longitude: -122.2015 },
  'kent': { name: 'Kent, WA', latitude: 47.3809, longitude: -122.2348 },
  'everett': { name: 'Everett, WA', latitude: 47.9789, longitude: -122.2021 },
  'renton': { name: 'Renton, WA', latitude: 47.4829, longitude: -122.2171 },
  'spokane valley': { name: 'Spokane Valley, WA', latitude: 47.6732, longitude: -117.2394 },
  'federal way': { name: 'Federal Way, WA', latitude: 47.3223, longitude: -122.3126 },
  'yakima': { name: 'Yakima, WA', latitude: 46.6021, longitude: -120.5059 },
  'kirkland': { name: 'Kirkland, WA', latitude: 47.6769, longitude: -122.2060 },
  'bellingham': { name: 'Bellingham, WA', latitude: 48.7519, longitude: -122.4787 },
  'kennewick': { name: 'Kennewick, WA', latitude: 46.2112, longitude: -119.1372 },
  'auburn': { name: 'Auburn, WA', latitude: 47.3073, longitude: -122.2285 },
  'pasco': { name: 'Pasco, WA', latitude: 46.2396, longitude: -119.1006 },
  'marysville': { name: 'Marysville, WA', latitude: 48.0518, longitude: -122.1771 },
  'lakewood': { name: 'Lakewood, WA', latitude: 47.1718, longitude: -122.5185 },
  'redmond wa': { name: 'Redmond, WA', latitude: 47.6740, longitude: -122.1215 },
  'redmond, wa': { name: 'Redmond, WA', latitude: 47.6740, longitude: -122.1215 },
  'shoreline': { name: 'Shoreline, WA', latitude: 47.7557, longitude: -122.3415 },
  'richland': { name: 'Richland, WA', latitude: 46.2857, longitude: -119.2845 },
  'sammamish': { name: 'Sammamish, WA', latitude: 47.6163, longitude: -122.0356 },
  'olympia': { name: 'Olympia, WA', latitude: 47.0379, longitude: -122.9007 },
  'lacey': { name: 'Lacey, WA', latitude: 47.0343, longitude: -122.8232 },
  'burien': { name: 'Burien, WA', latitude: 47.4704, longitude: -122.3468 },
  'edmonds': { name: 'Edmonds, WA', latitude: 47.8107, longitude: -122.3774 },
  'bremerton': { name: 'Bremerton, WA', latitude: 47.5673, longitude: -122.6326 },
  'puyallup': { name: 'Puyallup, WA', latitude: 47.1854, longitude: -122.2929 },
  'longview': { name: 'Longview, WA', latitude: 46.1382, longitude: -122.9382 },
  'walla walla': { name: 'Walla Walla, WA', latitude: 46.0646, longitude: -118.3430 },
  'mount vernon': { name: 'Mount Vernon, WA', latitude: 48.4212, longitude: -122.3340 },
  'pullman': { name: 'Pullman, WA', latitude: 46.7298, longitude: -117.1817 },

  // Other explicitly supported cities
  'doral': { name: 'Doral, FL', latitude: 25.8195, longitude: -80.3553 },
};

function calculateHaversineDistance(from: LocationPoint, to: LocationPoint) {
  const earthRadiusMiles = 3959;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function findKnownLocation(projectAddress: string) {
  const normalized = projectAddress.toLowerCase();
  return Object.entries(KNOWN_LOCATIONS)
    .sort(([left], [right]) => right.length - left.length)
    .find(([city]) => normalized.includes(city))?.[1] ?? null;
}

export function calculateDistance(homeBase: LocationPoint, projectAddress: string): DistanceCalculationResult {
  if (!projectAddress.trim()) {
    return { distance: null, distanceStatus: 'Unknown / needs review' };
  }

  const destination = findKnownLocation(projectAddress);
  if (!destination) {
    return { distance: null, distanceStatus: 'Unknown / needs review' };
  }

  return {
    distance: Math.round(calculateHaversineDistance(homeBase, destination)),
    distanceStatus: 'Known',
    matchedLocationName: destination.name,
  };
}
