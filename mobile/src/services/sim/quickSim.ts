export type QuickSimParams = {
  muPerHour: number;
  sigmaPerHour: number;
  nu?: number;
  horizonHours: number;
  bankrollStart: number;
  iterations: number;
  seed?: number;
};

export type QuickSimResult = {
  mean: number;
  median: number;
  p5: number;
  p95: number;
  riskOfRuinPct: number;
};

export function runQuickSim({
  muPerHour,
  sigmaPerHour,
  nu = 5,
  horizonHours,
  bankrollStart,
  iterations,
  seed = 42
}: QuickSimParams): QuickSimResult {
  const rng = mulberry32(seed);
  const endings: number[] = new Array(iterations).fill(0);
  let ruined = 0;
  for (let i = 0; i < iterations; i += 1) {
    let bankroll = bankrollStart;
    for (let h = 0; h < horizonHours; h += 1) {
      const draw = studentTSample(nu, rng);
      const hourly = muPerHour + draw * sigmaPerHour;
      bankroll += hourly;
      if (bankroll <= 0) {
        ruined += 1;
        bankroll = 0;
        break;
      }
    }
    endings[i] = bankroll;
  }
  endings.sort((a, b) => a - b);
  const percentile = (p: number) => {
    const idx = Math.max(0, Math.min(endings.length - 1, Math.floor(p * (endings.length - 1))));
    return endings[idx];
  };
  const total = endings.reduce((sum, value) => sum + value, 0);
  return {
    mean: total / endings.length,
    median: percentile(0.5),
    p5: percentile(0.05),
    p95: percentile(0.95),
    riskOfRuinPct: (ruined / iterations) * 100
  };
}

function studentTSample(nu: number, rng: () => number) {
  if (nu <= 0) {
    throw new Error('Degrees of freedom must be positive');
  }
  const z = gaussianSample(rng);
  const g = gammaSample(nu / 2, 2, rng);
  return z / Math.sqrt(g / nu);
}

function gaussianSample(rng: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function gammaSample(k: number, theta: number, rng: () => number) {
  if (k < 1) {
    const c = 1 / k;
    const d = (1 - k) * Math.pow(k, k / (1 - k));
    while (true) {
      const u = rng();
      const v = rng();
      const z = -Math.log(u);
      const e = -Math.log(v);
      if (z + e >= d) {
        return Math.pow(z, c) * theta;
      }
    }
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x = gaussianSample(rng);
    let v = 1 + c * x;
    if (v <= 0) continue;
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v * theta;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * theta;
  }
}

function mulberry32(seed: number) {
  let t = seed + 0x6d2b79f5;
  return function () {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
