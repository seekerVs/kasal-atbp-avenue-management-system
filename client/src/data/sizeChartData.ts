// client/src/data/sizeChartData.ts

// A single, centralized source of truth for the size chart data.
// All measurements are in cm.

export const sizeChart = {
  XS:  { Chest: { min: 88, max: 92 },  Waist: { min: 72, max: 76 }, Hips: { min: 88, max: 92 }, Height: '170-175' },
  S:   { Chest: { min: 92, max: 96 },  Waist: { min: 76, max: 80 }, Hips: { min: 92, max: 96 }, Height: '170-175' },
  M:   { Chest: { min: 96, max: 100 }, Waist: { min: 80, max: 84 }, Hips: { min: 96, max: 100 }, Height: '175-180' },
  L:   { Chest: { min: 100, max: 105 },Waist: { min: 84, max: 89 }, Hips: { min: 100, max: 105 }, Height: '180-185' },
  XL:  { Chest: { min: 105, max: 110 },Waist: { min: 89, max: 94 }, Hips: { min: 105, max: 110 }, Height: '180-185' },
  XXL: { Chest: { min: 110, max: 115 },Waist: { min: 94, max: 99 }, Hips: { min: 110, max: 115 }, Height: '185-190' },
};

// The order of sizes for a deterministic search and display.
export const sizeOrder: (keyof typeof sizeChart)[] = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL'
];