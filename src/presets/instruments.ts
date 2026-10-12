import type { DrumGeneratorId, SamplerParams, SynthParams } from '@/types/project';

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
