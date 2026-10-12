import { v4 as uuid } from 'uuid';
import type {
  Channel,
  MixerTrack,
  Pattern,
  PlaylistTrack,
  ProjectState,
  StepCell,
} from '@/types/project';
import { DEFAULT_DRUM_KIT, SYNTH_PRESETS, makeSamplerForGenerator } from '@/presets/instruments';

export const MASTER_TRACK_ID = 'master';
export const STEPS_PER_PATTERN_DEFAULT = 16;

function emptySteps(count: number): StepCell[] {
  return Array.from({ length: count }, () => ({ on: false, velocity: 0.85 }));
}

export function createDefaultMixerTracks(): MixerTrack[] {
  const master: MixerTrack = {
    id: MASTER_TRACK_ID,
    name: 'Master',
    volume: 1,
    pan: 0,
    muted: false,
    soloed: false,
    inserts: [
      { id: uuid(), enabled: true, params: { type: 'limiter', thresholdDb: -3, releaseSeconds: 0.25 } },
    ],
  };
  const drums: MixerTrack = {
    id: uuid(),
    name: 'Drums',
    volume: 1,
    pan: 0,
    muted: false,
    soloed: false,
    inserts: [],
  };
  const synths: MixerTrack = {
    id: uuid(),
    name: 'Synths',
    volume: 0.9,
    pan: 0,
    muted: false,
    soloed: false,
    inserts: [
      { id: uuid(), enabled: true, params: { type: 'reverb', decaySeconds: 1.4, mix: 0.12 } },
    ],
  };
  return [master, drums, synths];
}

export function createDefaultChannels(mixerTracks: MixerTrack[]): Channel[] {
  const drumsTrackId = mixerTracks[1].id;
  const synthsTrackId = mixerTracks[2].id;

  const drumChannels: Channel[] = DEFAULT_DRUM_KIT.map((piece) => ({
    id: uuid(),
    name: piece.name,
    color: piece.color,
    instrument: makeSamplerForGenerator(piece.generatorId),
    volume: 1,
    pan: 0,
    muted: false,
    soloed: false,
    mixerTrackId: drumsTrackId,
    isMelodic: false,
  }));

  const synthChannels: Channel[] = SYNTH_PRESETS.slice(0, 2).map((preset) => ({
    id: uuid(),
    name: preset.name,
    color: preset.color,
    instrument: preset.params,
    volume: 0.9,
    pan: 0,
    muted: false,
    soloed: false,
    mixerTrackId: synthsTrackId,
    isMelodic: true,
  }));

  return [...drumChannels, ...synthChannels];
}

export function createDefaultPattern(channels: Channel[]): Pattern {
  const stepsByChannel: Pattern['stepsByChannel'] = {};
  const notesByChannel: Pattern['notesByChannel'] = {};
  for (const ch of channels) {
    stepsByChannel[ch.id] = emptySteps(STEPS_PER_PATTERN_DEFAULT);
    notesByChannel[ch.id] = [];
  }
  const kick = channels.find((c) => c.name === 'Kick');
  const hat = channels.find((c) => c.name === 'Hi-Hat Closed');
  if (kick) [0, 4, 8, 12].forEach((i) => (stepsByChannel[kick.id][i] = { on: true, velocity: 1 }));
  if (hat) [0, 2, 4, 6, 8, 10, 12, 14].forEach((i) => (stepsByChannel[hat.id][i] = { on: true, velocity: 0.7 }));

  return {
    id: uuid(),
    name: 'Pattern 1',
    lengthSteps: STEPS_PER_PATTERN_DEFAULT,
    stepsByChannel,
    notesByChannel,
  };
}

export function createDefaultProject(): ProjectState {
  const mixerTracks = createDefaultMixerTracks();
  const channels = createDefaultChannels(mixerTracks);
  const pattern = createDefaultPattern(channels);
  const playlistTrack: PlaylistTrack = { id: uuid(), name: 'Track 1', muted: false };

  return {
    projectName: 'Untitled Project',
    channels,
    patterns: [pattern],
    playlistTracks: [playlistTrack],
    playlistBlocks: [],
    mixerTracks,
    transport: {
      bpm: 120,
      swingPercent: 0,
      isPlaying: false,
      currentPatternId: pattern.id,
      playMode: 'pattern',
      currentStep: 0,
      currentBar: 0,
      masterVolume: 0.9,
    },
    samples: {},
    automationLanes: [],
  };
}
