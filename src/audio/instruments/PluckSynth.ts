import type { PluckSynthParams } from '@/types/project';

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

let sharedBurstBuffer: AudioBuffer | null = null;

function getBurstBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (sharedBurstBuffer && sharedBurstBuffer.sampleRate === ctx.sampleRate) return sharedBurstBuffer;
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  sharedBurstBuffer = buffer;
  return buffer;
}

/** Pluck Rig: Karplus-Strong plucked-string synthesis. A short filtered noise
 * burst excites a pitched feedback delay loop; a damping lowpass in the loop
 * makes the string lose energy and decay naturally, the way a real plucked
 * string does. This is a well-known, general physical-modeling technique
 * (not tied to any specific product), implemented here from scratch on
 * native Web Audio delay/filter/gain nodes. */
export function triggerPluckNote(
  ctx: BaseAudioContext,
  destination: AudioNode,
  params: PluckSynthParams,
  time: number,
  durationSeconds: number,
  midiNote: number,
  velocity: number,
): void {
  const v = Math.max(0.05, Math.min(1, velocity));
  const freq = midiToHz(midiNote);
  const period = 1 / freq;

  // Excitation: a brief filtered noise burst standing in for the pick/finger strike.
  const burst = ctx.createBufferSource();
  burst.buffer = getBurstBuffer(ctx);
  const burstFilter = ctx.createBiquadFilter();
  burstFilter.type = 'bandpass';
  burstFilter.frequency.value = 400 + params.pickPosition * 6000;
  burstFilter.Q.value = 0.7;
  const burstGain = ctx.createGain();
  burstGain.gain.setValueAtTime(v, time);
  burstGain.gain.linearRampToValueAtTime(0, time + 0.03);
  burst.connect(burstFilter);
  burstFilter.connect(burstGain);

  // The string: a delay line tuned to the note's period, with feedback
  // through a damping lowpass filter.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = Math.max(0.0005, period);
  const dampingFilter = ctx.createBiquadFilter();
  dampingFilter.type = 'lowpass';
  dampingFilter.frequency.value = 800 + params.brightness * 7000;
  const feedbackGain = ctx.createGain();
  const feedbackAmount = Math.min(0.995, 1 - params.damping * 0.3);
  feedbackGain.gain.value = feedbackAmount;

  burstGain.connect(delay);
  delay.connect(dampingFilter);
  dampingFilter.connect(feedbackGain);
  feedbackGain.connect(delay);

  const outputGain = ctx.createGain();
  dampingFilter.connect(outputGain);
  outputGain.connect(destination);

  const stringLife = Math.max(durationSeconds, params.decaySeconds);
  outputGain.gain.setValueAtTime(1, time);
  outputGain.gain.setValueAtTime(1, time + stringLife * 0.6);
  outputGain.gain.linearRampToValueAtTime(0.0001, time + stringLife);

  burst.start(time);
  burst.stop(time + 0.06);

  // Tear down the feedback loop once the note has fully decayed.
  const cleanupDelayMs = (stringLife + 0.1) * 1000;
  setTimeout(() => {
    feedbackGain.disconnect();
    delay.disconnect();
    dampingFilter.disconnect();
    outputGain.disconnect();
  }, cleanupDelayMs);
}
