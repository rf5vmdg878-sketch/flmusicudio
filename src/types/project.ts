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

export type SamplerSource =
  | { type: 'generator'; generatorId: DrumGeneratorId }
  | { type: 'sample'; sampleId: string; rootNote: number }
  /** Slice Deck mode: chops the sample into equal slices. `baseNote` plays
   * slice 0, `baseNote + 1` plays slice 1, and so on. */
  | { type: 'slice'; sampleId: string; sliceCount: number; baseNote: number };

export interface SamplerParams {
  kind: 'sampler';
  source: SamplerSource;
  gain: number;
  pan: number;
  pitchSemitones: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  loop: boolean;
}

/** FM Core: a 2-operator FM synth (one carrier, one modulator). */
export interface FmSynthParams {
  kind: 'fm';
  modulatorRatio: number; // modulator frequency = carrier frequency * this ratio
  modulationIndex: number; // base modulation depth in Hz-equivalent
  modIndexEnvAmount: number; // -1..1, how much the envelope swings modulation index (brightness envelope)
  attack: number;
  decay: number;
  sustain: number; // 0..1
  release: number;
}

export type WavetableShape = 'organic' | 'glassy' | 'buzzy' | 'hollow';

/** Wave Loom: plays back one of a small set of original, procedurally defined
 * harmonic wavetables, with a scan position that crossfades between two
 * harmonic variants of the chosen table for a classic "wavetable morph" feel. */
export interface WavetableSynthParams {
  kind: 'wavetable';
  tableId: WavetableShape;
  tablePosition: number; // 0..1, crossfades between the table's two harmonic variants
  filterType: BiquadFilterType;
  filterCutoffHz: number;
  filterResonanceQ: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  unisonVoices: number; // 1..5 detuned stacked voices
  unisonDetuneCents: number;
}

/** Pluck Rig: a Karplus-Strong physically modeled plucked string — a short
 * filtered noise burst excites a pitched feedback delay loop that decays
 * naturally over time, the way a real plucked string does. */
export interface PluckSynthParams {
  kind: 'pluck';
  damping: number; // 0..1, how quickly the feedback loop loses energy (higher = darker/shorter)
  brightness: number; // 0..1, tone of the initial excitation burst
  decaySeconds: number; // overall string decay time
  pickPosition: number; // 0..1, shapes the excitation burst's initial filtering
}

export type NoiseColor = 'white' | 'pink' | 'brown';

/** Noise Forge: filtered/enveloped noise for hats, risers, textures and FX. */
export interface NoiseSynthParams {
  kind: 'noise';
  color: NoiseColor;
  filterType: BiquadFilterType;
  filterCutoffHz: number;
  filterResonanceQ: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** Harmonic Rig: a drawbar-style additive synth — a fixed set of harmonic
 * oscillators (fundamental + overtones) each with its own level. */
export interface AdditiveSynthParams {
  kind: 'additive';
  harmonicLevels: number[]; // level 0..1 per harmonic, index 0 = fundamental
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export type InstrumentParams =
  | SynthParams
  | SamplerParams
  | FmSynthParams
  | WavetableSynthParams
  | NoiseSynthParams
  | AdditiveSynthParams
  | PluckSynthParams;

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

export interface AutomationPoint {
  id: string;
  bar: number; // song-timeline position, can be fractional
  value: number; // meaning depends on the lane's target (see AutomationTarget)
}

export type AutomationTarget =
  /** value 0..1, a multiplier layered on top of the track's manual fader (1 = no change). */
  | { kind: 'mixerVolume'; mixerTrackId: string }
  /** value -1..1, an offset layered on top of the track's manual pan (0 = no change). */
  | { kind: 'mixerPan'; mixerTrackId: string };

export interface AutomationLane {
  id: string;
  name: string;
  target: AutomationTarget;
  points: AutomationPoint[]; // kept sorted by bar
}

export type InsertEffectType =
  | 'eq3'
  | 'delay'
  | 'reverb'
  | 'limiter'
  | 'distortion'
  | 'parametric_eq'
  | 'chorus'
  | 'phaser'
  | 'bitcrusher'
  | 'stereo_widener'
  | 'compressor'
  | 'flanger'
  | 'tremolo'
  | 'autopan'
  | 'gate'
  | 'multiband_compressor'
  | 'exciter'
  | 'vinyl_warmth'
  | 'stereo_delay'
  | 'resonator'
  | 'saturator'
  | 'pingpong_delay'
  | 'ringmod'
  | 'de_esser'
  | 'transient_shaper'
  | 'wah_sweep'
  | 'formant_filter'
  | 'doubler'
  | 'pump';

export interface Eq3Params {
  type: 'eq3';
  lowGainDb: number;
  midGainDb: number;
  highGainDb: number;
}

export interface EqBand {
  freqHz: number;
  gainDb: number;
  q: number;
  filterType: 'lowshelf' | 'peaking' | 'highshelf';
}

/** Parametric EQ: four fully adjustable bands (frequency, gain, and Q each
 * editable), vs. the fixed-frequency 3-band EQ. */
export interface ParametricEqParams {
  type: 'parametric_eq';
  bands: [EqBand, EqBand, EqBand, EqBand];
}

/** Chorus Lab: short, LFO-modulated delay for thickening/doubling. */
export interface ChorusParams {
  type: 'chorus';
  rateHz: number;
  depthMs: number;
  mix: number;
}

/** Phase Drift: a cascade of LFO-modulated all-pass filters with feedback. */
export interface PhaserParams {
  type: 'phaser';
  rateHz: number;
  depth: number; // 0..1
  feedback: number; // 0..0.9
  stages: number; // number of all-pass stages
  mix: number;
}

/** Crush Box: amplitude bit-depth reduction (lo-fi/digital-crunch effect). */
export interface BitcrusherParams {
  type: 'bitcrusher';
  bitDepth: number; // 1..16
  mix: number;
}

/** Stereo Field: mid/side width control. */
export interface StereoWidenerParams {
  type: 'stereo_widener';
  width: number; // 0 = mono, 1 = unity, 2 = extra wide
}

/** Dyna Press: general-purpose dynamics compressor. */
export interface CompressorParams {
  type: 'compressor';
  thresholdDb: number;
  ratio: number;
  attackSeconds: number;
  releaseSeconds: number;
  makeupGainDb: number;
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

/** Flanger: short feedback-delay comb filter, LFO-swept (distinct from Chorus
 * Lab's longer, feedback-free modulated delay). */
export interface FlangerParams {
  type: 'flanger';
  rateHz: number;
  depthMs: number;
  feedback: number; // 0..0.9
  mix: number;
}

export interface TremoloParams {
  type: 'tremolo';
  rateHz: number;
  depth: number; // 0..1
}

export interface AutoPanParams {
  type: 'autopan';
  rateHz: number;
  depth: number; // 0..1
}

/** A static (envelope-free) noise gate implemented as an amplitude transfer
 * curve: signal below the threshold is zeroed. */
export interface GateParams {
  type: 'gate';
  thresholdDb: number;
}

export interface MultibandCompressorParams {
  type: 'multiband_compressor';
  lowCrossoverHz: number;
  highCrossoverHz: number;
  lowThresholdDb: number;
  lowRatio: number;
  midThresholdDb: number;
  midRatio: number;
  highThresholdDb: number;
  highRatio: number;
  makeupGainDb: number;
}

/** Warm tape/tube-style soft saturation (softer knee than Distortion, plus a
 * high-frequency rolloff that scales with warmth). */
export interface SaturatorParams {
  type: 'saturator';
  drive: number; // 0..1
  warmth: number; // 0..1
  mix: number;
}

export interface PingPongDelayParams {
  type: 'pingpong_delay';
  timeSeconds: number;
  feedback: number; // 0..0.95
  mix: number;
}

export interface RingModParams {
  type: 'ringmod';
  frequencyHz: number;
  mix: number;
}

/** Harmonic exciter: generates new upper harmonics from a high-passed copy of
 * the signal (via saturation) and blends them back in. */
export interface ExciterParams {
  type: 'exciter';
  frequencyHz: number; // high-pass point above which harmonics are generated
  amount: number; // 0..1
  mix: number;
}

/** Vinyl Warmth: a lo-fi combo effect — warmth lowpass, light bit-crush grit,
 * a slow subtle delay-modulation "wow", and a mixed-in noise floor. */
export interface VinylWarmthParams {
  type: 'vinyl_warmth';
  warmth: number; // 0..1, lowpass darkening
  grit: number; // 0..1, bit-depth-style quantization amount
  wobble: number; // 0..1, pitch wobble depth
  noiseLevel: number; // 0..1, mixed-in surface noise
  mix: number;
}

/** Stereo Delay: independent delay time/feedback per channel (vs. Ping-Pong's
 * cross-feeding bounce). */
export interface StereoDelayParams {
  type: 'stereo_delay';
  leftTimeSeconds: number;
  rightTimeSeconds: number;
  feedback: number;
  mix: number;
}

/** Resonator: a short feedback delay tuned to a musical pitch, producing a
 * ringing comb-filter resonance. */
export interface ResonatorParams {
  type: 'resonator';
  frequencyHz: number;
  resonance: number; // 0..0.98, feedback amount
  mix: number;
}

/** De-esser: a frequency-selective compressor — the signal above
 * `frequencyHz` is compressed on its own, then recombined with the rest of
 * the spectrum, taming sibilance without affecting the full-band level. */
export interface DeEsserParams {
  type: 'de_esser';
  frequencyHz: number;
  thresholdDb: number;
  ratio: number;
}

/** Transient Shaper: parallel compression tuned to emphasize or soften
 * attacks relative to the sustained part of the signal — a fast-attack
 * compressed copy is blended against the dry signal. */
export interface TransientShaperParams {
  type: 'transient_shaper';
  attackSeconds: number;
  releaseSeconds: number;
  amount: number; // -1..1, negative softens transients, positive emphasizes them
}

/** Wah Sweep: an LFO-driven resonant bandpass filter (an "auto-wah" style
 * sweep driven by a steady rate, not an envelope follower). */
export interface WahSweepParams {
  type: 'wah_sweep';
  rateHz: number;
  depth: number; // 0..1
  baseFreqHz: number;
  resonance: number;
}

export type FormantVowel = 'a' | 'e' | 'i' | 'o' | 'u';

/** Formant Filter: three parallel bandpass filters tuned to a vowel's
 * formant frequencies (standard phonetics data), giving a vocal/talk-box
 * character to whatever runs through it. */
export interface FormantFilterParams {
  type: 'formant_filter';
  vowel: FormantVowel;
  resonance: number;
  mix: number;
}

/** Doubler: a few short, fixed (unmodulated) delay taps with stereo spread —
 * a thickening effect distinct from Chorus Lab's LFO-modulated movement. */
export interface DoublerParams {
  type: 'doubler';
  spreadMs: number; // tap spacing
  voices: number; // 2..4
  mix: number;
}

/** Pump: a tempo-rate gain "duck" envelope (the popular sidechain-style
 * pumping effect), driven by a looped shaped envelope rather than true
 * sidechain input detection. */
export interface PumpParams {
  type: 'pump';
  rateHz: number;
  depth: number; // 0..1, how deep the duck goes
  holdPercent: number; // 0..1, fraction of the cycle held low before recovering
}

export type InsertEffectParams =
  | Eq3Params
  | DelayParams
  | ReverbParams
  | LimiterParams
  | DistortionParams
  | ParametricEqParams
  | ChorusParams
  | PhaserParams
  | BitcrusherParams
  | StereoWidenerParams
  | CompressorParams
  | FlangerParams
  | TremoloParams
  | AutoPanParams
  | GateParams
  | MultibandCompressorParams
  | SaturatorParams
  | PingPongDelayParams
  | RingModParams
  | ExciterParams
  | VinylWarmthParams
  | StereoDelayParams
  | ResonatorParams
  | DeEsserParams
  | TransientShaperParams
  | WahSweepParams
  | FormantFilterParams
  | DoublerParams
  | PumpParams;

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
  automationLanes: AutomationLane[];
}
