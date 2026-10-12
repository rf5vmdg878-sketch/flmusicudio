import type { InsertEffectParams } from '@/types/project';

export interface EffectNode {
  input: AudioNode;
  output: AudioNode;
  update: (params: InsertEffectParams) => void;
  dispose: () => void;
}

function makeDryWet(ctx: BaseAudioContext, wetChain: { input: AudioNode; output: AudioNode }, mix: number) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  input.connect(dryGain);
  dryGain.connect(output);
  input.connect(wetChain.input);
  wetChain.output.connect(wetGain);
  wetGain.connect(output);
  const setMix = (m: number) => {
    dryGain.gain.value = 1 - m;
    wetGain.gain.value = m;
  };
  setMix(mix);
  return { input, output, setMix };
}

function buildEq3(ctx: BaseAudioContext): EffectNode {
  const low = ctx.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 250;
  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1000;
  mid.Q.value = 0.8;
  const high = ctx.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = 4000;
  low.connect(mid);
  mid.connect(high);
  return {
    input: low,
    output: high,
    update: (params) => {
      if (params.type !== 'eq3') return;
      low.gain.value = params.lowGainDb;
      mid.gain.value = params.midGainDb;
      high.gain.value = params.highGainDb;
    },
    dispose: () => {
      low.disconnect();
      mid.disconnect();
      high.disconnect();
    },
  };
}

function buildDelay(ctx: BaseAudioContext): EffectNode {
  const delay = ctx.createDelay(5);
  const feedback = ctx.createGain();
  const wetChainInput = ctx.createGain();
  delay.connect(feedback);
  feedback.connect(delay);
  wetChainInput.connect(delay);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: delay }, 0.3);
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'delay') return;
      delay.delayTime.value = params.timeSeconds;
      feedback.gain.value = params.feedback;
      dw.setMix(params.mix);
    },
    dispose: () => {
      delay.disconnect();
      feedback.disconnect();
      wetChainInput.disconnect();
    },
  };
}

function generateImpulseResponse(ctx: BaseAudioContext, decaySeconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * decaySeconds));
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
  }
  return impulse;
}

function buildReverb(ctx: BaseAudioContext): EffectNode {
  const convolver = ctx.createConvolver();
  convolver.buffer = generateImpulseResponse(ctx, 1.4);
  const wetChainInput = ctx.createGain();
  wetChainInput.connect(convolver);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: convolver }, 0.12);
  let lastDecay = 1.4;
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'reverb') return;
      if (Math.abs(params.decaySeconds - lastDecay) > 0.05) {
        lastDecay = params.decaySeconds;
        convolver.buffer = generateImpulseResponse(ctx, Math.max(0.1, params.decaySeconds));
      }
      dw.setMix(params.mix);
    },
    dispose: () => {
      convolver.disconnect();
      wetChainInput.disconnect();
    },
  };
}

function buildLimiter(ctx: BaseAudioContext): EffectNode {
  const compressor = ctx.createDynamicsCompressor();
  compressor.ratio.value = 20;
  compressor.attack.value = 0.002;
  compressor.knee.value = 0;
  return {
    input: compressor,
    output: compressor,
    update: (params) => {
      if (params.type !== 'limiter') return;
      compressor.threshold.value = params.thresholdDb;
      compressor.release.value = params.releaseSeconds;
    },
    dispose: () => compressor.disconnect(),
  };
}

function makeDistortionCurve(amount: number): Float32Array {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const k = amount * 100;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return curve;
}

function buildDistortion(ctx: BaseAudioContext): EffectNode {
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(0.3);
  shaper.oversample = '4x';
  const wetChainInput = ctx.createGain();
  wetChainInput.connect(shaper);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: shaper }, 0.5);
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'distortion') return;
      shaper.curve = makeDistortionCurve(params.drive);
      dw.setMix(params.mix);
    },
    dispose: () => {
      shaper.disconnect();
      wetChainInput.disconnect();
    },
  };
}

export function buildEffectNode(ctx: BaseAudioContext, params: InsertEffectParams): EffectNode {
  switch (params.type) {
    case 'eq3':
      return buildEq3(ctx);
    case 'delay':
      return buildDelay(ctx);
    case 'reverb':
      return buildReverb(ctx);
    case 'limiter':
      return buildLimiter(ctx);
    case 'distortion':
      return buildDistortion(ctx);
  }
}
