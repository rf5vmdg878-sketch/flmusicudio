import type { InstrumentParams } from '@/types/project';
import { triggerDrumSound } from './DrumSynth';
import { triggerSynthNote } from './Synth';
import { triggerSampleBuffer } from './SamplePlayer';

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

  if (instrument.kind === 'synth') {
    triggerSynthNote(ctx, destination, instrument, time, durationSeconds, midiNote, velocity);
    return;
  }

  // Sampler
  if (instrument.source.type === 'generator') {
    const pitchFromNote = midiNote === DEFAULT_MIDI_FOR_DRUMS ? 0 : midiNote - DEFAULT_MIDI_FOR_DRUMS;
    triggerDrumSound(
      ctx,
      destination,
      instrument.source.generatorId,
      time,
      velocity * instrument.gain,
      instrument.pitchSemitones + pitchFromNote,
    );
    return;
  }

  const buffer = tctx.getSampleBuffer(instrument.source.sampleId);
  if (!buffer) return;
  const semitoneOffset = instrument.pitchSemitones + (midiNote - instrument.source.rootNote);
  const playbackRate = Math.pow(2, semitoneOffset / 12);
  triggerSampleBuffer(ctx, destination, buffer, time, durationSeconds, playbackRate, velocity * instrument.gain, instrument.loop, {
    attack: instrument.attack,
    decay: instrument.decay,
    sustain: instrument.sustain,
    release: instrument.release,
  });
}
