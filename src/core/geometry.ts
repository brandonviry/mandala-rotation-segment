import { createSeededRandom, type RandomSource } from './prng';
import type {
  MandalaConfig,
  MandalaGeometry,
  Point,
  RenderPrimitive,
  SeedPath,
} from './types';
import { assertValidMandalaConfig } from './validation';

const FULL_TURN = Math.PI * 2;
const INNER_RADIUS = 0.12;
const OUTER_RADIUS = 0.96;

export function rotatePoint(point: Point, angle: number): Point {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

/**
 * Reflects a point over an axis through the origin.
 * axisAngle=0 reflects over the local radial (x) axis.
 */
export function reflectPoint(point: Point, axisAngle = 0): Point {
  const cosine = Math.cos(axisAngle * 2);
  const sine = Math.sin(axisAngle * 2);

  return {
    x: point.x * cosine + point.y * sine,
    y: point.x * sine - point.y * cosine,
  };
}

function cloneConfig(config: MandalaConfig): MandalaConfig {
  return {
    ...config,
    palette: [...config.palette],
  };
}

function createSeedPoints(
  config: MandalaConfig,
  halfSectionAngle: number,
  random: RandomSource,
): Point[] {
  const points: Point[] = [];

  const basePointsPerRing = Math.floor(
    config.pointCount / config.ringCount,
  );
  const remainder = config.pointCount % config.ringCount;

  // Build one ordered cluster per concentric ring. Keeping the radius
  // progression monotonic prevents the long center-crossing spikes produced
  // by an interleaved ring order, while seeded angular jitter keeps each
  // section organic.
  for (let ringIndex = 0; ringIndex < config.ringCount; ringIndex += 1) {
    const pointsOnRing =
      basePointsPerRing + (ringIndex < remainder ? 1 : 0);
    if (pointsOnRing === 0) continue;

    const ringProgress = ringIndex / (config.ringCount - 1);
    const baseRadius =
      INNER_RADIUS + ringProgress * (OUTER_RADIUS - INNER_RADIUS);

    for (
      let position = 0;
      position < pointsOnRing;
      position += 1
    ) {
      const angularProgress = (position + 1) / (pointsOnRing + 1);
      const angularJitter =
        ((random() - 0.5) * 0.42) / (pointsOnRing + 1);
      const angle =
        halfSectionAngle *
        (0.08 + (angularProgress + angularJitter) * 0.84);
      const radialJitter =
        ringIndex === 0 || ringIndex === config.ringCount - 1
          ? 0
          : (random() - 0.5) * 0.025;
      const radius = Math.min(
        OUTER_RADIUS,
        Math.max(INNER_RADIUS, baseRadius + radialJitter),
      );

      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    }
  }

  return points;
}

function path(
  id: string,
  primitive: RenderPrimitive,
  points: Point[],
  paletteIndex: number,
  closed = primitive === 'polygon',
): SeedPath {
  return {
    id,
    primitive,
    points: points.map((pointValue) => ({ ...pointValue })),
    closed,
    paletteIndex,
  };
}

function splitPointsIntoRings(
  config: MandalaConfig,
  points: Point[],
): Point[][] {
  const basePointsPerRing = Math.floor(
    config.pointCount / config.ringCount,
  );
  const remainder = config.pointCount % config.ringCount;
  const rings: Point[][] = [];
  let offset = 0;

  for (let ringIndex = 0; ringIndex < config.ringCount; ringIndex += 1) {
    const pointsOnRing =
      basePointsPerRing + (ringIndex < remainder ? 1 : 0);
    rings.push(points.slice(offset, offset + pointsOnRing));
    offset += pointsOnRing;
  }

  return rings;
}

function createStrands(config: MandalaConfig, points: Point[]): Point[][] {
  const rings = splitPointsIntoRings(config, points);
  const strandCount = Math.max(
    1,
    ...rings.map((ringPoints) => ringPoints.length),
  );

  return Array.from({ length: strandCount }, (_, strandIndex) =>
    rings.flatMap((ringPoints) => {
      if (ringPoints.length === 0) return [];
      const pointIndex = Math.min(strandIndex, ringPoints.length - 1);
      return [ringPoints[pointIndex]!];
    }),
  ).filter((strand) => strand.length >= 2);
}

function createMixedPaths(
  config: MandalaConfig,
  points: Point[],
  random: RandomSource,
): SeedPath[] {
  const strands = createStrands(config, points);
  const lineStrand = strands[0] ?? points;
  const curveStrand = strands[1] ?? lineStrand;
  const polygonStrand = strands[2] ?? strands.at(-1) ?? curveStrand;
  const petalPoints = [
    ...lineStrand,
    ...[...polygonStrand].reverse(),
  ];
  const ringAccents = splitPointsIntoRings(config, points)
    .map((ringPoints, ringIndex) => ({ ringPoints, ringIndex }))
    .filter(
      ({ ringPoints, ringIndex }) =>
        ringPoints.length >= 2 &&
        ringIndex > 0 &&
        (ringIndex % 2 === 0 || ringIndex === config.ringCount - 1),
    )
    .map(({ ringPoints, ringIndex }) =>
      path(
        `source-ring-${ringIndex}`,
        'line',
        [ringPoints[0]!, ringPoints.at(-1)!],
        Math.floor(random() * config.palette.length),
        false,
      ),
    );

  return [
    path(
      'source-line',
      'line',
      lineStrand,
      Math.floor(random() * config.palette.length),
      false,
    ),
    path(
      'source-curve',
      'bezier',
      curveStrand,
      Math.floor(random() * config.palette.length),
      false,
    ),
    path(
      'source-petal',
      'polygon',
      petalPoints,
      Math.floor(random() * config.palette.length),
      true,
    ),
    ...ringAccents,
  ];
}

function createSourcePaths(
  config: MandalaConfig,
  points: Point[],
  random: RandomSource,
): SeedPath[] {
  const primitive = config.primitive;

  if (primitive === 'mixed') {
    return createMixedPaths(config, points, random);
  }

  const strands = createStrands(config, points);
  if (primitive === 'polygon') {
    return strands.map((strand, index) => {
      const neighbour = strands[(index + 1) % strands.length] ?? strand;
      return path(
        `source-${index}`,
        'polygon',
        [...strand, ...[...neighbour].reverse()],
        Math.floor(random() * config.palette.length),
        true,
      );
    });
  }

  return strands.map((strand, index) =>
    path(
      `source-${index}`,
      primitive,
      strand,
      Math.floor(random() * config.palette.length),
      false,
    ),
  );
}

function transformPath(
  sourcePath: SeedPath,
  transform: (point: Point) => Point,
  id: string,
): SeedPath {
  return {
    ...sourcePath,
    id,
    points: sourcePath.points.map(transform),
  };
}

export function generateMandalaGeometry(
  config: MandalaConfig,
): MandalaGeometry {
  assertValidMandalaConfig(config);

  const stableConfig = cloneConfig(config);
  const random = createSeededRandom(stableConfig.seed);
  const halfSectionAngle = Math.PI / stableConfig.sectionCount;
  const seedPoints = createSeedPoints(
    stableConfig,
    halfSectionAngle,
    random,
  );
  const sourcePaths = createSourcePaths(stableConfig, seedPoints, random);
  const mirroredPaths = sourcePaths.map((sourcePath) =>
    transformPath(
      sourcePath,
      (pointValue) => reflectPoint(pointValue),
      `${sourcePath.id}:mirror`,
    ),
  );
  const localPaths = [...sourcePaths, ...mirroredPaths];

  const sections = Array.from(
    { length: stableConfig.sectionCount },
    (_, index) => {
      const rotation = (index * FULL_TURN) / stableConfig.sectionCount;

      return {
        index,
        rotation,
        paths: localPaths.map((localPath) =>
          transformPath(
            localPath,
            (pointValue) => rotatePoint(pointValue, rotation),
            `${localPath.id}:section-${index}`,
          ),
        ),
      };
    },
  );

  return {
    config: stableConfig,
    halfSectionAngle,
    sourcePaths,
    mirroredPaths,
    sections,
  };
}
