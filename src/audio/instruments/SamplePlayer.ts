export interface SampleAdsr {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface BufferRange {
  offsetSeconds: number;
  durationSeconds: number;
}

export function triggerSampleBuffer(
  ctx: BaseAudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  time: number,
  durationSeconds: number,
  playbackRate: number,
  velocity: number,
  loop: boolean,
  adsr: SampleAdsr,
  /** Slice Deck mode: play only this sub-range of the buffer, scaled by
   * playbackRate same as any other note. Omit to play the whole buffer. */
  range?: BufferRange,
): void {
  const v = Math.max(0.05, Math.min(1, velocity));
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = playbackRate;
  src.loop = loop && !range;

  const gain = ctx.createGain();
  const releaseStart = time + Math.max(durationSeconds, adsr.attack + adsr.decay + 0.01);
  const sustainLevel = v * adsr.sustain;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(v, time + adsr.attack);
  gain.gain.linearRampToValueAtTime(sustainLevel, time + adsr.attack + adsr.decay);
  gain.gain.setValueAtTime(sustainLevel, releaseStart);
  gain.gain.linearRampToValueAtTime(0.0001, releaseStart + adsr.release);

  src.connect(gain);
  gain.connect(destination);
  if (range) {
    src.start(time, range.offsetSeconds, range.durationSeconds);
  } else {
    src.start(time);
  }
  src.stop(releaseStart + adsr.release + 0.05);
}

export async function decodeSampleDataUrl(ctx: BaseAudioContext, dataUrl: string): Promise<AudioBuffer> {
  const res = await fetch(dataUrl);
  const arrayBuffer = await res.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}
