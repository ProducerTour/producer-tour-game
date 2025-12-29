/**
 * Height Distribution Histogram
 * Compares terrain height distribution with and without bias curve
 */

// Simple seeded random for consistent results
function seededRandom(seed: number) {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Simplified FBM approximation for histogram
function fbm(x: number, z: number, seed: number): number {
  const random = seededRandom(seed + Math.floor(x * 1000) + Math.floor(z * 1000000));
  // Simulate FBM-like distribution (approximately gaussian centered at 0)
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    sum += (random() * 2 - 1) * Math.pow(0.5, i);
  }
  return Math.max(-1, Math.min(1, sum / 1.5)); // Clamp to [-1, 1]
}

// Height calculation WITHOUT bias (original linear)
function heightLinear(baseFBM: number): number {
  const h = baseFBM * 0.5 + 0.5; // [0, 1]
  return h * 40 - 5; // [-5, 35]
}

// Height calculation WITH bias curve
function heightBiased(baseFBM: number, power: number = 1.2): number {
  const h = baseFBM * 0.5 + 0.5; // [0, 1]
  const biased = Math.pow(h, power);
  return biased * 40 - 5; // [-5, 35] but biased toward lower values
}

// Count heights in bands
function countBands(heights: number[]): Record<string, number> {
  const bands = {
    'below_0m': 0,
    '0-2m': 0,
    '2-6m': 0,
    '6-12m': 0,
    '12-20m': 0,
    '20-30m': 0,
    'above_30m': 0,
  };

  for (const h of heights) {
    if (h < 0) bands['below_0m']++;
    else if (h < 2) bands['0-2m']++;
    else if (h < 6) bands['2-6m']++;
    else if (h < 12) bands['6-12m']++;
    else if (h < 20) bands['12-20m']++;
    else if (h < 30) bands['20-30m']++;
    else bands['above_30m']++;
  }

  return bands;
}

// Generate sample points
const SAMPLE_COUNT = 10000;
const SEED = 12345;

console.log('=== Height Distribution Histogram ===\n');
console.log(`Sampling ${SAMPLE_COUNT} points...\n`);

const linearHeights: number[] = [];
const biasedHeights: number[] = [];

const random = seededRandom(SEED);

for (let i = 0; i < SAMPLE_COUNT; i++) {
  const x = (random() - 0.5) * 4000; // -2000 to 2000
  const z = (random() - 0.5) * 4000;

  const baseFBM = fbm(x, z, SEED);

  linearHeights.push(heightLinear(baseFBM));
  biasedHeights.push(heightBiased(baseFBM, 1.2));
}

const linearBands = countBands(linearHeights);
const biasedBands = countBands(biasedHeights);

console.log('Height Band     | Linear (no bias) | Biased (power=1.2) | Change');
console.log('----------------|------------------|--------------------|---------');

const bandNames = ['below_0m', '0-2m', '2-6m', '6-12m', '12-20m', '20-30m', 'above_30m'];

for (const band of bandNames) {
  const linearPct = (linearBands[band] / SAMPLE_COUNT * 100).toFixed(1);
  const biasedPct = (biasedBands[band] / SAMPLE_COUNT * 100).toFixed(1);
  const change = (biasedBands[band] - linearBands[band]) / SAMPLE_COUNT * 100;
  const changeStr = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;

  console.log(
    `${band.padEnd(15)} | ${linearPct.padStart(15)}% | ${biasedPct.padStart(17)}% | ${changeStr}`
  );
}

// Beach zone analysis (0-6m)
const linearBeach = linearBands['0-2m'] + linearBands['2-6m'];
const biasedBeach = biasedBands['0-2m'] + biasedBands['2-6m'];

console.log('\n=== Beach Zone (0-6m) Summary ===');
console.log(`Linear:  ${(linearBeach / SAMPLE_COUNT * 100).toFixed(1)}% of terrain`);
console.log(`Biased:  ${(biasedBeach / SAMPLE_COUNT * 100).toFixed(1)}% of terrain`);
console.log(`Increase: ${((biasedBeach - linearBeach) / linearBeach * 100).toFixed(1)}% more beach terrain`);

// Power curve comparison
console.log('\n=== Power Curve Comparison ===');
console.log('Power | Beach Zone % | vs Linear');
console.log('------|--------------|----------');

for (const power of [1.0, 1.1, 1.15, 1.2, 1.25, 1.3]) {
  const heights: number[] = [];
  const r = seededRandom(SEED);

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const x = (r() - 0.5) * 4000;
    const z = (r() - 0.5) * 4000;
    const baseFBM = fbm(x, z, SEED);
    heights.push(heightBiased(baseFBM, power));
  }

  const bands = countBands(heights);
  const beachPct = (bands['0-2m'] + bands['2-6m']) / SAMPLE_COUNT * 100;
  const vsLinear = beachPct - (linearBeach / SAMPLE_COUNT * 100);

  console.log(
    `${power.toFixed(2).padStart(5)} | ${beachPct.toFixed(1).padStart(11)}% | ${vsLinear >= 0 ? '+' : ''}${vsLinear.toFixed(1)}%`
  );
}
