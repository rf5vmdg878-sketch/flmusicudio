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

function buildParametricEq(ctx: BaseAudioContext): EffectNode {
  const filters = Array.from({ length: 4 }, () => ctx.createBiquadFilter());
  filters[0].type = 'lowshelf';
  filters[1].type = 'peaking';
  filters[2].type = 'peaking';
  filters[3].type = 'highshelf';
  for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
  return {
    input: filters[0],
    output: filters[filters.length - 1],
    update: (params) => {
      if (params.type !== 'parametric_eq') return;
      params.bands.forEach((band, i) => {
        const filter = filters[i];
        filter.type = band.filterType;
        filter.frequency.value = band.freqHz;
        filter.gain.value = band.gainDb;
        filter.Q.value = band.q;
      });
    },
    dispose: () => filters.forEach((f) => f.disconnect()),
  };
}

function buildChorus(ctx: BaseAudioContext): EffectNode {
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 0.015;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 1.2;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.005;
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  const wetChainInput = ctx.createGain();
  wetChainInput.connect(delay);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: delay }, 0.4);
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'chorus') return;
      lfo.frequency.value = params.rateHz;
      lfoGain.gain.value = params.depthMs / 1000;
      dw.setMix(params.mix);
    },
    dispose: () => {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      delay.disconnect();
      wetChainInput.disconnect();
    },
  };
}

function buildPhaser(ctx: BaseAudioContext): EffectNode {
  const stageCount = 6;
  const stages = Array.from({ length: stageCount }, () => {
    const f = ctx.createBiquadFilter();
    f.type = 'allpass';
    f.frequency.value = 800;
    return f;
  });
  for (let i = 0; i < stages.length - 1; i++) stages[i].connect(stages[i + 1]);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 600;
  lfo.connect(lfoGain);
  stages.forEach((stage) => lfoGain.connect(stage.frequency));
  lfo.start();

  const feedbackGain = ctx.createGain();
  feedbackGain.gain.value = 0.3;
  stages[stages.length - 1].connect(feedbackGain);
  feedbackGain.connect(stages[0]);

  const wetChainInput = ctx.createGain();
  wetChainInput.connect(stages[0]);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: stages[stages.length - 1] }, 0.5);
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'phaser') return;
      lfo.frequency.value = params.rateHz;
      lfoGain.gain.value = 200 + params.depth * 1800;
      feedbackGain.gain.value = params.feedback;
      dw.setMix(params.mix);
    },
    dispose: () => {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      feedbackGain.disconnect();
      stages.forEach((s) => s.disconnect());
      wetChainInput.disconnect();
    },
  };
}

function makeBitcrushCurve(bitDepth: number): Float32Array {
  const steps = Math.max(2, Math.pow(2, Math.max(1, Math.min(16, bitDepth))));
  const samples = 1024;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
}

function buildBitcrusher(ctx: BaseAudioContext): EffectNode {
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeBitcrushCurve(8);
  const wetChainInput = ctx.createGain();
  wetChainInput.connect(shaper);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: shaper }, 1);
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'bitcrusher') return;
      shaper.curve = makeBitcrushCurve(params.bitDepth);
      dw.setMix(params.mix);
    },
    dispose: () => {
      shaper.disconnect();
      wetChainInput.disconnect();
    },
  };
}

function buildStereoWidener(ctx: BaseAudioContext): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const splitter = ctx.createChannelSplitter(2);
  const merger = ctx.createChannelMerger(2);
  input.connect(splitter);

  // Mid/side matrix: M = (L+R)/2, S = (L-R)/2, then L' = M + width*S, R' = M - width*S.
  const midGain = ctx.createGain();
  midGain.gain.value = 0.5;
  const sideGainPos = ctx.createGain();
  const sideGainNeg = ctx.createGain();

  splitter.connect(midGain, 0);
  splitter.connect(midGain, 1);

  const sideFromL = ctx.createGain();
  sideFromL.gain.value = 0.5;
  const sideFromR = ctx.createGain();
  sideFromR.gain.value = -0.5;
  splitter.connect(sideFromL, 0);
  splitter.connect(sideFromR, 1);
  sideFromL.connect(sideGainPos);
  sideFromR.connect(sideGainPos);
  sideFromL.connect(sideGainNeg);
  sideFromR.connect(sideGainNeg);

  midGain.connect(merger, 0, 0);
  sideGainPos.connect(merger, 0, 0);
  midGain.connect(merger, 0, 1);
  sideGainNeg.connect(merger, 0, 1);

  merger.connect(output);

  const setWidth = (width: number) => {
    sideGainPos.gain.value = width;
    sideGainNeg.gain.value = -width;
  };
  setWidth(1);

  return {
    input,
    output,
    update: (params) => {
      if (params.type !== 'stereo_widener') return;
      setWidth(params.width);
    },
    dispose: () => {
      input.disconnect();
      splitter.disconnect();
      midGain.disconnect();
      sideFromL.disconnect();
      sideFromR.disconnect();
      sideGainPos.disconnect();
      sideGainNeg.disconnect();
      merger.disconnect();
      output.disconnect();
    },
  };
}

function buildCompressor(ctx: BaseAudioContext): EffectNode {
  const compressor = ctx.createDynamicsCompressor();
  compressor.knee.value = 6;
  const makeup = ctx.createGain();
  compressor.connect(makeup);
  return {
    input: compressor,
    output: makeup,
    update: (params) => {
      if (params.type !== 'compressor') return;
      compressor.threshold.value = params.thresholdDb;
      compressor.ratio.value = params.ratio;
      compressor.attack.value = params.attackSeconds;
      compressor.release.value = params.releaseSeconds;
      makeup.gain.value = Math.pow(10, params.makeupGainDb / 20);
    },
    dispose: () => {
      compressor.disconnect();
      makeup.disconnect();
    },
  };
}

function buildFlanger(ctx: BaseAudioContext): EffectNode {
  const delay = ctx.createDelay(0.02);
  delay.delayTime.value = 0.003;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.4;
  delay.connect(feedback);
  feedback.connect(delay);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.25;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.002;
  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  const wetChainInput = ctx.createGain();
  wetChainInput.connect(delay);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: delay }, 0.5);
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'flanger') return;
      lfo.frequency.value = params.rateHz;
      lfoGain.gain.value = params.depthMs / 1000;
      feedback.gain.value = params.feedback;
      dw.setMix(params.mix);
    },
    dispose: () => {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      delay.disconnect();
      feedback.disconnect();
      wetChainInput.disconnect();
    },
  };
}

function buildTremolo(ctx: BaseAudioContext): EffectNode {
  const gain = ctx.createGain();
  gain.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();
  return {
    input: gain,
    output: gain,
    update: (params) => {
      if (params.type !== 'tremolo') return;
      lfo.frequency.value = params.rateHz;
      gain.gain.value = 1 - params.depth / 2;
      lfoGain.gain.value = params.depth / 2;
    },
    dispose: () => {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      gain.disconnect();
    },
  };
}

function buildAutoPan(ctx: BaseAudioContext): EffectNode {
  const panner = ctx.createStereoPanner();
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.7;
  lfo.connect(lfoGain);
  lfoGain.connect(panner.pan);
  lfo.start();
  return {
    input: panner,
    output: panner,
    update: (params) => {
      if (params.type !== 'autopan') return;
      lfo.frequency.value = params.rateHz;
      lfoGain.gain.value = params.depth;
    },
    dispose: () => {
      lfo.stop();
      lfo.disconnect();
      lfoGain.disconnect();
      panner.disconnect();
    },
  };
}

function makeGateCurve(thresholdDb: number): Float32Array {
  const thresholdLinear = Math.pow(10, thresholdDb / 20);
  const samples = 2048;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.abs(x) < thresholdLinear ? 0 : x;
  }
  return curve;
}

function buildGate(ctx: BaseAudioContext): EffectNode {
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeGateCurve(-40);
  return {
    input: shaper,
    output: shaper,
    update: (params) => {
      if (params.type !== 'gate') return;
      shaper.curve = makeGateCurve(params.thresholdDb);
    },
    dispose: () => shaper.disconnect(),
  };
}

function buildMultibandCompressor(ctx: BaseAudioContext): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();

  // Linkwitz-Riley-style crossover: cascade two matched filters per split
  // for a steeper, better-behaved band split than a single biquad.
  const lowLp1 = ctx.createBiquadFilter();
  lowLp1.type = 'lowpass';
  const lowLp2 = ctx.createBiquadFilter();
  lowLp2.type = 'lowpass';
  input.connect(lowLp1);
  lowLp1.connect(lowLp2);

  const midHp1 = ctx.createBiquadFilter();
  midHp1.type = 'highpass';
  const midHp2 = ctx.createBiquadFilter();
  midHp2.type = 'highpass';
  const midLp1 = ctx.createBiquadFilter();
  midLp1.type = 'lowpass';
  const midLp2 = ctx.createBiquadFilter();
  midLp2.type = 'lowpass';
  input.connect(midHp1);
  midHp1.connect(midHp2);
  midHp2.connect(midLp1);
  midLp1.connect(midLp2);

  const highHp1 = ctx.createBiquadFilter();
  highHp1.type = 'highpass';
  const highHp2 = ctx.createBiquadFilter();
  highHp2.type = 'highpass';
  input.connect(highHp1);
  highHp1.connect(highHp2);

  const lowComp = ctx.createDynamicsCompressor();
  const midComp = ctx.createDynamicsCompressor();
  const highComp = ctx.createDynamicsCompressor();
  lowLp2.connect(lowComp);
  midLp2.connect(midComp);
  highHp2.connect(highComp);

  const makeup = ctx.createGain();
  lowComp.connect(makeup);
  midComp.connect(makeup);
  highComp.connect(makeup);
  makeup.connect(output);

  return {
    input,
    output,
    update: (params) => {
      if (params.type !== 'multiband_compressor') return;
      [lowLp1, lowLp2].forEach((f) => (f.frequency.value = params.lowCrossoverHz));
      [midHp1, midHp2].forEach((f) => (f.frequency.value = params.lowCrossoverHz));
      [midLp1, midLp2].forEach((f) => (f.frequency.value = params.highCrossoverHz));
      [highHp1, highHp2].forEach((f) => (f.frequency.value = params.highCrossoverHz));
      lowComp.threshold.value = params.lowThresholdDb;
      lowComp.ratio.value = params.lowRatio;
      midComp.threshold.value = params.midThresholdDb;
      midComp.ratio.value = params.midRatio;
      highComp.threshold.value = params.highThresholdDb;
      highComp.ratio.value = params.highRatio;
      makeup.gain.value = Math.pow(10, params.makeupGainDb / 20);
    },
    dispose: () => {
      [input, output, lowLp1, lowLp2, midHp1, midHp2, midLp1, midLp2, highHp1, highHp2, lowComp, midComp, highComp, makeup].forEach((n) =>
        n.disconnect(),
      );
    },
  };
}

function makeSaturatorCurve(drive: number): Float32Array {
  const samples = 1024;
  const curve = new Float32Array(samples);
  const amount = 1 + drive * 9;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
}

function buildSaturator(ctx: BaseAudioContext): EffectNode {
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeSaturatorCurve(0.3);
  shaper.oversample = '4x';
  const warmthFilter = ctx.createBiquadFilter();
  warmthFilter.type = 'lowpass';
  warmthFilter.frequency.value = 12000;
  shaper.connect(warmthFilter);

  const wetChainInput = ctx.createGain();
  wetChainInput.connect(shaper);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: warmthFilter }, 0.6);
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'saturator') return;
      shaper.curve = makeSaturatorCurve(params.drive);
      warmthFilter.frequency.value = 18000 - params.warmth * 14000;
      dw.setMix(params.mix);
    },
    dispose: () => {
      shaper.disconnect();
      warmthFilter.disconnect();
      wetChainInput.disconnect();
    },
  };
}

function buildPingPongDelay(ctx: BaseAudioContext): EffectNode {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const merger = ctx.createChannelMerger(2);

  const delayL = ctx.createDelay(2);
  const delayR = ctx.createDelay(2);
  const feedbackL = ctx.createGain();
  const feedbackR = ctx.createGain();

  input.connect(delayL);
  delayL.connect(feedbackL);
  feedbackL.connect(delayR);
  delayR.connect(feedbackR);
  feedbackR.connect(delayL);

  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);

  const wetGain = ctx.createGain();
  merger.connect(wetGain);
  const dryGain = ctx.createGain();
  input.connect(dryGain);
  dryGain.connect(output);
  wetGain.connect(output);

  const setMix = (m: number) => {
    dryGain.gain.value = 1 - m;
    wetGain.gain.value = m;
  };
  setMix(0.35);

  return {
    input,
    output,
    update: (params) => {
      if (params.type !== 'pingpong_delay') return;
      delayL.delayTime.value = params.timeSeconds;
      delayR.delayTime.value = params.timeSeconds;
      feedbackL.gain.value = params.feedback;
      feedbackR.gain.value = params.feedback;
      setMix(params.mix);
    },
    dispose: () => {
      [input, output, merger, delayL, delayR, feedbackL, feedbackR, wetGain, dryGain].forEach((n) => n.disconnect());
    },
  };
}

function buildRingMod(ctx: BaseAudioContext): EffectNode {
  // A GainNode whose gain AudioParam is driven only by a carrier oscillator
  // (no base gain value) performs true ring modulation: output = input * carrier.
  const ringGain = ctx.createGain();
  ringGain.gain.value = 0;
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = 220;
  carrier.connect(ringGain.gain);
  carrier.start();

  const wetChainInput = ctx.createGain();
  wetChainInput.connect(ringGain);
  const dw = makeDryWet(ctx, { input: wetChainInput, output: ringGain }, 0.5);
  return {
    input: dw.input,
    output: dw.output,
    update: (params) => {
      if (params.type !== 'ringmod') return;
      carrier.frequency.value = params.frequencyHz;
      dw.setMix(params.mix);
    },
    dispose: () => {
      carrier.stop();
      carrier.disconnect();
      ringGain.disconnect();
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
    case 'parametric_eq':
      return buildParametricEq(ctx);
    case 'chorus':
      return buildChorus(ctx);
    case 'phaser':
      return buildPhaser(ctx);
    case 'bitcrusher':
      return buildBitcrusher(ctx);
    case 'stereo_widener':
      return buildStereoWidener(ctx);
    case 'compressor':
      return buildCompressor(ctx);
    case 'flanger':
      return buildFlanger(ctx);
    case 'tremolo':
      return buildTremolo(ctx);
    case 'autopan':
      return buildAutoPan(ctx);
    case 'gate':
      return buildGate(ctx);
    case 'multiband_compressor':
      return buildMultibandCompressor(ctx);
    case 'saturator':
      return buildSaturator(ctx);
    case 'pingpong_delay':
      return buildPingPongDelay(ctx);
    case 'ringmod':
      return buildRingMod(ctx);
  }
}
