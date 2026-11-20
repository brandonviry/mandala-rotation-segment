import type { MandalaSeed } from './types';

export type RandomSource = () => number;

/**
 * Turns a string into a deterministic stream of unsigned 32-bit seeds.
 */
export function xmur3(value: string): () => number {
  let hash = 1779033703 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

/**
 * Produces deterministic values in the half-open interval [0, 1).
 */
export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Type-prefixing prevents the numeric seed 42 from silently aliasing "42".
 */
export function createSeededRandom(seed: MandalaSeed): RandomSource {
  const serializedSeed = `${typeof seed}:${String(seed)}`;
  return mulberry32(xmur3(serializedSeed)());
}
