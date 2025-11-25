// client/src/data/sizeChartData.ts

// Centralized source of truth for all size chart data. All measurements are in cm.

// --- ADULT SIZING DATA ---
export const adultSizeChart = {
  XS:  { Chest: { min: 88, max: 92 },  Waist: { min: 72, max: 76 }, Hips: { min: 88, max: 92 }, Height: '170-175' },
  S:   { Chest: { min: 92, max: 96 },  Waist: { min: 76, max: 80 }, Hips: { min: 92, max: 96 }, Height: '170-175' },
  M:   { Chest: { min: 96, max: 100 }, Waist: { min: 80, max: 84 }, Hips: { min: 96, max: 100 }, Height: '175-180' },
  L:   { Chest: { min: 100, max: 105 },Waist: { min: 84, max: 89 }, Hips: { min: 100, max: 105 }, Height: '180-185' },
  XL:  { Chest: { min: 105, max: 110 },Waist: { min: 89, max: 94 }, Hips: { min: 105, max: 110 }, Height: '180-185' },
  XXL: { Chest: { min: 110, max: 115 },Waist: { min: 94, max: 99 }, Hips: { min: 110, max: 115 }, Height: '185-190' },
};

export const adultSizeOrder = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'CUSTOM'
];

// --- KIDS SIZING DATA (from the provided image) ---
export const kidsSizeChart = {
  XS:  { Chest: { min: 49, max: 55 }, Waist: { min: 47, max: 53 }, Hips: { min: 54, max: 62 }, Height: '95-110' },
  S:   { Chest: { min: 55, max: 61 }, Waist: { min: 50, max: 56 }, Hips: { min: 60, max: 68 }, Height: '110-125' },
  M:   { Chest: { min: 61, max: 67 }, Waist: { min: 53, max: 59 }, Hips: { min: 66, max: 74 }, Height: '125-135' },
  L:   { Chest: { min: 65, max: 71 }, Waist: { min: 56, max: 62 }, Hips: { min: 70, max: 78 }, Height: '135-145' },
  XL:  { Chest: { min: 71, max: 77 }, Waist: { min: 59, max: 65 }, Hips: { min: 76, max: 84 }, Height: '145-155' },
  XXL: { Chest: { min: 76, max: 82 }, Waist: { min: 62, max: 68 }, Hips: { min: 82, max: 90 }, Height: '155-165' },
};

export const kidsSizeOrder = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'CUSTOM'
];