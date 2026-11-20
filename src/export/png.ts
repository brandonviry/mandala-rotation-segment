import { generateMandalaGeometry } from '../core/geometry';
import type { ExportResolution, MandalaConfig } from '../core/types';
import { renderMandala } from '../rendering/canvasRenderer';

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Le navigateur n’a pas pu produire le fichier PNG.'));
      }
    }, 'image/png');
  });
}

function safeFilenamePart(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  return normalized || 'graine';
}

export async function exportMandalaPng(
  config: MandalaConfig,
  resolution: ExportResolution = config.exportResolution,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D indisponible dans ce navigateur.');
  }

  const geometry = generateMandalaGeometry({
    ...config,
    exportResolution: resolution,
  });
  renderMandala(context, geometry);
  return canvasToPngBlob(canvas);
}

export async function downloadMandalaPng(
  config: MandalaConfig,
): Promise<void> {
  const blob = await exportMandalaPng(config, config.exportResolution);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mandala-${safeFilenamePart(String(config.seed))}-${config.exportResolution}px.png`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
