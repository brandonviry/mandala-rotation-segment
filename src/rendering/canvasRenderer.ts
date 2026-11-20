import type {
  MandalaGeometry,
  Point,
  SeedPath,
} from '../core/types';

export interface RenderOptions {
  clear?: boolean;
  pixelRatio?: number;
}

const TAU = Math.PI * 2;

function traceLine(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  const first = points[0];
  if (!first) return;

  context.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point) context.lineTo(point.x, point.y);
  }
}

function traceBezier(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  const first = points[0];
  if (!first) return;

  context.moveTo(first.x, first.y);
  if (points.length < 3) {
    traceLine(context, points);
    return;
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (!current || !next) continue;

    const midpoint = {
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2,
    };
    context.quadraticCurveTo(current.x, current.y, midpoint.x, midpoint.y);
  }

  const penultimate = points.at(-2);
  const last = points.at(-1);
  if (penultimate && last) {
    context.quadraticCurveTo(
      penultimate.x,
      penultimate.y,
      last.x,
      last.y,
    );
  }
}

function tracePath(
  context: CanvasRenderingContext2D,
  path: SeedPath,
): void {
  context.beginPath();
  if (path.primitive === 'bezier') {
    traceBezier(context, path.points);
  } else {
    traceLine(context, path.points);
  }

  if (path.closed || path.primitive === 'polygon') {
    context.closePath();
  }
}

function pathColor(geometry: MandalaGeometry, path: SeedPath): string {
  if (geometry.config.mode === 'coloring') return '#000000';
  const fallback = '#d45b3f';
  const palette = geometry.config.palette;
  return palette[path.paletteIndex % palette.length] ?? fallback;
}

function drawRegistrationMark(
  context: CanvasRenderingContext2D,
  radius: number,
  color: string,
  opacity: number,
): void {
  context.save();
  context.strokeStyle = color;
  context.globalAlpha = opacity;
  context.lineWidth = Math.max(0.0012, radius * 0.0012);
  context.beginPath();
  context.arc(0, 0, radius * 1.035, 0, TAU);
  context.stroke();
  context.restore();
}

export function renderMandala(
  context: CanvasRenderingContext2D,
  geometry: MandalaGeometry,
  options: RenderOptions = {},
): void {
  const { width, height } = context.canvas;
  const scale = Math.min(width, height) * 0.455;
  const centerX = width / 2;
  const centerY = height / 2;
  const config = geometry.config;
  const background =
    config.mode === 'coloring' ? '#ffffff' : config.backgroundColor;

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  if (options.clear !== false) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  context.translate(centerX, centerY);
  context.scale(scale, scale);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  drawRegistrationMark(
    context,
    1,
    config.mode === 'coloring' ? '#000000' : pathColor(geometry, {
      id: 'registration',
      primitive: 'line',
      points: [],
      closed: false,
      paletteIndex: 0,
    }),
    config.mode === 'coloring' ? 1 : 0.22,
  );

  // Stroke width is expressed against a 620 px reference diameter, so the
  // preview and high-resolution export preserve exactly the same proportions.
  const normalizedLineWidth = Math.max(0.45, config.strokeWidth) / 310;

  for (const section of geometry.sections) {
    for (const path of section.paths) {
      const stroke = pathColor(geometry, path);
      tracePath(context, path);
      context.strokeStyle = stroke;
      context.lineWidth = normalizedLineWidth;
      context.globalAlpha = config.strokeOpacity;

      if (
        config.mode === 'color' &&
        config.fillEnabled &&
        (path.closed || path.primitive === 'polygon')
      ) {
        context.save();
        context.fillStyle = config.fillColor;
        context.globalAlpha = Math.min(config.strokeOpacity * 0.32, 0.42);
        context.fill();
        context.restore();
      }

      context.stroke();
    }
  }

  context.restore();
}

export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  displaySize: number,
): number {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const target = Math.max(1, Math.round(displaySize * pixelRatio));
  if (canvas.width !== target || canvas.height !== target) {
    canvas.width = target;
    canvas.height = target;
  }
  canvas.style.width = `${Math.round(displaySize)}px`;
  canvas.style.height = `${Math.round(displaySize)}px`;
  return pixelRatio;
}
