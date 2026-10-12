import type { AdditiveSynthParams } from '@/types/project';

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Harmonic Rig: a drawbar-style additive voice — one sine oscillator per
 * harmonic, each with its own level, summed directly (no filter stage). */
export function triggerAdditiveNote(
  ctx: BaseAudioContext,
  destination: AudioNode,
  params: AdditiveSynthParams,
  time: number,
  durationSeconds: number,
  midiNote: number,
  velocity: number,
): void {
  const v = Math.max(0.05, Math.min(1, velocity));
  const baseFreq = midiToHz(midiNote);

  const voiceGain = ctx.createGain();
  voiceGain.connect(destination);

  const { attack, decay, sustain, release } = params;
  const releaseStart = time + Math.max(durationSeconds, attack + decay + 0.01);
  const sustainLevel = v * sustain;
  voiceGain.gain.setValueAtTime(0, time);
  voiceGain.gain.linearRampToValueAtTime(v, time + attack);
  voiceGain.gain.linearRampToValueAtTime(sustainLevel, time + attack + decay);
  voiceGain.gain.setValueAtTime(sustainLevel, releaseStart);
  voiceGain.gain.linearRampToValueAtTime(0.0001, releaseStart + release);

  const stopAt = releaseStart + release + 0.05;
  const activeHarmonics = params.harmonicLevels.filter((l) => l > 0.001).length || 1;

  params.harmonicLevels.forEach((level, index) => {
    if (level <= 0.001) return;
    const harmonicNumber = index + 1;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * harmonicNumber, time);
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = level / Math.sqrt(activeHarmonics);
    osc.connect(harmonicGain);
    harmonicGain.connect(voiceGain);
    osc.start(time);
    osc.stop(stopAt);
  });
}
