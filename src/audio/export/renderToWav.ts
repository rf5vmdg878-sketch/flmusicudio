import type { ProjectState } from '@/types/project';
import { MASTER_TRACK_ID } from '@/state/defaultProject';
import { MixerGraph } from '../MixerGraph';
import { SampleCache } from '../SampleCache';
import { resolveHitsAtGlobalStep, songLengthBars, stepDurationSeconds, STEPS_PER_BAR } from '../Scheduler';
import { triggerInstrument } from '../instruments/triggerInstrument';
import { audioBufferToWav } from './wavEncoder';

const RENDER_SAMPLE_RATE = 44100;
const TAIL_SECONDS = 2;

export type ExportTarget = { mode: 'song' } | { mode: 'pattern'; patternId: string };

export async function renderProjectToWav(project: ProjectState, target: ExportTarget): Promise<ArrayBuffer> {
  const stepSeconds = stepDurationSeconds(project.transport.bpm);

  let totalSteps: number;
  let effectiveProject: ProjectState = project;

  if (target.mode === 'song') {
    totalSteps = songLengthBars(project) * STEPS_PER_BAR;
  } else {
    const pattern = project.patterns.find((p) => p.id === target.patternId);
    totalSteps = pattern?.lengthSteps ?? STEPS_PER_BAR;
    effectiveProject = {
      ...project,
      transport: { ...project.transport, playMode: 'pattern', currentPatternId: target.patternId },
    };
  }

  const totalDuration = totalSteps * stepSeconds + TAIL_SECONDS;
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * RENDER_SAMPLE_RATE), RENDER_SAMPLE_RATE);

  const mixerGraph = new MixerGraph(offlineCtx, MASTER_TRACK_ID);
  mixerGraph.sync(effectiveProject);

  const sampleCache = new SampleCache();
  await sampleCache.syncFromProjectSamples(offlineCtx, effectiveProject.samples);

  for (let step = 0; step < totalSteps; step++) {
    const time = step * stepSeconds;
    const hits = resolveHitsAtGlobalStep(effectiveProject, step);
    for (const hit of hits) {
      const channel = effectiveProject.channels.find((c) => c.id === hit.channelId);
      if (!channel) continue;
      const destination = mixerGraph.getChannelDestination(channel.id);
      if (!destination) continue;
      triggerInstrument(
        { ctx: offlineCtx, destination, getSampleBuffer: (id) => sampleCache.get(id) },
        channel.instrument,
        time,
        hit.durationSteps * stepSeconds,
        hit.velocity,
        hit.midiNote,
      );
    }
  }

  const rendered = await offlineCtx.startRendering();
  mixerGraph.dispose();
  return audioBufferToWav(rendered);
}
