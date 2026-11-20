export type MandalaSeed = string | number;

export type MandalaPrimitive = 'line' | 'polygon' | 'bezier' | 'mixed';

export type RenderPrimitive = Exclude<MandalaPrimitive, 'mixed'>;

export type MandalaMode = 'coloring' | 'color';

export type ExportResolution = 2048 | 4096;

export interface MandalaConfig {
  seed: MandalaSeed;
  sectionCount: number;
  ringCount: number;
  pointCount: number;
  primitive: MandalaPrimitive;
  strokeWidth: number;
  strokeOpacity: number;
  mode: MandalaMode;
  palette: string[];
  backgroundColor: string;
  fillColor: string;
  fillEnabled: boolean;
  exportResolution: ExportResolution;
}

/**
 * A point in normalized mandala coordinates.
 *
 * The mandala is centered on (0, 0), and its outer radius is 1.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * A drawable path. Bezier paths expose their ordered anchors and controls
 * through the same points array so the geometry stays independent from Canvas.
 */
export interface SeedPath {
  id: string;
  primitive: RenderPrimitive;
  points: Point[];
  closed: boolean;
  paletteIndex: number;
}

export interface MandalaSection {
  index: number;
  rotation: number;
  paths: SeedPath[];
}

export interface MandalaGeometry {
  config: MandalaConfig;
  halfSectionAngle: number;
  sourcePaths: SeedPath[];
  mirroredPaths: SeedPath[];
  sections: MandalaSection[];
}

export interface ConfigValidationIssue {
  field: keyof MandalaConfig;
  message: string;
}

export const DEFAULT_MANDALA_CONFIG: MandalaConfig = {
  seed: 'mandala',
  sectionCount: 12,
  ringCount: 6,
  pointCount: 18,
  primitive: 'bezier',
  strokeWidth: 2,
  strokeOpacity: 0.9,
  mode: 'coloring',
  palette: ['#111827', '#7c3aed', '#db2777', '#f59e0b'],
  backgroundColor: '#ffffff',
  fillColor: '#7c3aed',
  fillEnabled: false,
  exportResolution: 4096,
};
