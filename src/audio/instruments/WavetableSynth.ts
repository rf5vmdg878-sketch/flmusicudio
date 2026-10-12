import type { WavetableShape, WavetableSynthParams } from '@/types/project';

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Each table is a pair of original harmonic-amplitude recipes (Fourier
 * coefficients for a PeriodicWave). `tablePosition` crossfades between the
 * two, giving the classic wavetable-synth "scan" feel without needing an
 * actual sample-based table. All recipes are hand-authored here, not derived
 * from any existing product's tables. */
function harmonicRecipes(shape: WavetableShape): [number[], number[]] {
  switch (shape) {
    case 'organic':
      // Soft, rounded rolloff -> brighter but still smooth rolloff.
      return [
        [0, 1, 0.35, 0.18, 0.09, 0.05, 0.02],
        [0, 1, 0.55, 0.4, 0.28, 0.2, 0.14, 0.1, 0.06],
      ];
    case 'glassy':
      // Emphasize odd harmonics with a bell-like high partial.
      return [
        [0, 1, 0, 0.5, 0, 0.18, 0, 0.09, 0, 0.05],
        [0, 1, 0, 0.3, 0, 0.5, 0, 0.22, 0, 0.3, 0, 0.12],
      ];
    case 'buzzy':
      // Dense upper harmonics, saw-adjacent but hand-tuned, not a bare 1/n saw.
      return [
        [0, 1, 0.8, 0.65, 0.5, 0.4, 0.32, 0.25, 0.2, 0.15, 0.1],
        [0, 1, 0.9, 0.85, 0.75, 0.7, 0.6, 0.55, 0.45, 0.4, 0.3, 0.25],
      ];
    case 'hollow':
      // Odd harmonics only, square-family, with a custom weighting curve.
      return [
        [0, 1, 0, 0.6, 0, 0.3, 0, 0.12],
        [0, 1, 0, 0.75, 0, 0.5, 0, 0.3, 0, 0.15],
      ];
  }
}

// A PeriodicWave belongs to the AudioContext that created it, and WAV export
// renders through a fresh OfflineAudioContext each time, so the cache is
// keyed per-context (outer WeakMap) and then by table shape (inner Map).
const waveCacheByContext = new WeakMap<BaseAudioContext, Map<WavetableShape, [PeriodicWave, PeriodicWave]>>();

function getWaves(ctx: BaseAudioContext, shape: WavetableShape): [PeriodicWave, PeriodicWave] {
  let forContext = waveCacheByContext.get(ctx);
  if (!forContext) {
    forContext = new Map();
    waveCacheByContext.set(ctx, forContext);
  }
  const cached = forContext.get(shape);
  if (cached) return cached;

  const [recipeA, recipeB] = harmonicRecipes(shape);
  const makeWave = (real: number[]): PeriodicWave => {
    const imag = new Array(real.length).fill(0);
    return ctx.createPeriodicWave(new Float32Array(real), new Float32Array(imag), { disableNormalization: false });
  };
  const waves: [PeriodicWave, PeriodicWave] = [makeWave(recipeA), makeWave(recipeB)];
  forContext.set(shape, waves);
  return waves;
}

/** Wave Loom: a unison-stacked wavetable voice with a resonant filter envelope. */
export function triggerWavetableNote(
  ctx: BaseAudioContext,
  destination: AudioNode,
  params: WavetableSynthParams,
  time: number,
  durationSeconds: number,
  midiNote: number,
  velocity: number,
): void {
  const v = Math.max(0.05, Math.min(1, velocity));
  const baseFreq = midiToHz(midiNote);
  const [waveA, waveB] = getWaves(ctx, params.tableId);

  const voiceGain = ctx.createGain();
  voiceGain.connect(destination);

  const filter = ctx.createBiquadFilter();
  filter.type = params.filterType;
  filter.Q.value = params.filterResonanceQ;
  filter.connect(voiceGain);

  const { attack, decay, sustain, release } = params;
  const releaseStart = time + Math.max(durationSeconds, attack + decay + 0.01);
  const sustainLevel = v * sustain;
  voiceGain.gain.setValueAtTime(0, time);
  voiceGain.gain.linearRampToValueAtTime(v, time + attack);
  voiceGain.gain.linearRampToValueAtTime(sustainLevel, time + attack + decay);
  voiceGain.gain.setValueAtTime(sustainLevel, releaseStart);
  voiceGain.gain.linearRampToValueAtTime(0.0001, releaseStart + release);

  filter.frequency.setValueAtTime(params.filterCutoffHz, time);
  filter.frequency.linearRampToValueAtTime(Math.max(40, params.filterCutoffHz * 1.6), time + attack);
  filter.frequency.linearRampToValueAtTime(params.filterCutoffHz, time + attack + decay + 0.05);

  const voiceCount = Math.max(1, Math.min(5, Math.round(params.unisonVoices)));
  const stopAt = releaseStart + release + 0.05;

  for (let i = 0; i < voiceCount; i++) {
    const spread = voiceCount === 1 ? 0 : (i / (voiceCount - 1)) * 2 - 1; // -1..1
    const detune = spread * params.unisonDetuneCents;
    const perVoiceGain = ctx.createGain();
    perVoiceGain.gain.value = 1 / Math.sqrt(voiceCount);
    perVoiceGain.connect(filter);

    const oscA = ctx.createOscillator();
    oscA.setPeriodicWave(waveA);
    oscA.frequency.setValueAtTime(baseFreq, time);
    oscA.detune.value = detune;
    const gainA = ctx.createGain();
    gainA.gain.value = 1 - params.tablePosition;
    oscA.connect(gainA);
    gainA.connect(perVoiceGain);

    const oscB = ctx.createOscillator();
    oscB.setPeriodicWave(waveB);
    oscB.frequency.setValueAtTime(baseFreq, time);
    oscB.detune.value = detune;
    const gainB = ctx.createGain();
    gainB.gain.value = params.tablePosition;
    oscB.connect(gainB);
    gainB.connect(perVoiceGain);

    oscA.start(time);
    oscB.start(time);
    oscA.stop(stopAt);
    oscB.stop(stopAt);
  }
}
