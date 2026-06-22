import {inferNeckFromThor, mapNodeTToSpine, SPINE_KINEMATICS} from '../spineKinematics';

describe('spineKinematics', () => {
  it('keeps physiological neck rest at upright thor', () => {
    expect(inferNeckFromThor(0)).toBe(SPINE_KINEMATICS.normalNeckRestDeg);
  });

  it('couples neck to thoracic slump', () => {
    const thor = 20;
    const neck = inferNeckFromThor(thor);
    const excess = thor - SPINE_KINEMATICS.thorDeadbandDeg;
    expect(neck).toBeCloseTo(SPINE_KINEMATICS.normalNeckRestDeg + excess * SPINE_KINEMATICS.neckThorCoupling);
  });

  it('reduces neck when thor extends below baseline', () => {
    expect(inferNeckFromThor(-10)).toBeLessThan(SPINE_KINEMATICS.normalNeckRestDeg);
    expect(inferNeckFromThor(-10)).toBeGreaterThanOrEqual(0);
  });

  it('maps node-T to three nodes', () => {
    const s = mapNodeTToSpine(15, -5);
    expect(s.thorPitch).toBe(15);
    expect(s.lumbarRoll).toBe(-5);
    expect(s.neckPitch).toBe(inferNeckFromThor(15));
  });
});
