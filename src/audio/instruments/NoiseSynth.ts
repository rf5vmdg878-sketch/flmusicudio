import type { NoiseColor, NoiseSynthParams } from '@/types/project';

const BUFFER_SECONDS = 2;

function generateNoiseBuffer(ctx: BaseAudioContext, color: NoiseColor): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * BUFFER_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (color === 'white') {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  if (color === 'pink') {
    // Paul Kellet's refined pink-noise filter.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      data[i] = pink * 0.11;
    }
    return buffer;
  }

  // Brown/red noise: integrated (random-walk) white noise, leak-normalized.
  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }
  return buffer;
}

const noiseBufferCache = new WeakMap<BaseAudioContext, Map<NoiseColor, AudioBuffer>>();

function getNoiseBuffer(ctx: BaseAudioContext, color: NoiseColor): AudioBuffer {
  let forContext = noiseBufferCache.get(ctx);
  if (!forContext) {
    forContext = new Map();
    noiseBufferCache.set(ctx, forContext);
  }
  const cached = forContext.get(color);
  if (cached) return cached;
  const buffer = generateNoiseBuffer(ctx, color);
  forContext.set(color, buffer);
  return buffer;
}

/** Noise Forge: filtered/enveloped noise for hats, risers, sweeps and texture FX. */
export function triggerNoiseNote(
  ctx: BaseAudioContext,
  destination: AudioNode,
  params: NoiseSynthParams,
  time: number,
  durationSeconds: number,
  velocity: number,
): void {
  const v = Math.max(0.05, Math.min(1, velocity));
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx, params.color);
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = params.filterType;
  filter.frequency.value = params.filterCutoffHz;
  filter.Q.value = params.filterResonanceQ;

  const gain = ctx.createGain();
  const { attack, decay, sustain, release } = params;
  const releaseStart = time + Math.max(durationSeconds, attack + decay + 0.01);
  const sustainLevel = v * sustain;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(v, time + attack);
  gain.gain.linearRampToValueAtTime(sustainLevel, time + attack + decay);
  gain.gain.setValueAtTime(sustainLevel, releaseStart);
  gain.gain.linearRampToValueAtTime(0.0001, releaseStart + release);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  const randomStartOffset = Math.random() * (BUFFER_SECONDS - 0.1);
  src.start(time, randomStartOffset);
  src.stop(releaseStart + release + 0.05);
}
