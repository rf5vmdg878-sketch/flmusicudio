import type { FmSynthParams } from '@/types/project';

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** FM Core: a 2-operator FM voice (one sine carrier, one sine modulator).
 * The modulation index is swept by its own envelope, independent of the
 * amplitude envelope, so the timbre can brighten/dim over the note's life
 * the way classic FM "brightness" envelopes do. */
export function triggerFmNote(
  ctx: BaseAudioContext,
  destination: AudioNode,
  params: FmSynthParams,
  time: number,
  durationSeconds: number,
  midiNote: number,
  velocity: number,
): void {
  const v = Math.max(0.05, Math.min(1, velocity));
  const carrierFreq = midiToHz(midiNote);
  const modulatorFreq = carrierFreq * params.modulatorRatio;

  const { attack, decay, sustain, release } = params;
  const releaseStart = time + Math.max(durationSeconds, attack + decay + 0.01);

  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(carrierFreq, time);

  const modulator = ctx.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(modulatorFreq, time);

  // Modulation index envelope: scales how far the modulator swings the
  // carrier's frequency, in Hz. `modIndexEnvAmount` biases the peak up/down.
  const baseIndexHz = params.modulationIndex * carrierFreq;
  const peakIndexHz = Math.max(0, baseIndexHz * (1 + params.modIndexEnvAmount));
  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(0, time);
  modGain.gain.linearRampToValueAtTime(peakIndexHz, time + attack);
  modGain.gain.linearRampToValueAtTime(baseIndexHz * (0.3 + sustain * 0.7), time + attack + decay);
  modGain.gain.setValueAtTime(baseIndexHz * (0.3 + sustain * 0.7), releaseStart);
  modGain.gain.linearRampToValueAtTime(0, releaseStart + release);

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  const ampGain = ctx.createGain();
  const sustainLevel = v * sustain;
  ampGain.gain.setValueAtTime(0, time);
  ampGain.gain.linearRampToValueAtTime(v, time + attack);
  ampGain.gain.linearRampToValueAtTime(sustainLevel, time + attack + decay);
  ampGain.gain.setValueAtTime(sustainLevel, releaseStart);
  ampGain.gain.linearRampToValueAtTime(0.0001, releaseStart + release);

  carrier.connect(ampGain);
  ampGain.connect(destination);

  const stopAt = releaseStart + release + 0.05;
  carrier.start(time);
  modulator.start(time);
  carrier.stop(stopAt);
  modulator.stop(stopAt);
}
