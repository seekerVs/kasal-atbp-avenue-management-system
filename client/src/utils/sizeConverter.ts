// client/src/utils/sizeConverter.ts

import { sizeChart, sizeOrder } from '../data/sizeChartData';

/**
 * Converts a set of body measurements to a standard size using a hierarchical approach.
 * It prioritizes a full 3-point match (Chest, Waist, Hips), but falls back
 * to a Chest-only match if a perfect fit isn't found.
 *
 * @param measurements - An object where keys are measurement names and values are in cm.
 * @returns The corresponding size string (e.g., "M") or "Custom" if no match is found.
 */
export const convertMeasurementsToSize = (
  measurements: { [key: string]: number | string }
): string => {

  const chest = Number(measurements.Chest || measurements.chest);
  const waist = Number(measurements.Waist || measurements.waist);
  const hips = Number(measurements.Hips || measurements.hips);

  // If no valid measurements are provided at all, return an empty string.
  if ((isNaN(chest) || chest === 0) && (isNaN(waist) || waist === 0) && (isNaN(hips) || hips === 0)) {
    return "";
  }

  // --- FIRST PASS: Attempt a perfect match with all available data ---
  for (const size of sizeOrder) {
    if (size === 'CUSTOM') continue;
    
    const chartEntry = sizeChart[size as keyof typeof sizeChart];
    
    // Build match conditions based on which measurements were actually provided.
    let isMatch = true;
    if (!isNaN(chest) && chest > 0) {
      isMatch = isMatch && (chest >= chartEntry.Chest.min && chest <= chartEntry.Chest.max);
    }
    if (!isNaN(waist) && waist > 0) {
      isMatch = isMatch && (waist >= chartEntry.Waist.min && waist <= chartEntry.Waist.max);
    }
    if (!isNaN(hips) && hips > 0) {
      isMatch = isMatch && (hips >= chartEntry.Hips.min && hips <= chartEntry.Hips.max);
    }

    if (isMatch) {
      return size; // Found an ideal match
    }
  }

  // --- SECOND PASS: Fallback to a Chest-only match if no perfect match was found ---
  if (!isNaN(chest) && chest > 0) {
    for (const size of sizeOrder) {
      if (size === 'CUSTOM') continue;
      const chartEntry = sizeChart[size as keyof typeof sizeChart];
      const isChestMatch = chest >= chartEntry.Chest.min && chest <= chartEntry.Chest.max;
      if (isChestMatch) {
        return size; // Return the first size that fits the chest measurement
      }
    }
  }

  // If no match was found in either pass, it's a custom size.
  return "Custom";
};