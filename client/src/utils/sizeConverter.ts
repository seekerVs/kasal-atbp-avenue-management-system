// client/src/utils/sizeConverter.ts

// The size chart data you provided.
const sizeChart = {
  XXS: { Chest: { min: 78, max: 84 }, Waist: { min: 66, max: 72 } },
  XS: { Chest: { min: 80, max: 88 }, Waist: { min: 68, max: 76 } },
  S: { Chest: { min: 88, max: 96 }, Waist: { min: 76, max: 84 } },
  M: { Chest: { min: 96, max: 104 }, Waist: { min: 84, max: 92 } },
  L: { Chest: { min: 104, max: 112 }, Waist: { min: 92, max: 100 } },
  XL: { Chest: { min: 112, max: 120 }, Waist: { min: 92, max: 100 } },
  XXL: { Chest: { min: 120, max: 128 }, Waist: { min: 100, max: 108 } },
  '3XL': { Chest: { min: 128, max: 136 }, Waist: { min: 108, max: 116 } },
  '4XL': { Chest: { min: null, max: null }, Waist: { min: 116, max: 124 } },
};

// Define the order of sizes for a deterministic search.
const sizeOrder: (keyof typeof sizeChart)[] = [
  'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'
];

/**
 * Converts a set of body measurements to a standard size.
 * It primarily uses 'Chest' and 'Waist' measurements.
 * 
 * @param measurements - An object where keys are measurement names (e.g., "Chest")
 *                       and values are the measurements in cm.
 * @returns The corresponding size string (e.g., "M") or "Custom" if no match is found.
 */
export const convertMeasurementsToSize = (
  measurements: { [key: string]: number | string }
): string => {

  // Ensure Chest and Waist measurements are present and are numbers.
  const chest = Number(measurements.Chest || measurements.chest);
  const waist = Number(measurements.Waist || measurements.waist);

  if (isNaN(chest) || isNaN(waist)) {
    // If key measurements are missing, we can't determine a standard size.
    return "Custom";
  }

  // Iterate through the predefined size order to find the first matching size.
  for (const size of sizeOrder) {
    const chartEntry = sizeChart[size];
    
    // Check if the chest measurement fits within the range for this size.
    // Handles cases where min or max might be null.
    const isChestMatch = 
      (chartEntry.Chest.min === null || chest >= chartEntry.Chest.min) &&
      (chartEntry.Chest.max === null || chest <= chartEntry.Chest.max);

    // Check if the waist measurement fits within the range for this size.
    const isWaistMatch =
      (chartEntry.Waist.min === null || waist >= chartEntry.Waist.min) &&
      (chartEntry.Waist.max === null || waist <= chartEntry.Waist.max);

    // If both chest and waist fit, we've found our size.
    if (isChestMatch && isWaistMatch) {
      return size;
    }
  }

  // If the loop completes and no size matched, it's a custom fit.
  return "Custom";
};