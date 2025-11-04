// client/src/utils/sizeConverter.ts

import { adultSizeChart, adultSizeOrder, kidsSizeChart, kidsSizeOrder } from '../data/sizeChartData';

/**
 * Converts a set of body measurements to a standard size based on the specified age group.
 *
 * @param measurements - An object where keys are measurement names and values are in cm.
 * @param ageGroup - The age group ('Adult' or 'Kids') to use for size chart selection.
 * @returns The corresponding size string (e.g., "M") or "Custom" if no match is found.
 */
export const convertMeasurementsToSize = (
  measurements: { [key: string]: number | string },
  ageGroup: 'Adult' | 'Kids' = 'Adult' // Default to 'Adult' if not provided
): string => {

  // --- Step 1: Select the correct size chart data based on ageGroup ---
  const isKids = ageGroup === 'Kids';
  const sizeChart = isKids ? kidsSizeChart : adultSizeChart;
  const sizeOrder = isKids ? kidsSizeOrder : adultSizeOrder;

  // --- Step 2: Measurement processing (remains the same) ---
  const chest = Number(measurements.Chest || measurements.chest);
  const waist = Number(measurements.Waist || measurements.waist);
  const hips = Number(measurements.Hips || measurements.hips);

  if ((isNaN(chest) || chest === 0) && (isNaN(waist) || waist === 0) && (isNaN(hips) || hips === 0)) {
    return "";
  }

  // --- Step 3: First Pass - Attempt a perfect match (remains the same) ---
  for (const size of sizeOrder) {
    if (size === 'CUSTOM') continue;
    
    const chartEntry = sizeChart[size as keyof typeof sizeChart];
    
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
      return size;
    }
  }

  // --- Step 4: Second Pass - Fallback to Chest-only match (remains the same) ---
  if (!isNaN(chest) && chest > 0) {
    for (const size of sizeOrder) {
      if (size === 'CUSTOM') continue;
      const chartEntry = sizeChart[size as keyof typeof sizeChart];
      const isChestMatch = chest >= chartEntry.Chest.min && chest <= chartEntry.Chest.max;
      if (isChestMatch) {
        return size;
      }
    }
  }

  return "Custom";
};