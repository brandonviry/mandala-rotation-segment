import type { MandalaConfig } from '../core/types';

export const DEFAULT_CONFIG: MandalaConfig = {
  seed: 'atelier-azalee',
  sectionCount: 12,
  ringCount: 7,
  pointCount: 21,
  primitive: 'mixed',
  strokeWidth: 2.2,
  strokeOpacity: 0.92,
  mode: 'coloring',
  palette: ['#d95d43', '#e6ad54', '#2d7771', '#28445e', '#7b405c'],
  backgroundColor: '#f4ead8',
  fillEnabled: false,
  fillColor: '#d95d43',
  exportResolution: 4096,
};

type Listener = (config: MandalaConfig) => void;

function randomSeed(): string {
  const words = ['azalee', 'orbe', 'safran', 'comete', 'corail', 'iris'];
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  const word = words[(values[0] ?? 0) % words.length] ?? 'orbe';
  return `${word}-${(values[1] ?? 0).toString(36).slice(0, 6)}`;
}

function randomInteger(min: number, max: number): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  const unit = (value[0] ?? 0) / 0xffffffff;
  return Math.floor(unit * (max - min + 1)) + min;
}

export class MandalaStore {
  private config: MandalaConfig;
  private readonly listeners = new Set<Listener>();

  constructor(initial: MandalaConfig = DEFAULT_CONFIG) {
    this.config = structuredClone(initial);
  }

  get(): MandalaConfig {
    return structuredClone(this.config);
  }

  update(patch: Partial<MandalaConfig>): void {
    this.config = { ...this.config, ...patch };
    this.emit();
  }

  capture(config: MandalaConfig): void {
    this.config = structuredClone(config);
  }

  reset(): void {
    this.config = structuredClone(DEFAULT_CONFIG);
    this.emit();
  }

  newSeed(): void {
    this.update({ seed: randomSeed() });
  }

  randomize(): void {
    const primitives: MandalaConfig['primitive'][] = [
      'line',
      'polygon',
      'bezier',
      'mixed',
    ];
    this.update({
      seed: randomSeed(),
      sectionCount: randomInteger(4, 32),
      ringCount: randomInteger(3, 11),
      pointCount: randomInteger(8, 40),
      primitive:
        primitives[randomInteger(0, primitives.length - 1)] ?? 'mixed',
      strokeWidth: randomInteger(10, 38) / 10,
      strokeOpacity: randomInteger(68, 100) / 100,
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.get());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.get();
    for (const listener of this.listeners) listener(snapshot);
  }
}
