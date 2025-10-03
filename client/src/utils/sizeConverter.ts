// client/src/utils/sizeConverter.ts

// --- (1) IMPORT the data from our new centralized file ---
import { sizeChart, sizeOrder } from '../data/sizeChartData';

/**
 * Converts a set of body measurements to a standard size.
 * It now uses 'Chest', 'Waist', and 'Hips' measurements for a more accurate fit.
 * 
 * @param measurements - An object where keys are measurement names (e.g., "Chest")
 *                       and values are the measurements in cm.
 * @returns The corresponding size string (e.g., "M") or "Custom" if no match is found.
 */
export const convertMeasurementsToSize = (
  measurements: { [key: string]: number | string }
): string => {

  // Ensure Chest, Waist, and Hips measurements are present and are numbers.
  const chest = Number(measurements.Chest || measurements.chest);
  const waist = Number(measurements.Waist || measurements.waist);
  const hips = Number(measurements.Hips || measurements.hips);

  if (isNaN(chest) || isNaN(waist) || isNaN(hips) || chest === 0 || waist === 0 || hips === 0) {
    // If any key measurements are missing or zero, we can't determine a standard size.
    return "";
  }

  // Iterate through the predefined size order to find the first matching size.
  for (const size of sizeOrder) {
    const chartEntry = sizeChart[size];
    
    // Check if the chest measurement fits within the range for this size.
    const isChestMatch = chest >= chartEntry.Chest.min && chest <= chartEntry.Chest.max;

    // Check if the waist measurement fits within the range for this size.
    const isWaistMatch = waist >= chartEntry.Waist.min && waist <= chartEntry.Waist.max;
    
    // Check if the hips measurement fits within the range for this size.
    const isHipsMatch = hips >= chartEntry.Hips.min && hips <= chartEntry.Hips.max;

    // If all three measurements fit, we've found our size.
    if (isChestMatch && isWaistMatch && isHipsMatch) {
      return size;
    }
  }

  // If the loop completes and no size matched, it's a custom fit.
  return "Custom";
};