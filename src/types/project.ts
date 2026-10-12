export type OscillatorShape = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface SynthOscillatorParams {
  shape: OscillatorShape;
  detuneCents: number;
  octave: number;
  level: number; // 0..1
}

export interface SynthParams {
  kind: 'synth';
  oscillators: [SynthOscillatorParams, SynthOscillatorParams];
  filterType: BiquadFilterType;
  filterCutoffHz: number;
  filterResonanceQ: number;
  filterEnvAmount: number; // -1..1, how much the envelope pushes cutoff
  attack: number;
  decay: number;
  sustain: number; // 0..1
  release: number;
  glideSeconds: number;
}

export type DrumGeneratorId =
  | 'kick'
  | 'snare'
  | 'hihat-closed'
  | 'hihat-open'
  | 'clap'
  | 'tom-low'
  | 'tom-high'
  | 'rim'
  | 'crash'
  | 'perc-shaker';

export interface SamplerParams {
  kind: 'sampler';
  source: { type: 'generator'; generatorId: DrumGeneratorId } | { type: 'sample'; sampleId: string; rootNote: number };
  gain: number;
  pan: number;
  pitchSemitones: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  loop: boolean;
}

export type InstrumentParams = SynthParams | SamplerParams;

export interface Channel {
  id: string;
  name: string;
  color: string;
  instrument: InstrumentParams;
  volume: number; // 0..1.25
  pan: number; // -1..1
  muted: boolean;
  soloed: boolean;
  mixerTrackId: string;
  isMelodic: boolean; // true => edited via piano roll, false => step on/off only
}

export interface StepCell {
  on: boolean;
  velocity: number; // 0..1
}

export interface PianoRollNote {
  id: string;
  pitch: number; // MIDI note number
  startStep: number; // in steps (16th notes) from pattern start
  lengthSteps: number;
  velocity: number; // 0..1
}

export interface Pattern {
  id: string;
  name: string;
  lengthSteps: number; // e.g. 16, 32, 64
  stepsByChannel: Record<string, StepCell[]>;
  notesByChannel: Record<string, PianoRollNote[]>;
}

export interface PlaylistTrack {
  id: string;
  name: string;
  muted: boolean;
}

export interface PlaylistBlock {
  id: string;
  trackId: string;
  patternId: string;
  startBar: number;
  lengthBars: number;
}

export type InsertEffectType = 'eq3' | 'delay' | 'reverb' | 'limiter' | 'distortion';

export interface Eq3Params {
  type: 'eq3';
  lowGainDb: number;
  midGainDb: number;
  highGainDb: number;
}

export interface DelayParams {
  type: 'delay';
  timeSeconds: number;
  feedback: number; // 0..0.95
  mix: number; // 0..1
}

export interface ReverbParams {
  type: 'reverb';
  decaySeconds: number;
  mix: number; // 0..1
}

export interface LimiterParams {
  type: 'limiter';
  thresholdDb: number;
  releaseSeconds: number;
}

export interface DistortionParams {
  type: 'distortion';
  drive: number; // 0..1
  mix: number;
}

export type InsertEffectParams = Eq3Params | DelayParams | ReverbParams | LimiterParams | DistortionParams;

export interface InsertEffect {
  id: string;
  enabled: boolean;
  params: InsertEffectParams;
}

export interface MixerTrack {
  id: string;
  name: string;
  volume: number; // 0..1.25
  pan: number; // -1..1
  muted: boolean;
  soloed: boolean;
  inserts: InsertEffect[];
}

export interface TransportState {
  bpm: number;
  swingPercent: number; // 0..1 of a step duration
  isPlaying: boolean;
  currentPatternId: string | null;
  playMode: 'pattern' | 'song';
  currentStep: number;
  currentBar: number;
  masterVolume: number;
}

export interface ProjectState {
  projectName: string;
  channels: Channel[];
  patterns: Pattern[];
  playlistTracks: PlaylistTrack[];
  playlistBlocks: PlaylistBlock[];
  mixerTracks: MixerTrack[]; // index 0 is always Master
  transport: TransportState;
  samples: Record<string, { name: string; dataUrl: string }>;
}
