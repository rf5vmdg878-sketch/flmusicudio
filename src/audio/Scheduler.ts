import type { AutomationLane, Pattern, ProjectState } from '@/types/project';
import { useProjectStore } from '@/state/store';
import type { MixerGraph } from './MixerGraph';
import type { SampleCache } from './SampleCache';
import { triggerInstrument } from './instruments/triggerInstrument';

export const STEPS_PER_BAR = 16;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;

export function stepDurationSeconds(bpm: number): number {
  return 60 / bpm / 4;
}

export function songLengthBars(project: ProjectState): number {
  let maxBar = 1;
  for (const block of project.playlistBlocks) {
    maxBar = Math.max(maxBar, block.startBar + block.lengthBars);
  }
  return maxBar;
}

function defaultAutomationValue(lane: AutomationLane): number {
  return lane.target.kind === 'mixerVolume' ? 1 : 0;
}

/** Linear interpolation between the automation lane's surrounding points at
 * a given (possibly fractional) bar position; holds the nearest point's
 * value before the first/after the last point, and the target's identity
 * value when the lane has no points at all. */
export function automationValueAtBar(lane: AutomationLane, barPosition: number): number {
  const points = lane.points;
  if (points.length === 0) return defaultAutomationValue(lane);
  if (barPosition <= points[0].bar) return points[0].value;
  const last = points[points.length - 1];
  if (barPosition >= last.bar) return last.value;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (barPosition >= a.bar && barPosition <= b.bar) {
      const span = b.bar - a.bar;
      const t = span <= 0 ? 0 : (barPosition - a.bar) / span;
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
}

export interface StepHit {
  channelId: string;
  velocity: number;
  durationSteps: number;
  midiNote?: number;
}

function hitsForPatternStep(pattern: Pattern, patternStepIndex: number): StepHit[] {
  const hits: StepHit[] = [];
  for (const [channelId, cells] of Object.entries(pattern.stepsByChannel)) {
    const cell = cells[patternStepIndex];
    if (cell?.on) hits.push({ channelId, velocity: cell.velocity, durationSteps: 1 });
  }
  for (const [channelId, notes] of Object.entries(pattern.notesByChannel)) {
    for (const note of notes) {
      if (note.startStep === patternStepIndex) {
        hits.push({ channelId, velocity: note.velocity, durationSteps: note.lengthSteps, midiNote: note.pitch });
      }
    }
  }
  return hits;
}

/** Resolves which instrument hits occur at a given global 16th-note step,
 * for either pattern-preview playback or full song/playlist playback. */
export function resolveHitsAtGlobalStep(project: ProjectState, globalStep: number): StepHit[] {
  if (project.transport.playMode === 'pattern') {
    const pattern = project.patterns.find((p) => p.id === project.transport.currentPatternId);
    if (!pattern) return [];
    const stepIndex = globalStep % pattern.lengthSteps;
    return hitsForPatternStep(pattern, stepIndex);
  }

  const barIndex = Math.floor(globalStep / STEPS_PER_BAR);
  const stepInBar = globalStep % STEPS_PER_BAR;
  const hits: StepHit[] = [];
  for (const track of project.playlistTracks) {
    if (track.muted) continue;
    const block = project.playlistBlocks.find(
      (b) => b.trackId === track.id && barIndex >= b.startBar && barIndex < b.startBar + b.lengthBars,
    );
    if (!block) continue;
    const pattern = project.patterns.find((p) => p.id === block.patternId);
    if (!pattern) continue;
    const patternBars = Math.max(1, Math.ceil(pattern.lengthSteps / STEPS_PER_BAR));
    const localBar = (barIndex - block.startBar) % patternBars;
    const patternStepIndex = localBar * STEPS_PER_BAR + stepInBar;
    if (patternStepIndex >= pattern.lengthSteps) continue;
    hits.push(...hitsForPatternStep(pattern, patternStepIndex));
  }
  return hits;
}

export class Scheduler {
  private readonly ctx: AudioContext;
  private readonly mixerGraph: MixerGraph;
  private readonly sampleCache: SampleCache;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private globalStep = 0;
  private running = false;

  constructor(ctx: AudioContext, mixerGraph: MixerGraph, sampleCache: SampleCache) {
    this.ctx = ctx;
    this.mixerGraph = mixerGraph;
    this.sampleCache = sampleCache;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.globalStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.timerId = setInterval(this.tick, LOOKAHEAD_MS);
  }

  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tick = (): void => {
    const project = useProjectStore.getState();
    const bpm = project.transport.bpm;
    const stepSeconds = stepDurationSeconds(bpm);
    const swingOffset = stepSeconds * project.transport.swingPercent * 0.5;

    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const isOffbeat = this.globalStep % 2 === 1;
      const scheduledTime = this.nextStepTime + (isOffbeat ? swingOffset : 0);
      this.scheduleStep(project, this.globalStep, scheduledTime, stepSeconds);

      const totalBars = project.transport.playMode === 'song' ? songLengthBars(project) : Infinity;
      const barIndex = Math.floor(this.globalStep / STEPS_PER_BAR);
      this.globalStep += 1;
      if (project.transport.playMode === 'song' && barIndex + 1 >= totalBars && this.globalStep % STEPS_PER_BAR === 0) {
        this.globalStep = 0;
      }
      this.nextStepTime += stepSeconds;
    }
  };

  private scheduleStep(project: ProjectState, globalStep: number, time: number, stepSeconds: number): void {
    const hits = resolveHitsAtGlobalStep(project, globalStep);
    for (const hit of hits) {
      const channel = project.channels.find((c) => c.id === hit.channelId);
      if (!channel) continue;
      const destination = this.mixerGraph.getChannelDestination(channel.id);
      if (!destination) continue;
      triggerInstrument(
        { ctx: this.ctx, destination, getSampleBuffer: (id) => this.sampleCache.get(id) },
        channel.instrument,
        time,
        hit.durationSteps * stepSeconds,
        hit.velocity,
        hit.midiNote,
      );
    }

    if (project.transport.playMode === 'song') {
      const barPosition = globalStep / STEPS_PER_BAR;
      for (const lane of project.automationLanes) {
        const targetId = lane.target.mixerTrackId;
        const param =
          lane.target.kind === 'mixerVolume'
            ? this.mixerGraph.getTrackAutomationGainParam(targetId)
            : this.mixerGraph.getTrackAutomationPanParam(targetId);
        if (!param) continue;
        const value = automationValueAtBar(lane, barPosition);
        param.linearRampToValueAtTime(value, time);
      }
    }

    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
    setTimeout(() => {
      if (!this.running) return;
      const barIndex = Math.floor(globalStep / STEPS_PER_BAR);
      const stepInBar = globalStep % STEPS_PER_BAR;
      useProjectStore.getState().setTransportPosition(stepInBar, barIndex);
    }, delayMs);
  }
}
