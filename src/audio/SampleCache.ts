import { decodeSampleDataUrl } from './instruments/SamplePlayer';

/** Decodes and caches user-imported sample audio so the scheduler can read
 * buffers synchronously when triggering a note. */
export class SampleCache {
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Set<string>();

  get(sampleId: string): AudioBuffer | undefined {
    return this.buffers.get(sampleId);
  }

  async ensure(ctx: BaseAudioContext, sampleId: string, dataUrl: string): Promise<void> {
    if (this.buffers.has(sampleId) || this.pending.has(sampleId)) return;
    this.pending.add(sampleId);
    try {
      const buffer = await decodeSampleDataUrl(ctx, dataUrl);
      this.buffers.set(sampleId, buffer);
    } finally {
      this.pending.delete(sampleId);
    }
  }

  async syncFromProjectSamples(ctx: BaseAudioContext, samples: Record<string, { dataUrl: string }>): Promise<void> {
    await Promise.all(Object.entries(samples).map(([id, s]) => this.ensure(ctx, id, s.dataUrl)));
  }
}
