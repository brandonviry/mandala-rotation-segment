import type {
  ConfigValidationIssue,
  ExportResolution,
  MandalaConfig,
  MandalaMode,
  MandalaPrimitive,
} from './types';

export const CONFIG_LIMITS = {
  sectionCount: { min: 4, max: 32 },
  ringCount: { min: 2, max: 12 },
  pointCount: { min: 3, max: 48 },
  strokeWidth: { min: 0.25, max: 20 },
  strokeOpacity: { min: 0, max: 1 },
} as const;

const PRIMITIVES = new Set<MandalaPrimitive>([
  'line',
  'polygon',
  'bezier',
  'mixed',
]);
const MODES = new Set<MandalaMode>(['coloring', 'color']);
const EXPORT_RESOLUTIONS = new Set<ExportResolution>([2048, 4096]);

function validateBoundedNumber(
  config: MandalaConfig,
  field: 'strokeWidth' | 'strokeOpacity',
  issues: ConfigValidationIssue[],
): void {
  const value = config[field];
  const limits = CONFIG_LIMITS[field];

  if (
    !Number.isFinite(value) ||
    value < limits.min ||
    value > limits.max
  ) {
    issues.push({
      field,
      message: `${field} must be between ${limits.min} and ${limits.max}.`,
    });
  }
}

function validateBoundedInteger(
  config: MandalaConfig,
  field: 'sectionCount' | 'ringCount' | 'pointCount',
  issues: ConfigValidationIssue[],
): void {
  const value = config[field];
  const limits = CONFIG_LIMITS[field];

  if (
    !Number.isInteger(value) ||
    value < limits.min ||
    value > limits.max
  ) {
    issues.push({
      field,
      message: `${field} must be an integer between ${limits.min} and ${limits.max}.`,
    });
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates all runtime constraints needed by geometry, rendering and export.
 */
export function validateMandalaConfig(
  config: MandalaConfig,
): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  if (
    !(
      (typeof config.seed === 'string' && config.seed.trim().length > 0) ||
      (typeof config.seed === 'number' && Number.isFinite(config.seed))
    )
  ) {
    issues.push({
      field: 'seed',
      message: 'seed must be a non-empty string or a finite number.',
    });
  }

  validateBoundedInteger(config, 'sectionCount', issues);
  validateBoundedInteger(config, 'ringCount', issues);
  validateBoundedInteger(config, 'pointCount', issues);
  validateBoundedNumber(config, 'strokeWidth', issues);
  validateBoundedNumber(config, 'strokeOpacity', issues);

  if (!PRIMITIVES.has(config.primitive)) {
    issues.push({
      field: 'primitive',
      message: 'primitive must be line, polygon, bezier or mixed.',
    });
  }

  if (!MODES.has(config.mode)) {
    issues.push({
      field: 'mode',
      message: 'mode must be coloring or color.',
    });
  }

  if (
    !Array.isArray(config.palette) ||
    config.palette.length === 0 ||
    config.palette.some((color) => !isNonEmptyString(color))
  ) {
    issues.push({
      field: 'palette',
      message: 'palette must contain at least one non-empty color.',
    });
  }

  if (!isNonEmptyString(config.backgroundColor)) {
    issues.push({
      field: 'backgroundColor',
      message: 'backgroundColor must be a non-empty color.',
    });
  }

  if (!isNonEmptyString(config.fillColor)) {
    issues.push({
      field: 'fillColor',
      message: 'fillColor must be a non-empty color.',
    });
  }

  if (typeof config.fillEnabled !== 'boolean') {
    issues.push({
      field: 'fillEnabled',
      message: 'fillEnabled must be a boolean.',
    });
  }

  if (!EXPORT_RESOLUTIONS.has(config.exportResolution)) {
    issues.push({
      field: 'exportResolution',
      message: 'exportResolution must be 2048 or 4096.',
    });
  }

  return issues;
}

export function assertValidMandalaConfig(config: MandalaConfig): void {
  const issues = validateMandalaConfig(config);

  if (issues.length === 0) {
    return;
  }

  const details = issues
    .map(({ field, message }) => `${String(field)}: ${message}`)
    .join(' ');
  throw new RangeError(`Invalid mandala configuration. ${details}`);
}
