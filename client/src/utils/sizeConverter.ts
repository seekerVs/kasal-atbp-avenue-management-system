import { adultSizeChart, adultSizeOrder, kidsSizeChart, kidsSizeOrder } from '../data/sizeChartData';

/**
 * Converts body measurements to a standard size using a hierarchical approach
 * based on age group and outfit type.
 *
 * @param measurements - An object of measurements in cm.
 * @param ageGroup - The age group ('Adult' or 'Kids') to select the correct size chart.
 * @param outfitType - The type of outfit ('Topwear' or 'Bottomwear') to determine the fallback logic.
 * @returns The corresponding size string (e.g., "M"), "Custom", or "".
 */
export const convertMeasurementsToSize = (
  measurements: { [key: string]: number | string },
  ageGroup: 'Adult' | 'Kids' = 'Adult',
  outfitType: 'Topwear' | 'Bottomwear' = 'Topwear'
): string => {

  // --- Step 1: Select the correct size chart data based on ageGroup ---
  const isKids = ageGroup === 'Kids';
  const sizeChart = isKids ? kidsSizeChart : adultSizeChart;
  const sizeOrder = isKids ? kidsSizeOrder : adultSizeOrder;

  // --- Step 2: Measurement processing ---
  const chest = Number(measurements.Chest || measurements.chest);
  const waist = Number(measurements.Waist || measurements.waist);
  const hips = Number(measurements.Hips || measurements.hips);

  const hasChest = !isNaN(chest) && chest > 0;
  const hasWaist = !isNaN(waist) && waist > 0;
  const hasHips = !isNaN(hips) && hips > 0;

  if (!hasChest && !hasWaist && !hasHips) {
    return ""; // Return empty if no valid measurements are provided
  }

  // --- Step 3: First Pass - Attempt a perfect 3-point match ---
  // This is the most accurate and is always prioritized if data is available.
  if (hasChest && hasWaist && hasHips) {
    for (const size of sizeOrder) {
      if (size === 'CUSTOM') continue;
      const chartEntry = sizeChart[size as keyof typeof sizeChart];
      const isMatch = 
        (chest >= chartEntry.Chest.min && chest <= chartEntry.Chest.max) &&
        (waist >= chartEntry.Waist.min && waist <= chartEntry.Waist.max) &&
        (hips >= chartEntry.Hips.min && hips <= chartEntry.Hips.max);
      
      if (isMatch) {
        return size; // Found a perfect match
      }
    }
  }

  // --- Step 4: Second Pass - Fallback logic based on outfitType ---
  if (outfitType === 'Topwear' && hasChest) {
    for (const size of sizeOrder) {
      if (size === 'CUSTOM') continue;
      const chartEntry = sizeChart[size as keyof typeof sizeChart];
      if (chest >= chartEntry.Chest.min && chest <= chartEntry.Chest.max) {
        return size; // Return the first size that fits the chest
      }
    }
  }

  if (outfitType === 'Bottomwear' && (hasWaist || hasHips)) {
    for (const size of sizeOrder) {
      if (size === 'CUSTOM') continue;
      const chartEntry = sizeChart[size as keyof typeof sizeChart];
      
      // For bottomwear, a match in EITHER waist OR hips is a good fallback.
      const isWaistMatch = hasWaist && (waist >= chartEntry.Waist.min && waist <= chartEntry.Waist.max);
      const isHipsMatch = hasHips && (hips >= chartEntry.Hips.min && hips <= chartEntry.Hips.max);
      
      if (isWaistMatch || isHipsMatch) {
        return size; // Return the first size that fits either waist or hips
      }
    }
  }

  // If no match was found in any pass, it's a custom size.
  return "Custom";
};