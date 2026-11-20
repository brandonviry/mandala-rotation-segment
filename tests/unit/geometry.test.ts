import { describe, expect, it } from 'vitest';

import {
  generateMandalaGeometry,
  reflectPoint,
  rotatePoint,
} from '../../src/core/geometry';
import {
  DEFAULT_MANDALA_CONFIG,
  type MandalaConfig,
} from '../../src/core/types';
import {
  CONFIG_LIMITS,
  validateMandalaConfig,
} from '../../src/core/validation';

function config(overrides: Partial<MandalaConfig> = {}): MandalaConfig {
  return {
    ...DEFAULT_MANDALA_CONFIG,
    palette: [...DEFAULT_MANDALA_CONFIG.palette],
    ...overrides,
  };
}

describe('generateMandalaGeometry', () => {
  it('returns exactly the same geometry for the same seed and config', () => {
    const first = generateMandalaGeometry(config({ seed: 'stable-seed' }));
    const second = generateMandalaGeometry(config({ seed: 'stable-seed' }));

    expect(second).toEqual(first);
  });

  it('changes the geometry when the seed changes', () => {
    const first = generateMandalaGeometry(config({ seed: 'seed-a' }));
    const second = generateMandalaGeometry(config({ seed: 'seed-b' }));

    expect(second.sourcePaths).not.toEqual(first.sourcePaths);
  });

  it('keeps every generated point within the normalized unit circle', () => {
    const geometry = generateMandalaGeometry(
      config({
        seed: 'normalized',
        primitive: 'mixed',
        sectionCount: 32,
        ringCount: 12,
        pointCount: 48,
      }),
    );

    for (const section of geometry.sections) {
      for (const seedPath of section.paths) {
        for (const point of seedPath.points) {
          expect(Math.hypot(point.x, point.y)).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it.each(['line', 'polygon', 'bezier'] as const)(
    'creates only %s source paths',
    (primitive) => {
      const geometry = generateMandalaGeometry(config({ primitive }));

      expect(geometry.sourcePaths.length).toBeGreaterThan(0);
      expect(
        geometry.sourcePaths.every(
          (sourcePath) => sourcePath.primitive === primitive,
        ),
      ).toBe(true);
      expect(
        geometry.sourcePaths.every(
          (sourcePath) => sourcePath.closed === (primitive === 'polygon'),
        ),
      ).toBe(true);
    },
  );

  it('cycles through all drawable primitives in mixed mode', () => {
    const geometry = generateMandalaGeometry(
      config({ primitive: 'mixed', pointCount: 3 }),
    );
    const primitives = new Set(
      geometry.sourcePaths.map((seedPath) => seedPath.primitive),
    );

    expect(primitives).toEqual(new Set(['line', 'polygon', 'bezier']));
  });

  it('creates one reflected pair of local paths in every section', () => {
    const geometry = generateMandalaGeometry(
      config({ primitive: 'mixed', pointCount: 9, sectionCount: 7 }),
    );

    expect(geometry.sections).toHaveLength(7);
    expect(geometry.mirroredPaths).toHaveLength(
      geometry.sourcePaths.length,
    );
    for (const section of geometry.sections) {
      expect(section.paths).toHaveLength(geometry.sourcePaths.length * 2);
    }
  });

  it('copies the config so later caller mutations cannot change geometry', () => {
    const input = config({ palette: ['#000000', '#ffffff'] });
    const geometry = generateMandalaGeometry(input);

    input.palette[0] = '#ff0000';

    expect(geometry.config.palette[0]).toBe('#000000');
  });
});

describe('geometry transforms', () => {
  it('reflects points over the radial x axis', () => {
    expect(reflectPoint({ x: 0.25, y: 0.75 })).toEqual({
      x: 0.25,
      y: -0.75,
    });
  });

  it('reflects points over an arbitrary axis', () => {
    const reflected = reflectPoint({ x: 1, y: 0 }, Math.PI / 4);

    expect(reflected.x).toBeCloseTo(0, 12);
    expect(reflected.y).toBeCloseTo(1, 12);
  });

  it('rotates points counterclockwise around the shared origin', () => {
    const rotated = rotatePoint({ x: 1, y: 0 }, Math.PI / 2);

    expect(rotated.x).toBeCloseTo(0, 12);
    expect(rotated.y).toBeCloseTo(1, 12);
  });

  it('covers one full turn with N unique rotations and no duplicate endpoint', () => {
    const sectionCount = 12;
    const geometry = generateMandalaGeometry(config({ sectionCount }));
    const rotations = geometry.sections.map((section) => section.rotation);

    expect(rotations).toHaveLength(sectionCount);
    expect(new Set(rotations).size).toBe(sectionCount);
    expect(rotations[0]).toBe(0);
    expect(rotations.at(-1)).toBeCloseTo(
      (Math.PI * 2 * (sectionCount - 1)) / sectionCount,
      12,
    );
    expect(rotations.every((rotation) => rotation < Math.PI * 2)).toBe(true);
  });
});

describe('validateMandalaConfig', () => {
  it('accepts all inclusive parameter boundaries', () => {
    const minimumIssues = validateMandalaConfig(
      config({
        sectionCount: CONFIG_LIMITS.sectionCount.min,
        ringCount: CONFIG_LIMITS.ringCount.min,
        pointCount: CONFIG_LIMITS.pointCount.min,
        strokeWidth: CONFIG_LIMITS.strokeWidth.min,
        strokeOpacity: CONFIG_LIMITS.strokeOpacity.min,
        exportResolution: 2048,
      }),
    );
    const maximumIssues = validateMandalaConfig(
      config({
        sectionCount: CONFIG_LIMITS.sectionCount.max,
        ringCount: CONFIG_LIMITS.ringCount.max,
        pointCount: CONFIG_LIMITS.pointCount.max,
        strokeWidth: CONFIG_LIMITS.strokeWidth.max,
        strokeOpacity: CONFIG_LIMITS.strokeOpacity.max,
        exportResolution: 4096,
      }),
    );

    expect(minimumIssues).toEqual([]);
    expect(maximumIssues).toEqual([]);
  });

  it.each([
    ['sectionCount', CONFIG_LIMITS.sectionCount.min - 1],
    ['sectionCount', CONFIG_LIMITS.sectionCount.max + 1],
    ['sectionCount', 4.5],
    ['ringCount', CONFIG_LIMITS.ringCount.min - 1],
    ['ringCount', CONFIG_LIMITS.ringCount.max + 1],
    ['pointCount', CONFIG_LIMITS.pointCount.min - 1],
    ['pointCount', CONFIG_LIMITS.pointCount.max + 1],
    ['strokeWidth', CONFIG_LIMITS.strokeWidth.min - 0.01],
    ['strokeWidth', CONFIG_LIMITS.strokeWidth.max + 0.01],
    ['strokeOpacity', CONFIG_LIMITS.strokeOpacity.min - 0.01],
    ['strokeOpacity', CONFIG_LIMITS.strokeOpacity.max + 0.01],
  ] as const)('rejects %s=%s outside its bounds', (field, value) => {
    const issues = validateMandalaConfig(config({ [field]: value }));

    expect(issues.some((issue) => issue.field === field)).toBe(true);
  });

  it('rejects unsupported primitives, modes and export resolutions', () => {
    const invalid = config({
      primitive: 'arc' as MandalaConfig['primitive'],
      mode: 'print' as MandalaConfig['mode'],
      exportResolution: 1024 as MandalaConfig['exportResolution'],
    });
    const fields = validateMandalaConfig(invalid).map((issue) => issue.field);

    expect(fields).toEqual(
      expect.arrayContaining(['primitive', 'mode', 'exportResolution']),
    );
  });

  it('makes generation fail fast for an invalid config', () => {
    expect(() =>
      generateMandalaGeometry(config({ pointCount: 2 })),
    ).toThrowError(RangeError);
  });
});
