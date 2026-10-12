import type { DrumGeneratorId } from '@/types/project';

let sharedNoiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (sharedNoiseBuffer && sharedNoiseBuffer.sampleRate === ctx.sampleRate) return sharedNoiseBuffer;
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  sharedNoiseBuffer = buffer;
  return buffer;
}

function noiseBurst(
  ctx: BaseAudioContext,
  destination: AudioNode,
  time: number,
  durationSeconds: number,
  gainValue: number,
  filterType: BiquadFilterType,
  filterFreq: number,
  filterQ = 1,
): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainValue * 0.001, 0.0001), time + durationSeconds);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  src.start(time);
  src.stop(time + durationSeconds + 0.02);
}

function tonalThump(
  ctx: BaseAudioContext,
  destination: AudioNode,
  time: number,
  startFreq: number,
  endFreq: number,
  durationSeconds: number,
  gainValue: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), time + durationSeconds * 0.9);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainValue * 0.001, 0.0001), time + durationSeconds);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(time);
  osc.stop(time + durationSeconds + 0.02);
}

/** Procedurally synthesizes a drum-kit hit. Keeping every drum sound code-generated
 * (no bundled audio files) avoids shipping any sampled/copyrighted content. */
export function triggerDrumSound(
  ctx: BaseAudioContext,
  destination: AudioNode,
  generatorId: DrumGeneratorId,
  time: number,
  velocity: number,
  pitchSemitones: number,
): void {
  const pitchRatio = Math.pow(2, pitchSemitones / 12);
  const v = Math.max(0.05, Math.min(1, velocity));

  switch (generatorId) {
    case 'kick':
      tonalThump(ctx, destination, time, 150 * pitchRatio, 45 * pitchRatio, 0.35, v * 1.1);
      noiseBurst(ctx, destination, time, 0.02, v * 0.3, 'lowpass', 300 * pitchRatio);
      break;
    case 'snare':
      tonalThump(ctx, destination, time, 220 * pitchRatio, 120 * pitchRatio, 0.12, v * 0.5);
      noiseBurst(ctx, destination, time, 0.18, v * 0.9, 'highpass', 900 * pitchRatio, 0.7);
      break;
    case 'hihat-closed':
      noiseBurst(ctx, destination, time, 0.05, v * 0.6, 'highpass', 7000 * pitchRatio, 0.5);
      break;
    case 'hihat-open':
      noiseBurst(ctx, destination, time, 0.35, v * 0.6, 'highpass', 6000 * pitchRatio, 0.5);
      break;
    case 'clap': {
      [0, 0.01, 0.02].forEach((delay, i) =>
        noiseBurst(ctx, destination, time + delay, 0.12, v * (0.8 - i * 0.15), 'bandpass', 1500 * pitchRatio, 1.2),
      );
      break;
    }
    case 'tom-low':
      tonalThump(ctx, destination, time, 160 * pitchRatio, 90 * pitchRatio, 0.3, v);
      break;
    case 'tom-high':
      tonalThump(ctx, destination, time, 260 * pitchRatio, 150 * pitchRatio, 0.25, v);
      break;
    case 'rim':
      tonalThump(ctx, destination, time, 900 * pitchRatio, 700 * pitchRatio, 0.04, v * 0.7);
      noiseBurst(ctx, destination, time, 0.03, v * 0.4, 'highpass', 3000 * pitchRatio);
      break;
    case 'crash':
      noiseBurst(ctx, destination, time, 1.6, v * 0.5, 'highpass', 5000 * pitchRatio, 0.3);
      break;
    case 'perc-shaker':
      noiseBurst(ctx, destination, time, 0.1, v * 0.35, 'bandpass', 6000 * pitchRatio, 0.8);
      break;
  }
}
