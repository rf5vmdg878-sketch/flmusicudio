import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  AutomationLane,
  AutomationPoint,
  AutomationTarget,
  Channel,
  InsertEffect,
  InsertEffectParams,
  InstrumentParams,
  MixerTrack,
  Pattern,
  PianoRollNote,
  PlaylistBlock,
  PlaylistTrack,
  ProjectState,
} from '@/types/project';
import { createDefaultProject, STEPS_PER_PATTERN_DEFAULT } from '@/state/defaultProject';

export interface ProjectStore extends ProjectState {
  selectedChannelId: string | null;
  selectedPatternId: string | null;

  selectChannel: (channelId: string | null) => void;
  selectPattern: (patternId: string) => void;

  setBpm: (bpm: number) => void;
  setSwing: (percent: number) => void;
  setPlaying: (playing: boolean) => void;
  setPlayMode: (mode: 'pattern' | 'song') => void;
  setTransportPosition: (step: number, bar: number) => void;
  setMasterVolume: (v: number) => void;

  addChannel: (name: string, color: string, instrument: InstrumentParams, mixerTrackId: string, isMelodic: boolean) => string;
  removeChannel: (channelId: string) => void;
  renameChannel: (channelId: string, name: string) => void;
  setChannelInstrument: (channelId: string, instrument: InstrumentParams) => void;
  setChannelVolume: (channelId: string, volume: number) => void;
  setChannelPan: (channelId: string, pan: number) => void;
  toggleChannelMute: (channelId: string) => void;
  toggleChannelSolo: (channelId: string) => void;
  setChannelMixerTrack: (channelId: string, mixerTrackId: string) => void;

  addPattern: (name?: string) => string;
  removePattern: (patternId: string) => void;
  renamePattern: (patternId: string, name: string) => void;
  setPatternLength: (patternId: string, lengthSteps: number) => void;
  toggleStep: (patternId: string, channelId: string, stepIndex: number) => void;
  setStepVelocity: (patternId: string, channelId: string, stepIndex: number, velocity: number) => void;

  addNote: (patternId: string, channelId: string, note: Omit<PianoRollNote, 'id'>) => string;
  updateNote: (patternId: string, channelId: string, noteId: string, patch: Partial<PianoRollNote>) => void;
  removeNote: (patternId: string, channelId: string, noteId: string) => void;

  addPlaylistTrack: (name?: string) => string;
  removePlaylistTrack: (trackId: string) => void;
  toggleMutePlaylistTrack: (trackId: string) => void;
  addPlaylistBlock: (trackId: string, patternId: string, startBar: number, lengthBars: number) => string;
  moveBlock: (blockId: string, trackId: string, startBar: number) => void;
  resizeBlock: (blockId: string, lengthBars: number) => void;
  removeBlock: (blockId: string) => void;

  addMixerTrack: (name?: string) => string;
  removeMixerTrack: (trackId: string) => void;
  setMixerVolume: (trackId: string, volume: number) => void;
  setMixerPan: (trackId: string, pan: number) => void;
  toggleMixerMute: (trackId: string) => void;
  toggleMixerSolo: (trackId: string) => void;
  addInsert: (trackId: string, params: InsertEffectParams) => string;
  updateInsert: (trackId: string, insertId: string, patch: Partial<InsertEffect>) => void;
  removeInsert: (trackId: string, insertId: string) => void;
  reorderInserts: (trackId: string, insertIds: string[]) => void;

  addSample: (id: string, name: string, dataUrl: string) => void;
  removeSample: (id: string) => void;

  addAutomationLane: (target: AutomationTarget, name: string) => string;
  removeAutomationLane: (laneId: string) => void;
  addAutomationPoint: (laneId: string, bar: number, value: number) => string;
  updateAutomationPoint: (laneId: string, pointId: string, patch: Partial<Omit<AutomationPoint, 'id'>>) => void;
  removeAutomationPoint: (laneId: string, pointId: string) => void;

  loadProject: (project: ProjectState) => void;
  resetProject: () => void;
}

function patch<T extends { id: string }>(items: T[], id: string, fn: (item: T) => T): T[] {
  return items.map((item) => (item.id === id ? fn(item) : item));
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...createDefaultProject(),
  selectedChannelId: null,
  selectedPatternId: null,

  selectChannel: (channelId) => set({ selectedChannelId: channelId }),
  selectPattern: (patternId) => set({ selectedPatternId: patternId }),

  setBpm: (bpm) => set((s) => ({ transport: { ...s.transport, bpm: Math.max(20, Math.min(400, bpm)) } })),
  setSwing: (percent) => set((s) => ({ transport: { ...s.transport, swingPercent: Math.max(0, Math.min(1, percent)) } })),
  setPlaying: (playing) => set((s) => ({ transport: { ...s.transport, isPlaying: playing } })),
  setPlayMode: (mode) => set((s) => ({ transport: { ...s.transport, playMode: mode } })),
  setTransportPosition: (step, bar) => set((s) => ({ transport: { ...s.transport, currentStep: step, currentBar: bar } })),
  setMasterVolume: (v) => set((s) => ({ transport: { ...s.transport, masterVolume: Math.max(0, Math.min(1.25, v)) } })),

  addChannel: (name, color, instrument, mixerTrackId, isMelodic) => {
    const id = uuid();
    const channel: Channel = {
      id,
      name,
      color,
      instrument,
      volume: 1,
      pan: 0,
      muted: false,
      soloed: false,
      mixerTrackId,
      isMelodic,
    };
    set((s) => ({
      channels: [...s.channels, channel],
      patterns: s.patterns.map((p) => ({
        ...p,
        stepsByChannel: {
          ...p.stepsByChannel,
          [id]: Array.from({ length: p.lengthSteps }, () => ({ on: false, velocity: 0.85 })),
        },
        notesByChannel: { ...p.notesByChannel, [id]: [] },
      })),
    }));
    return id;
  },

  removeChannel: (channelId) =>
    set((s) => ({
      channels: s.channels.filter((c) => c.id !== channelId),
      patterns: s.patterns.map((p) => {
        const { [channelId]: _s, ...stepsByChannel } = p.stepsByChannel;
        const { [channelId]: _n, ...notesByChannel } = p.notesByChannel;
        return { ...p, stepsByChannel, notesByChannel };
      }),
      selectedChannelId: s.selectedChannelId === channelId ? null : s.selectedChannelId,
    })),

  renameChannel: (channelId, name) => set((s) => ({ channels: patch(s.channels, channelId, (c) => ({ ...c, name })) })),
  setChannelInstrument: (channelId, instrument) =>
    set((s) => ({ channels: patch(s.channels, channelId, (c) => ({ ...c, instrument })) })),
  setChannelVolume: (channelId, volume) =>
    set((s) => ({ channels: patch(s.channels, channelId, (c) => ({ ...c, volume })) })),
  setChannelPan: (channelId, pan) => set((s) => ({ channels: patch(s.channels, channelId, (c) => ({ ...c, pan })) })),
  toggleChannelMute: (channelId) =>
    set((s) => ({ channels: patch(s.channels, channelId, (c) => ({ ...c, muted: !c.muted })) })),
  toggleChannelSolo: (channelId) =>
    set((s) => ({ channels: patch(s.channels, channelId, (c) => ({ ...c, soloed: !c.soloed })) })),
  setChannelMixerTrack: (channelId, mixerTrackId) =>
    set((s) => ({ channels: patch(s.channels, channelId, (c) => ({ ...c, mixerTrackId })) })),

  addPattern: (name) => {
    const id = uuid();
    const { channels } = get();
    const stepsByChannel: Pattern['stepsByChannel'] = {};
    const notesByChannel: Pattern['notesByChannel'] = {};
    for (const ch of channels) {
      stepsByChannel[ch.id] = Array.from({ length: STEPS_PER_PATTERN_DEFAULT }, () => ({ on: false, velocity: 0.85 }));
      notesByChannel[ch.id] = [];
    }
    const pattern: Pattern = {
      id,
      name: name ?? `Pattern ${get().patterns.length + 1}`,
      lengthSteps: STEPS_PER_PATTERN_DEFAULT,
      stepsByChannel,
      notesByChannel,
    };
    set((s) => ({ patterns: [...s.patterns, pattern] }));
    return id;
  },

  removePattern: (patternId) =>
    set((s) => ({
      patterns: s.patterns.filter((p) => p.id !== patternId),
      playlistBlocks: s.playlistBlocks.filter((b) => b.patternId !== patternId),
    })),

  renamePattern: (patternId, name) => set((s) => ({ patterns: patch(s.patterns, patternId, (p) => ({ ...p, name })) })),

  setPatternLength: (patternId, lengthSteps) =>
    set((s) => ({
      patterns: patch(s.patterns, patternId, (p) => {
        const resize = (cells: Pattern['stepsByChannel'][string]) => {
          const next = cells.slice(0, lengthSteps);
          while (next.length < lengthSteps) next.push({ on: false, velocity: 0.85 });
          return next;
        };
        const stepsByChannel: Pattern['stepsByChannel'] = {};
        for (const [chId, cells] of Object.entries(p.stepsByChannel)) stepsByChannel[chId] = resize(cells);
        return { ...p, lengthSteps, stepsByChannel };
      }),
    })),

  toggleStep: (patternId, channelId, stepIndex) =>
    set((s) => ({
      patterns: patch(s.patterns, patternId, (p) => {
        const cells = [...(p.stepsByChannel[channelId] ?? [])];
        cells[stepIndex] = { ...cells[stepIndex], on: !cells[stepIndex]?.on };
        return { ...p, stepsByChannel: { ...p.stepsByChannel, [channelId]: cells } };
      }),
    })),

  setStepVelocity: (patternId, channelId, stepIndex, velocity) =>
    set((s) => ({
      patterns: patch(s.patterns, patternId, (p) => {
        const cells = [...(p.stepsByChannel[channelId] ?? [])];
        cells[stepIndex] = { ...cells[stepIndex], velocity: Math.max(0, Math.min(1, velocity)) };
        return { ...p, stepsByChannel: { ...p.stepsByChannel, [channelId]: cells } };
      }),
    })),

  addNote: (patternId, channelId, note) => {
    const id = uuid();
    set((s) => ({
      patterns: patch(s.patterns, patternId, (p) => ({
        ...p,
        notesByChannel: {
          ...p.notesByChannel,
          [channelId]: [...(p.notesByChannel[channelId] ?? []), { ...note, id }],
        },
      })),
    }));
    return id;
  },

  updateNote: (patternId, channelId, noteId, noteChange) =>
    set((s) => ({
      patterns: patch(s.patterns, patternId, (p) => ({
        ...p,
        notesByChannel: {
          ...p.notesByChannel,
          [channelId]: (p.notesByChannel[channelId] ?? []).map((n) => (n.id === noteId ? { ...n, ...noteChange } : n)),
        },
      })),
    })),

  removeNote: (patternId, channelId, noteId) =>
    set((s) => ({
      patterns: patch(s.patterns, patternId, (p) => ({
        ...p,
        notesByChannel: {
          ...p.notesByChannel,
          [channelId]: (p.notesByChannel[channelId] ?? []).filter((n) => n.id !== noteId),
        },
      })),
    })),

  addPlaylistTrack: (name) => {
    const id = uuid();
    const track: PlaylistTrack = { id, name: name ?? `Track ${get().playlistTracks.length + 1}`, muted: false };
    set((s) => ({ playlistTracks: [...s.playlistTracks, track] }));
    return id;
  },

  removePlaylistTrack: (trackId) =>
    set((s) => ({
      playlistTracks: s.playlistTracks.filter((t) => t.id !== trackId),
      playlistBlocks: s.playlistBlocks.filter((b) => b.trackId !== trackId),
    })),

  toggleMutePlaylistTrack: (trackId) =>
    set((s) => ({ playlistTracks: patch(s.playlistTracks, trackId, (t) => ({ ...t, muted: !t.muted })) })),

  addPlaylistBlock: (trackId, patternId, startBar, lengthBars) => {
    const id = uuid();
    const block: PlaylistBlock = { id, trackId, patternId, startBar, lengthBars };
    set((s) => ({ playlistBlocks: [...s.playlistBlocks, block] }));
    return id;
  },

  moveBlock: (blockId, trackId, startBar) =>
    set((s) => ({
      playlistBlocks: patch(s.playlistBlocks, blockId, (b) => ({ ...b, trackId, startBar: Math.max(0, startBar) })),
    })),

  resizeBlock: (blockId, lengthBars) =>
    set((s) => ({
      playlistBlocks: patch(s.playlistBlocks, blockId, (b) => ({ ...b, lengthBars: Math.max(1, lengthBars) })),
    })),

  removeBlock: (blockId) => set((s) => ({ playlistBlocks: s.playlistBlocks.filter((b) => b.id !== blockId) })),

  addMixerTrack: (name) => {
    const id = uuid();
    const track: MixerTrack = {
      id,
      name: name ?? `Insert ${get().mixerTracks.length}`,
      volume: 1,
      pan: 0,
      muted: false,
      soloed: false,
      inserts: [],
    };
    set((s) => ({ mixerTracks: [...s.mixerTracks, track] }));
    return id;
  },

  removeMixerTrack: (trackId) =>
    set((s) => ({
      mixerTracks: s.mixerTracks.filter((t) => t.id !== trackId),
      channels: s.channels.map((c) => (c.mixerTrackId === trackId ? { ...c, mixerTrackId: s.mixerTracks[0].id } : c)),
    })),

  setMixerVolume: (trackId, volume) => set((s) => ({ mixerTracks: patch(s.mixerTracks, trackId, (t) => ({ ...t, volume })) })),
  setMixerPan: (trackId, pan) => set((s) => ({ mixerTracks: patch(s.mixerTracks, trackId, (t) => ({ ...t, pan })) })),
  toggleMixerMute: (trackId) =>
    set((s) => ({ mixerTracks: patch(s.mixerTracks, trackId, (t) => ({ ...t, muted: !t.muted })) })),
  toggleMixerSolo: (trackId) =>
    set((s) => ({ mixerTracks: patch(s.mixerTracks, trackId, (t) => ({ ...t, soloed: !t.soloed })) })),

  addInsert: (trackId, params) => {
    const id = uuid();
    set((s) => ({
      mixerTracks: patch(s.mixerTracks, trackId, (t) => ({
        ...t,
        inserts: [...t.inserts, { id, enabled: true, params }],
      })),
    }));
    return id;
  },

  updateInsert: (trackId, insertId, insertChange) =>
    set((s) => ({
      mixerTracks: patch(s.mixerTracks, trackId, (t) => ({
        ...t,
        inserts: t.inserts.map((i) => (i.id === insertId ? { ...i, ...insertChange } : i)),
      })),
    })),

  removeInsert: (trackId, insertId) =>
    set((s) => ({
      mixerTracks: patch(s.mixerTracks, trackId, (t) => ({ ...t, inserts: t.inserts.filter((i) => i.id !== insertId) })),
    })),

  reorderInserts: (trackId, insertIds) =>
    set((s) => ({
      mixerTracks: patch(s.mixerTracks, trackId, (t) => ({
        ...t,
        inserts: insertIds.map((id) => t.inserts.find((i) => i.id === id)!).filter(Boolean),
      })),
    })),

  addSample: (id, name, dataUrl) => set((s) => ({ samples: { ...s.samples, [id]: { name, dataUrl } } })),
  removeSample: (id) =>
    set((s) => {
      const { [id]: _removed, ...rest } = s.samples;
      return { samples: rest };
    }),

  addAutomationLane: (target, name) => {
    const id = uuid();
    const lane: AutomationLane = { id, name, target, points: [] };
    set((s) => ({ automationLanes: [...s.automationLanes, lane] }));
    return id;
  },

  removeAutomationLane: (laneId) => set((s) => ({ automationLanes: s.automationLanes.filter((l) => l.id !== laneId) })),

  addAutomationPoint: (laneId, bar, value) => {
    const id = uuid();
    set((s) => ({
      automationLanes: patch(s.automationLanes, laneId, (lane) => ({
        ...lane,
        points: [...lane.points, { id, bar, value }].sort((a, b) => a.bar - b.bar),
      })),
    }));
    return id;
  },

  updateAutomationPoint: (laneId, pointId, pointPatch) =>
    set((s) => ({
      automationLanes: patch(s.automationLanes, laneId, (lane) => ({
        ...lane,
        points: lane.points.map((p) => (p.id === pointId ? { ...p, ...pointPatch } : p)).sort((a, b) => a.bar - b.bar),
      })),
    })),

  removeAutomationPoint: (laneId, pointId) =>
    set((s) => ({
      automationLanes: patch(s.automationLanes, laneId, (lane) => ({
        ...lane,
        points: lane.points.filter((p) => p.id !== pointId),
      })),
    })),

  loadProject: (project) => set({ ...project, selectedChannelId: null, selectedPatternId: project.patterns[0]?.id ?? null }),
  resetProject: () => set({ ...createDefaultProject(), selectedChannelId: null, selectedPatternId: null }),
}));
