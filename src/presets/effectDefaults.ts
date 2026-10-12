import type { InsertEffectParams, InsertEffectType } from '@/types/project';

export function defaultEffectParams(type: InsertEffectType): InsertEffectParams {
  switch (type) {
    case 'eq3':
      return { type: 'eq3', lowGainDb: 0, midGainDb: 0, highGainDb: 0 };
    case 'delay':
      return { type: 'delay', timeSeconds: 0.25, feedback: 0.35, mix: 0.3 };
    case 'reverb':
      return { type: 'reverb', decaySeconds: 1.5, mix: 0.25 };
    case 'limiter':
      return { type: 'limiter', thresholdDb: -6, releaseSeconds: 0.2 };
    case 'distortion':
      return { type: 'distortion', drive: 0.3, mix: 0.5 };
  }
}

export const EFFECT_TYPES: { type: InsertEffectType; label: string }[] = [
  { type: 'eq3', label: 'EQ (3-band)' },
  { type: 'delay', label: 'Delay' },
  { type: 'reverb', label: 'Reverb' },
  { type: 'distortion', label: 'Distortion' },
  { type: 'limiter', label: 'Limiter' },
];
