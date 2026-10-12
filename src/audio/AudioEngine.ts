import { useProjectStore } from '@/state/store';
import { MASTER_TRACK_ID } from '@/state/defaultProject';
import { MixerGraph } from './MixerGraph';
import { Scheduler } from './Scheduler';
import { SampleCache } from './SampleCache';
import { triggerInstrument } from './instruments/triggerInstrument';

/** Top-level singleton tying the Web Audio graph (MixerGraph), the lookahead
 * scheduler (Scheduler) and decoded-sample storage (SampleCache) to the
 * zustand project store. One instance lives for the app's lifetime. */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private mixerGraph: MixerGraph | null = null;
  private scheduler: Scheduler | null = null;
  private sampleCache = new SampleCache();
  private unsubscribe: (() => void) | null = null;

  ensureStarted(): AudioContext {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.mixerGraph = new MixerGraph(ctx, MASTER_TRACK_ID);
    this.scheduler = new Scheduler(ctx, this.mixerGraph, this.sampleCache);

    const sync = (): void => {
      const project = useProjectStore.getState();
      this.mixerGraph?.sync(project);
      void this.sampleCache.syncFromProjectSamples(ctx, project.samples);
    };
    sync();
    this.unsubscribe = useProjectStore.subscribe(sync);
    return ctx;
  }

  play(): void {
    const ctx = this.ensureStarted();
    void ctx.resume();
    this.scheduler?.start();
    useProjectStore.getState().setPlaying(true);
  }

  stop(): void {
    this.scheduler?.stop();
    useProjectStore.getState().setPlaying(false);
    useProjectStore.getState().setTransportPosition(0, 0);
  }

  togglePlay(): void {
    if (this.scheduler?.isRunning) this.stop();
    else this.play();
  }

  /** Fire-and-forget preview of a channel's instrument, used for click-to-audition
   * in the Channel Rack and Piano Roll without needing playback running. */
  previewChannel(channelId: string, velocity = 1, durationSeconds = 0.3, midiNote?: number): void {
    const ctx = this.ensureStarted();
    const project = useProjectStore.getState();
    const channel = project.channels.find((c) => c.id === channelId);
    if (!channel || !this.mixerGraph) return;
    const destination = this.mixerGraph.getChannelDestination(channelId);
    if (!destination) return;
    triggerInstrument(
      { ctx, destination, getSampleBuffer: (id) => this.sampleCache.get(id) },
      channel.instrument,
      ctx.currentTime + 0.01,
      durationSeconds,
      velocity,
      midiNote,
    );
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getMixerGraph(): MixerGraph | null {
    return this.mixerGraph;
  }

  getSampleCache(): SampleCache {
    return this.sampleCache;
  }

  dispose(): void {
    this.scheduler?.stop();
    this.unsubscribe?.();
    this.mixerGraph?.dispose();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audioEngine = new AudioEngine();
