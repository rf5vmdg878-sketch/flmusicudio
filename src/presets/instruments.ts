import type {
  AdditiveSynthParams,
  DrumGeneratorId,
  FmSynthParams,
  NoiseColor,
  NoiseSynthParams,
  SamplerParams,
  SynthParams,
  WavetableShape,
  WavetableSynthParams,
} from '@/types/project';

export interface DrumKitPiece {
  generatorId: DrumGeneratorId;
  name: string;
  color: string;
}

/** The default synthesized drum kit. Every sound here is generated procedurally
 * by the audio engine (see audio/instruments/DrumSynth.ts) rather than sampled,
 * so the whole kit ships royalty-free and can be re-pitched/shaped freely. */
export const DEFAULT_DRUM_KIT: DrumKitPiece[] = [
  { generatorId: 'kick', name: 'Kick', color: '#ff6b6b' },
  { generatorId: 'snare', name: 'Snare', color: '#ffa94d' },
  { generatorId: 'hihat-closed', name: 'Hi-Hat Closed', color: '#ffd43b' },
  { generatorId: 'hihat-open', name: 'Hi-Hat Open', color: '#fab005' },
  { generatorId: 'clap', name: 'Clap', color: '#94d82d' },
  { generatorId: 'tom-low', name: 'Tom Low', color: '#4dabf7' },
  { generatorId: 'tom-high', name: 'Tom High', color: '#74c0fc' },
  { generatorId: 'rim', name: 'Rimshot', color: '#63e6be' },
  { generatorId: 'crash', name: 'Crash', color: '#da77f2' },
  { generatorId: 'perc-shaker', name: 'Shaker', color: '#e599f7' },
];

export function makeSamplerForGenerator(generatorId: DrumGeneratorId): SamplerParams {
  return {
    kind: 'sampler',
    source: { type: 'generator', generatorId },
    gain: 1,
    pan: 0,
    pitchSemitones: 0,
    attack: 0.001,
    decay: 0.3,
    sustain: 0,
    release: 0.05,
    loop: false,
  };
}

export interface SynthPreset {
  name: string;
  color: string;
  params: SynthParams;
}

/** A starter rack of subtractive-synth instrument packages. Each is just a
 * parameter set for the shared synth engine, so users can tweak or save new
 * presets without any new code. */
export const SYNTH_PRESETS: SynthPreset[] = [
  {
    name: 'Sub Bass',
    color: '#845ef7',
    params: {
      kind: 'synth',
      oscillators: [
        { shape: 'sine', detuneCents: 0, octave: -1, level: 1 },
        { shape: 'square', detuneCents: 5, octave: -1, level: 0.3 },
      ],
      filterType: 'lowpass',
      filterCutoffHz: 800,
      filterResonanceQ: 1,
      filterEnvAmount: 0.2,
      attack: 0.005,
      decay: 0.2,
      sustain: 0.7,
      release: 0.15,
      glideSeconds: 0.02,
    },
  },
  {
    name: 'Saw Lead',
    color: '#ff8787',
    params: {
      kind: 'synth',
      oscillators: [
        { shape: 'sawtooth', detuneCents: -6, octave: 0, level: 0.8 },
        { shape: 'sawtooth', detuneCents: 6, octave: 0, level: 0.8 },
      ],
      filterType: 'lowpass',
      filterCutoffHz: 3500,
      filterResonanceQ: 2,
      filterEnvAmount: 0.4,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.6,
      release: 0.2,
      glideSeconds: 0,
    },
  },
  {
    name: 'Warm Pad',
    color: '#66d9e8',
    params: {
      kind: 'synth',
      oscillators: [
        { shape: 'triangle', detuneCents: -4, octave: 0, level: 0.7 },
        { shape: 'sawtooth', detuneCents: 4, octave: -1, level: 0.4 },
      ],
      filterType: 'lowpass',
      filterCutoffHz: 1800,
      filterResonanceQ: 0.5,
      filterEnvAmount: 0.1,
      attack: 0.6,
      decay: 0.8,
      sustain: 0.8,
      release: 1.2,
      glideSeconds: 0,
    },
  },
  {
    name: 'Pluck',
    color: '#ffe066',
    params: {
      kind: 'synth',
      oscillators: [
        { shape: 'square', detuneCents: 0, octave: 0, level: 0.9 },
        { shape: 'sine', detuneCents: 0, octave: 1, level: 0.2 },
      ],
      filterType: 'lowpass',
      filterCutoffHz: 2200,
      filterResonanceQ: 3,
      filterEnvAmount: 0.6,
      attack: 0.002,
      decay: 0.18,
      sustain: 0,
      release: 0.1,
      glideSeconds: 0,
    },
  },
  {
    name: 'Electric Keys',
    color: '#69db7c',
    params: {
      kind: 'synth',
      oscillators: [
        { shape: 'triangle', detuneCents: 0, octave: 0, level: 0.8 },
        { shape: 'sine', detuneCents: 0, octave: 2, level: 0.15 },
      ],
      filterType: 'lowpass',
      filterCutoffHz: 4000,
      filterResonanceQ: 0.7,
      filterEnvAmount: 0.05,
      attack: 0.004,
      decay: 1.2,
      sustain: 0.2,
      release: 0.4,
      glideSeconds: 0,
    },
  },
];

export interface FmSynthPreset {
  name: string;
  color: string;
  params: FmSynthParams;
}

/** FM Core presets: a 2-operator FM engine. Different ratio/index/envelope
 * combinations give the metallic bells, electric-piano tones, and growly
 * basses characteristic of FM synthesis. */
export const FM_SYNTH_PRESETS: FmSynthPreset[] = [
  {
    name: 'FM Bell',
    color: '#a9e34b',
    params: {
      kind: 'fm',
      modulatorRatio: 3.5,
      modulationIndex: 4,
      modIndexEnvAmount: 0.6,
      attack: 0.002,
      decay: 1.6,
      sustain: 0,
      release: 0.8,
    },
  },
  {
    name: 'FM E-Piano',
    color: '#63e6be',
    params: {
      kind: 'fm',
      modulatorRatio: 2,
      modulationIndex: 1.6,
      modIndexEnvAmount: 0.2,
      attack: 0.003,
      decay: 1.0,
      sustain: 0.15,
      release: 0.5,
    },
  },
  {
    name: 'FM Growl Bass',
    color: '#9775fa',
    params: {
      kind: 'fm',
      modulatorRatio: 1,
      modulationIndex: 2.2,
      modIndexEnvAmount: 0.8,
      attack: 0.005,
      decay: 0.3,
      sustain: 0.6,
      release: 0.2,
    },
  },
];

export interface WavetablePreset {
  name: string;
  color: string;
  params: WavetableSynthParams;
}

const WAVETABLE_SHAPE_DEFAULTS: Record<WavetableShape, { cutoff: number; name: string; color: string }> = {
  organic: { cutoff: 3200, name: 'Loom Organic', color: '#ffa8a8' },
  glassy: { cutoff: 5200, name: 'Loom Glassy', color: '#99e9f2' },
  buzzy: { cutoff: 2600, name: 'Loom Buzzy', color: '#ffd43b' },
  hollow: { cutoff: 3800, name: 'Loom Hollow', color: '#b197fc' },
};

/** Wave Loom presets: one per built-in original wavetable, each with a
 * light 2-voice unison for width. */
export const WAVETABLE_PRESETS: WavetablePreset[] = (Object.keys(WAVETABLE_SHAPE_DEFAULTS) as WavetableShape[]).map((tableId) => {
  const defaults = WAVETABLE_SHAPE_DEFAULTS[tableId];
  return {
    name: defaults.name,
    color: defaults.color,
    params: {
      kind: 'wavetable',
      tableId,
      tablePosition: 0.3,
      filterType: 'lowpass',
      filterCutoffHz: defaults.cutoff,
      filterResonanceQ: 0.8,
      attack: 0.01,
      decay: 0.4,
      sustain: 0.65,
      release: 0.3,
      unisonVoices: 2,
      unisonDetuneCents: 8,
    },
  };
});

/** Creates a Slice Deck instrument from an already-imported sample. */
export function makeSlicerForSample(sampleId: string, sliceCount: number): SamplerParams {
  return {
    kind: 'sampler',
    source: { type: 'slice', sampleId, sliceCount, baseNote: 48 },
    gain: 1,
    pan: 0,
    pitchSemitones: 0,
    attack: 0.001,
    decay: 0.15,
    sustain: 0.3,
    release: 0.05,
    loop: false,
  };
}

export interface NoisePreset {
  name: string;
  color: string;
  params: NoiseSynthParams;
}

const NOISE_COLOR_DEFAULTS: Record<NoiseColor, { name: string; color: string; cutoff: number; filterType: BiquadFilterType }> = {
  white: { name: 'Noise Forge White', color: '#e9ecef', cutoff: 8000, filterType: 'highpass' },
  pink: { name: 'Noise Forge Pink', color: '#ffc9c9', cutoff: 4000, filterType: 'lowpass' },
  brown: { name: 'Noise Forge Brown', color: '#d9a066', cutoff: 1200, filterType: 'lowpass' },
};

/** Noise Forge presets: one per noise color, tuned for riser/texture use. */
export const NOISE_PRESETS: NoisePreset[] = (Object.keys(NOISE_COLOR_DEFAULTS) as NoiseColor[]).map((color) => {
  const defaults = NOISE_COLOR_DEFAULTS[color];
  return {
    name: defaults.name,
    color: defaults.color,
    params: {
      kind: 'noise',
      color,
      filterType: defaults.filterType,
      filterCutoffHz: defaults.cutoff,
      filterResonanceQ: 0.7,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.4,
      release: 0.3,
    },
  };
});

export interface AdditivePreset {
  name: string;
  color: string;
  params: AdditiveSynthParams;
}

/** Harmonic Rig presets: different drawbar-style harmonic recipes. */
export const ADDITIVE_PRESETS: AdditivePreset[] = [
  {
    name: 'Rig Organ',
    color: '#51cf66',
    params: {
      kind: 'additive',
      harmonicLevels: [1, 0.6, 0.8, 0.3, 0.5, 0.2, 0.3, 0.15],
      attack: 0.005,
      decay: 0.1,
      sustain: 0.9,
      release: 0.08,
    },
  },
  {
    name: 'Rig Bell Stack',
    color: '#4dabf7',
    params: {
      kind: 'additive',
      harmonicLevels: [1, 0, 0.5, 0, 0.3, 0, 0.6, 0, 0, 0, 0.25],
      attack: 0.002,
      decay: 1.2,
      sustain: 0.1,
      release: 0.6,
    },
  },
  {
    name: 'Rig Mellow Fifths',
    color: '#da77f2',
    params: {
      kind: 'additive',
      harmonicLevels: [1, 0.2, 0.7, 0.1, 0.1],
      attack: 0.3,
      decay: 0.5,
      sustain: 0.8,
      release: 0.9,
    },
  },
];
