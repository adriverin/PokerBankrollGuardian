import { runQuickSim } from '../quickSim';

describe('runQuickSim', () => {
  it('produces deterministic results with same seed', () => {
    const resultA = runQuickSim({
      muPerHour: 5000,
      sigmaPerHour: 8000,
      horizonHours: 20,
      bankrollStart: 100000,
      iterations: 500,
      seed: 123
    });
    const resultB = runQuickSim({
      muPerHour: 5000,
      sigmaPerHour: 8000,
      horizonHours: 20,
      bankrollStart: 100000,
      iterations: 500,
      seed: 123
    });
    expect(resultA).toEqual(resultB);
  });

  it('computes increasing risk of ruin when bankroll decreases', () => {
    const safe = runQuickSim({
      muPerHour: 5000,
      sigmaPerHour: 6000,
      horizonHours: 10,
      bankrollStart: 200000,
      iterations: 500,
      seed: 42
    });
    const risky = runQuickSim({
      muPerHour: 5000,
      sigmaPerHour: 6000,
      horizonHours: 10,
      bankrollStart: 20000,
      iterations: 500,
      seed: 42
    });
    expect(risky.riskOfRuinPct).toBeGreaterThan(safe.riskOfRuinPct);
  });
});
