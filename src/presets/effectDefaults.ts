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
    case 'parametric_eq':
      return {
        type: 'parametric_eq',
        bands: [
          { freqHz: 120, gainDb: 0, q: 0.7, filterType: 'lowshelf' },
          { freqHz: 800, gainDb: 0, q: 1, filterType: 'peaking' },
          { freqHz: 2500, gainDb: 0, q: 1, filterType: 'peaking' },
          { freqHz: 8000, gainDb: 0, q: 0.7, filterType: 'highshelf' },
        ],
      };
    case 'chorus':
      return { type: 'chorus', rateHz: 1.2, depthMs: 5, mix: 0.4 };
    case 'phaser':
      return { type: 'phaser', rateHz: 0.5, depth: 0.6, feedback: 0.3, stages: 6, mix: 0.5 };
    case 'bitcrusher':
      return { type: 'bitcrusher', bitDepth: 8, mix: 1 };
    case 'stereo_widener':
      return { type: 'stereo_widener', width: 1.4 };
    case 'compressor':
      return { type: 'compressor', thresholdDb: -18, ratio: 4, attackSeconds: 0.01, releaseSeconds: 0.2, makeupGainDb: 3 };
    case 'flanger':
      return { type: 'flanger', rateHz: 0.25, depthMs: 2, feedback: 0.4, mix: 0.5 };
    case 'tremolo':
      return { type: 'tremolo', rateHz: 5, depth: 0.5 };
    case 'autopan':
      return { type: 'autopan', rateHz: 1, depth: 0.7 };
    case 'gate':
      return { type: 'gate', thresholdDb: -40 };
    case 'multiband_compressor':
      return {
        type: 'multiband_compressor',
        lowCrossoverHz: 200,
        highCrossoverHz: 2500,
        lowThresholdDb: -20,
        lowRatio: 3,
        midThresholdDb: -18,
        midRatio: 3,
        highThresholdDb: -16,
        highRatio: 2.5,
        makeupGainDb: 2,
      };
    case 'saturator':
      return { type: 'saturator', drive: 0.3, warmth: 0.4, mix: 0.6 };
    case 'pingpong_delay':
      return { type: 'pingpong_delay', timeSeconds: 0.3, feedback: 0.4, mix: 0.35 };
    case 'ringmod':
      return { type: 'ringmod', frequencyHz: 220, mix: 0.5 };
    case 'exciter':
      return { type: 'exciter', frequencyHz: 3000, amount: 0.4, mix: 0.3 };
    case 'vinyl_warmth':
      return { type: 'vinyl_warmth', warmth: 0.5, grit: 0.25, wobble: 0.3, noiseLevel: 0.25, mix: 0.6 };
    case 'stereo_delay':
      return { type: 'stereo_delay', leftTimeSeconds: 0.3, rightTimeSeconds: 0.45, feedback: 0.3, mix: 0.3 };
    case 'resonator':
      return { type: 'resonator', frequencyHz: 220, resonance: 0.85, mix: 0.3 };
    case 'de_esser':
      return { type: 'de_esser', frequencyHz: 6000, thresholdDb: -30, ratio: 4 };
    case 'transient_shaper':
      return { type: 'transient_shaper', attackSeconds: 0.003, releaseSeconds: 0.15, amount: 0.4 };
    case 'wah_sweep':
      return { type: 'wah_sweep', rateHz: 2, depth: 0.6, baseFreqHz: 800, resonance: 6 };
  }
}

export const EFFECT_TYPES: { type: InsertEffectType; label: string }[] = [
  { type: 'eq3', label: 'EQ (3-band)' },
  { type: 'parametric_eq', label: 'Parametric EQ' },
  { type: 'delay', label: 'Delay' },
  { type: 'pingpong_delay', label: 'Ping-Pong Delay' },
  { type: 'stereo_delay', label: 'Stereo Delay' },
  { type: 'reverb', label: 'Reverb' },
  { type: 'chorus', label: 'Chorus Lab' },
  { type: 'flanger', label: 'Flanger' },
  { type: 'phaser', label: 'Phase Drift' },
  { type: 'tremolo', label: 'Tremolo' },
  { type: 'autopan', label: 'Auto-Pan' },
  { type: 'ringmod', label: 'Ring Modulator' },
  { type: 'resonator', label: 'Resonator' },
  { type: 'distortion', label: 'Distortion' },
  { type: 'saturator', label: 'Saturator' },
  { type: 'exciter', label: 'Exciter' },
  { type: 'vinyl_warmth', label: 'Vinyl Warmth' },
  { type: 'bitcrusher', label: 'Crush Box' },
  { type: 'stereo_widener', label: 'Stereo Field' },
  { type: 'compressor', label: 'Dyna Press' },
  { type: 'multiband_compressor', label: 'Multiband Dyna Press' },
  { type: 'gate', label: 'Gate' },
  { type: 'de_esser', label: 'De-esser' },
  { type: 'transient_shaper', label: 'Transient Shaper' },
  { type: 'wah_sweep', label: 'Wah Sweep' },
  { type: 'limiter', label: 'Limiter' },
];
