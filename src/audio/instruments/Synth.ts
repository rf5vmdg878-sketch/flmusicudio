import type { SynthParams } from '@/types/project';

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Schedules one full note (attack through release) of the shared 2-oscillator
 * subtractive synth engine. Every "synth instrument package" (bass/lead/pad/pluck/keys)
 * is just a SynthParams preset played through this one engine. */
export function triggerSynthNote(
  ctx: BaseAudioContext,
  destination: AudioNode,
  params: SynthParams,
  time: number,
  durationSeconds: number,
  midiNote: number,
  velocity: number,
): void {
  const v = Math.max(0.05, Math.min(1, velocity));
  const baseFreq = midiToHz(midiNote);

  const voiceGain = ctx.createGain();
  voiceGain.connect(destination);

  const filter = ctx.createBiquadFilter();
  filter.type = params.filterType;
  filter.Q.value = params.filterResonanceQ;
  filter.connect(voiceGain);

  const { attack, decay, sustain, release } = params;
  const peak = v;
  const sustainLevel = v * sustain;
  const releaseStart = time + Math.max(durationSeconds, attack + decay + 0.01);

  voiceGain.gain.setValueAtTime(0, time);
  voiceGain.gain.linearRampToValueAtTime(peak, time + attack);
  voiceGain.gain.linearRampToValueAtTime(sustainLevel, time + attack + decay);
  voiceGain.gain.setValueAtTime(sustainLevel, releaseStart);
  voiceGain.gain.linearRampToValueAtTime(0.0001, releaseStart + release);

  const baseCutoff = params.filterCutoffHz;
  const envCutoffPeak = Math.max(40, baseCutoff * (1 + params.filterEnvAmount * 3));
  filter.frequency.setValueAtTime(baseCutoff, time);
  filter.frequency.linearRampToValueAtTime(envCutoffPeak, time + attack);
  filter.frequency.linearRampToValueAtTime(baseCutoff, time + attack + decay + 0.05);

  const oscillators: OscillatorNode[] = [];
  for (const oscParams of params.oscillators) {
    if (oscParams.level <= 0) continue;
    const osc = ctx.createOscillator();
    osc.type = oscParams.shape;
    const freq = baseFreq * Math.pow(2, oscParams.octave);
    osc.detune.value = oscParams.detuneCents;
    if (params.glideSeconds > 0) {
      osc.frequency.setValueAtTime(freq * 0.5, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + params.glideSeconds);
    } else {
      osc.frequency.setValueAtTime(freq, time);
    }
    const oscGain = ctx.createGain();
    oscGain.gain.value = oscParams.level;
    osc.connect(oscGain);
    oscGain.connect(filter);
    osc.start(time);
    osc.stop(releaseStart + release + 0.05);
    oscillators.push(osc);
  }
}
