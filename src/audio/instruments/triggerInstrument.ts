import type { InstrumentParams } from '@/types/project';
import { triggerDrumSound } from './DrumSynth';
import { triggerSynthNote } from './Synth';
import { triggerSampleBuffer } from './SamplePlayer';
import { triggerFmNote } from './FmSynth';
import { triggerWavetableNote } from './WavetableSynth';
import { triggerNoiseNote } from './NoiseSynth';
import { triggerAdditiveNote } from './AdditiveSynth';
import { triggerPluckNote } from './PluckSynth';

export interface TriggerContext {
  ctx: BaseAudioContext;
  destination: AudioNode;
  getSampleBuffer: (sampleId: string) => AudioBuffer | undefined;
}

const DEFAULT_MIDI_FOR_DRUMS = 60;

export function triggerInstrument(
  tctx: TriggerContext,
  instrument: InstrumentParams,
  time: number,
  durationSeconds: number,
  velocity: number,
  midiNote: number = DEFAULT_MIDI_FOR_DRUMS,
): void {
  const { ctx, destination } = tctx;

  switch (instrument.kind) {
    case 'synth':
      triggerSynthNote(ctx, destination, instrument, time, durationSeconds, midiNote, velocity);
      return;
    case 'fm':
      triggerFmNote(ctx, destination, instrument, time, durationSeconds, midiNote, velocity);
      return;
    case 'wavetable':
      triggerWavetableNote(ctx, destination, instrument, time, durationSeconds, midiNote, velocity);
      return;
    case 'sampler':
      triggerSampler(tctx, instrument, time, durationSeconds, velocity, midiNote);
      return;
    case 'noise':
      triggerNoiseNote(ctx, destination, instrument, time, durationSeconds, velocity);
      return;
    case 'additive':
      triggerAdditiveNote(ctx, destination, instrument, time, durationSeconds, midiNote, velocity);
      return;
    case 'pluck':
      triggerPluckNote(ctx, destination, instrument, time, durationSeconds, midiNote, velocity);
      return;
  }
}

function triggerSampler(
  tctx: TriggerContext,
  instrument: Extract<InstrumentParams, { kind: 'sampler' }>,
  time: number,
  durationSeconds: number,
  velocity: number,
  midiNote: number,
): void {
  const { ctx, destination } = tctx;
  const { source } = instrument;

  if (source.type === 'generator') {
    const pitchFromNote = midiNote === DEFAULT_MIDI_FOR_DRUMS ? 0 : midiNote - DEFAULT_MIDI_FOR_DRUMS;
    triggerDrumSound(ctx, destination, source.generatorId, time, velocity * instrument.gain, instrument.pitchSemitones + pitchFromNote);
    return;
  }

  const buffer = tctx.getSampleBuffer(source.sampleId);
  if (!buffer) return;
  const adsr = { attack: instrument.attack, decay: instrument.decay, sustain: instrument.sustain, release: instrument.release };

  if (source.type === 'slice') {
    const sliceIndex = Math.max(0, Math.min(source.sliceCount - 1, midiNote - source.baseNote));
    const sliceDuration = buffer.duration / source.sliceCount;
    const playbackRate = Math.pow(2, instrument.pitchSemitones / 12);
    triggerSampleBuffer(
      ctx,
      destination,
      buffer,
      time,
      durationSeconds,
      playbackRate,
      velocity * instrument.gain,
      false,
      adsr,
      { offsetSeconds: sliceIndex * sliceDuration, durationSeconds: sliceDuration },
    );
    return;
  }

  const semitoneOffset = instrument.pitchSemitones + (midiNote - source.rootNote);
  const playbackRate = Math.pow(2, semitoneOffset / 12);
  triggerSampleBuffer(ctx, destination, buffer, time, durationSeconds, playbackRate, velocity * instrument.gain, instrument.loop, adsr);
}
