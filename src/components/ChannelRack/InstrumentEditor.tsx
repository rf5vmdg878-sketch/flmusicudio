import { useProjectStore } from '@/state/store';
import { audioEngine } from '@/audio/AudioEngine';
import type {
  AdditiveSynthParams,
  DrumGeneratorId,
  FmSynthParams,
  NoiseColor,
  NoiseSynthParams,
  OscillatorShape,
  PluckSynthParams,
  SamplerParams,
  SynthParams,
  WavetableShape,
  WavetableSynthParams,
} from '@/types/project';
import { DEFAULT_DRUM_KIT } from '@/presets/instruments';
import './InstrumentEditor.css';

interface Props {
  channelId: string;
  onClose: () => void;
}

function Field(props: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }): JSX.Element {
  const { label, value, min, max, step = (max - min) / 100, onChange, format } = props;
  return (
    <div className="field-row">
      <label>{label}</label>
      <input className="slider" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="value">{format ? format(value) : value.toFixed(2)}</span>
    </div>
  );
}

const OSC_SHAPES: OscillatorShape[] = ['sine', 'triangle', 'sawtooth', 'square'];
const FILTER_TYPES: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch'];
const WAVETABLE_SHAPES: WavetableShape[] = ['organic', 'glassy', 'buzzy', 'hollow'];
const NOISE_COLORS: NoiseColor[] = ['white', 'pink', 'brown'];

export function InstrumentEditor({ channelId, onClose }: Props): JSX.Element | null {
  const channel = useProjectStore((s) => s.channels.find((c) => c.id === channelId));
  const setChannelInstrument = useProjectStore((s) => s.setChannelInstrument);
  const renameChannel = useProjectStore((s) => s.renameChannel);
  const addSample = useProjectStore((s) => s.addSample);

  if (!channel) return null;
  const instrument = channel.instrument;

  const updateSynth = (patch: Partial<SynthParams>): void => {
    if (instrument.kind !== 'synth') return;
    setChannelInstrument(channel.id, { ...instrument, ...patch });
  };

  const updateOsc = (index: 0 | 1, patch: Partial<SynthParams['oscillators'][0]>): void => {
    if (instrument.kind !== 'synth') return;
    const oscillators = [...instrument.oscillators] as SynthParams['oscillators'];
    oscillators[index] = { ...oscillators[index], ...patch };
    setChannelInstrument(channel.id, { ...instrument, oscillators });
  };

  const updateSampler = (patch: Partial<SamplerParams>): void => {
    if (instrument.kind !== 'sampler') return;
    setChannelInstrument(channel.id, { ...instrument, ...patch });
  };

  const updateSliceCount = (sliceCount: number): void => {
    if (instrument.kind !== 'sampler' || instrument.source.type !== 'slice') return;
    updateSampler({ source: { ...instrument.source, sliceCount } });
  };

  const updateFm = (patch: Partial<FmSynthParams>): void => {
    if (instrument.kind !== 'fm') return;
    setChannelInstrument(channel.id, { ...instrument, ...patch });
  };

  const updateWavetable = (patch: Partial<WavetableSynthParams>): void => {
    if (instrument.kind !== 'wavetable') return;
    setChannelInstrument(channel.id, { ...instrument, ...patch });
  };

  const updateNoise = (patch: Partial<NoiseSynthParams>): void => {
    if (instrument.kind !== 'noise') return;
    setChannelInstrument(channel.id, { ...instrument, ...patch });
  };

  const updateAdditive = (patch: Partial<AdditiveSynthParams>): void => {
    if (instrument.kind !== 'additive') return;
    setChannelInstrument(channel.id, { ...instrument, ...patch });
  };

  const updateHarmonicLevel = (index: number, level: number): void => {
    if (instrument.kind !== 'additive') return;
    const harmonicLevels = [...instrument.harmonicLevels];
    harmonicLevels[index] = level;
    setChannelInstrument(channel.id, { ...instrument, harmonicLevels });
  };

  const updatePluck = (patch: Partial<PluckSynthParams>): void => {
    if (instrument.kind !== 'pluck') return;
    setChannelInstrument(channel.id, { ...instrument, ...patch });
  };

  const handleImportSample = async (): Promise<void> => {
    if (!window.beatForge || instrument.kind !== 'sampler') return;
    const result = await window.beatForge.importSamples();
    if (!result.ok || result.files.length === 0) return;
    const file = result.files[0];
    const dataUrl = `data:audio/wav;base64,${file.data}`;
    const sampleId = `${channel.id}-${Date.now()}`;
    addSample(sampleId, file.name, dataUrl);
    updateSampler({ source: { type: 'sample', sampleId, rootNote: 60 } });
  };

  return (
    <div className="instrument-editor panel">
      <div className="instrument-editor-header">
        <input className="themed" value={channel.name} onChange={(e) => renameChannel(channel.id, e.target.value)} />
        <button className="btn small" onClick={() => audioEngine.previewChannel(channel.id)}>
          ▶ Preview
        </button>
        <button className="icon-btn" onClick={onClose}>
          ×
        </button>
      </div>

      {instrument.kind === 'synth' && (
        <div className="instrument-editor-body scroll">
          {([0, 1] as const).map((idx) => (
            <div key={idx} className="synth-section">
              <div className="synth-section-title">Oscillator {idx + 1}</div>
              <div className="field-row">
                <label>Shape</label>
                <select className="themed" value={instrument.oscillators[idx].shape} onChange={(e) => updateOsc(idx, { shape: e.target.value as OscillatorShape })}>
                  {OSC_SHAPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Octave" value={instrument.oscillators[idx].octave} min={-3} max={3} step={1} onChange={(v) => updateOsc(idx, { octave: v })} format={(v) => v.toFixed(0)} />
              <Field label="Detune" value={instrument.oscillators[idx].detuneCents} min={-50} max={50} onChange={(v) => updateOsc(idx, { detuneCents: v })} format={(v) => `${v.toFixed(0)}c`} />
              <Field label="Level" value={instrument.oscillators[idx].level} min={0} max={1} onChange={(v) => updateOsc(idx, { level: v })} />
            </div>
          ))}

          <div className="synth-section">
            <div className="synth-section-title">Filter</div>
            <div className="field-row">
              <label>Type</label>
              <select className="themed" value={instrument.filterType} onChange={(e) => updateSynth({ filterType: e.target.value as BiquadFilterType })}>
                {FILTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Cutoff" value={instrument.filterCutoffHz} min={20} max={12000} step={10} onChange={(v) => updateSynth({ filterCutoffHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Resonance" value={instrument.filterResonanceQ} min={0.1} max={20} onChange={(v) => updateSynth({ filterResonanceQ: v })} />
            <Field label="Env Amount" value={instrument.filterEnvAmount} min={-1} max={1} onChange={(v) => updateSynth({ filterEnvAmount: v })} />
          </div>

          <div className="synth-section">
            <div className="synth-section-title">Envelope (ADSR)</div>
            <Field label="Attack" value={instrument.attack} min={0} max={2} onChange={(v) => updateSynth({ attack: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Decay" value={instrument.decay} min={0} max={2} onChange={(v) => updateSynth({ decay: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Sustain" value={instrument.sustain} min={0} max={1} onChange={(v) => updateSynth({ sustain: v })} />
            <Field label="Release" value={instrument.release} min={0} max={3} onChange={(v) => updateSynth({ release: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Glide" value={instrument.glideSeconds} min={0} max={0.5} onChange={(v) => updateSynth({ glideSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
          </div>
        </div>
      )}

      {instrument.kind === 'fm' && (
        <div className="instrument-editor-body scroll">
          <div className="synth-section">
            <div className="synth-section-title">FM Core</div>
            <Field label="Mod Ratio" value={instrument.modulatorRatio} min={0.5} max={12} step={0.1} onChange={(v) => updateFm({ modulatorRatio: v })} />
            <Field label="Mod Index" value={instrument.modulationIndex} min={0} max={10} onChange={(v) => updateFm({ modulationIndex: v })} />
            <Field label="Index Env" value={instrument.modIndexEnvAmount} min={-1} max={1} onChange={(v) => updateFm({ modIndexEnvAmount: v })} />
          </div>
          <div className="synth-section">
            <div className="synth-section-title">Envelope (ADSR)</div>
            <Field label="Attack" value={instrument.attack} min={0} max={2} onChange={(v) => updateFm({ attack: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Decay" value={instrument.decay} min={0} max={2} onChange={(v) => updateFm({ decay: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Sustain" value={instrument.sustain} min={0} max={1} onChange={(v) => updateFm({ sustain: v })} />
            <Field label="Release" value={instrument.release} min={0} max={3} onChange={(v) => updateFm({ release: v })} format={(v) => `${v.toFixed(2)}s`} />
          </div>
        </div>
      )}

      {instrument.kind === 'wavetable' && (
        <div className="instrument-editor-body scroll">
          <div className="synth-section">
            <div className="synth-section-title">Wave Loom</div>
            <div className="field-row">
              <label>Table</label>
              <select className="themed" value={instrument.tableId} onChange={(e) => updateWavetable({ tableId: e.target.value as WavetableShape })}>
                {WAVETABLE_SHAPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Position" value={instrument.tablePosition} min={0} max={1} onChange={(v) => updateWavetable({ tablePosition: v })} />
            <Field label="Unison" value={instrument.unisonVoices} min={1} max={5} step={1} onChange={(v) => updateWavetable({ unisonVoices: v })} format={(v) => v.toFixed(0)} />
            <Field label="Uni Detune" value={instrument.unisonDetuneCents} min={0} max={50} onChange={(v) => updateWavetable({ unisonDetuneCents: v })} format={(v) => `${v.toFixed(0)}c`} />
          </div>
          <div className="synth-section">
            <div className="synth-section-title">Filter</div>
            <div className="field-row">
              <label>Type</label>
              <select className="themed" value={instrument.filterType} onChange={(e) => updateWavetable({ filterType: e.target.value as BiquadFilterType })}>
                {FILTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Cutoff" value={instrument.filterCutoffHz} min={20} max={12000} step={10} onChange={(v) => updateWavetable({ filterCutoffHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Resonance" value={instrument.filterResonanceQ} min={0.1} max={20} onChange={(v) => updateWavetable({ filterResonanceQ: v })} />
          </div>
          <div className="synth-section">
            <div className="synth-section-title">Envelope (ADSR)</div>
            <Field label="Attack" value={instrument.attack} min={0} max={2} onChange={(v) => updateWavetable({ attack: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Decay" value={instrument.decay} min={0} max={2} onChange={(v) => updateWavetable({ decay: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Sustain" value={instrument.sustain} min={0} max={1} onChange={(v) => updateWavetable({ sustain: v })} />
            <Field label="Release" value={instrument.release} min={0} max={3} onChange={(v) => updateWavetable({ release: v })} format={(v) => `${v.toFixed(2)}s`} />
          </div>
        </div>
      )}

      {instrument.kind === 'noise' && (
        <div className="instrument-editor-body scroll">
          <div className="synth-section">
            <div className="synth-section-title">Noise Forge</div>
            <div className="field-row">
              <label>Color</label>
              <select className="themed" value={instrument.color} onChange={(e) => updateNoise({ color: e.target.value as NoiseColor })}>
                {NOISE_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Filter Type</label>
              <select className="themed" value={instrument.filterType} onChange={(e) => updateNoise({ filterType: e.target.value as BiquadFilterType })}>
                {FILTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Cutoff" value={instrument.filterCutoffHz} min={20} max={16000} step={10} onChange={(v) => updateNoise({ filterCutoffHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Resonance" value={instrument.filterResonanceQ} min={0.1} max={20} onChange={(v) => updateNoise({ filterResonanceQ: v })} />
          </div>
          <div className="synth-section">
            <div className="synth-section-title">Envelope (ADSR)</div>
            <Field label="Attack" value={instrument.attack} min={0} max={2} onChange={(v) => updateNoise({ attack: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Decay" value={instrument.decay} min={0} max={2} onChange={(v) => updateNoise({ decay: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Sustain" value={instrument.sustain} min={0} max={1} onChange={(v) => updateNoise({ sustain: v })} />
            <Field label="Release" value={instrument.release} min={0} max={3} onChange={(v) => updateNoise({ release: v })} format={(v) => `${v.toFixed(2)}s`} />
          </div>
        </div>
      )}

      {instrument.kind === 'additive' && (
        <div className="instrument-editor-body scroll">
          <div className="synth-section">
            <div className="synth-section-title">Harmonic Rig — Drawbars</div>
            {instrument.harmonicLevels.map((level, i) => (
              <Field key={i} label={`H${i + 1}`} value={level} min={0} max={1} onChange={(v) => updateHarmonicLevel(i, v)} />
            ))}
          </div>
          <div className="synth-section">
            <div className="synth-section-title">Envelope (ADSR)</div>
            <Field label="Attack" value={instrument.attack} min={0} max={2} onChange={(v) => updateAdditive({ attack: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Decay" value={instrument.decay} min={0} max={2} onChange={(v) => updateAdditive({ decay: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Sustain" value={instrument.sustain} min={0} max={1} onChange={(v) => updateAdditive({ sustain: v })} />
            <Field label="Release" value={instrument.release} min={0} max={3} onChange={(v) => updateAdditive({ release: v })} format={(v) => `${v.toFixed(2)}s`} />
          </div>
        </div>
      )}

      {instrument.kind === 'pluck' && (
        <div className="instrument-editor-body scroll">
          <div className="synth-section">
            <div className="synth-section-title">Pluck Rig</div>
            <Field label="Damping" value={instrument.damping} min={0} max={1} onChange={(v) => updatePluck({ damping: v })} />
            <Field label="Brightness" value={instrument.brightness} min={0} max={1} onChange={(v) => updatePluck({ brightness: v })} />
            <Field label="Decay" value={instrument.decaySeconds} min={0.1} max={6} onChange={(v) => updatePluck({ decaySeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Pick Position" value={instrument.pickPosition} min={0} max={1} onChange={(v) => updatePluck({ pickPosition: v })} />
          </div>
        </div>
      )}

      {instrument.kind === 'sampler' && (
        <div className="instrument-editor-body scroll">
          <div className="synth-section">
            <div className="synth-section-title">Source</div>
            {instrument.source.type === 'generator' && (
              <div className="field-row">
                <label>Drum sound</label>
                <select
                  className="themed"
                  value={instrument.source.generatorId}
                  onChange={(e) => updateSampler({ source: { type: 'generator', generatorId: e.target.value as DrumGeneratorId } })}
                >
                  {DEFAULT_DRUM_KIT.map((d) => (
                    <option key={d.generatorId} value={d.generatorId}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {instrument.source.type === 'sample' && (
              <div className="field-row">
                <label>Sample</label>
                <span className="value sample-name">{channel.name}</span>
              </div>
            )}
            {instrument.source.type === 'slice' && (
              <>
                <div className="field-row">
                  <label>Slice Deck</label>
                  <span className="value sample-name">{channel.name}</span>
                </div>
                <Field
                  label="Slices"
                  value={instrument.source.sliceCount}
                  min={2}
                  max={32}
                  step={1}
                  onChange={(v) => updateSliceCount(Math.round(v))}
                  format={(v) => v.toFixed(0)}
                />
                <div className="field-row">
                  <label>Base note</label>
                  <span className="value">piano roll C3 = slice 1</span>
                </div>
              </>
            )}
            {window.beatForge && (
              <button className="btn small" onClick={handleImportSample}>
                Import Sample…
              </button>
            )}
          </div>

          <div className="synth-section">
            <div className="synth-section-title">Shape</div>
            <Field label="Gain" value={instrument.gain} min={0} max={2} onChange={(v) => updateSampler({ gain: v })} />
            <Field label="Pan" value={instrument.pan} min={-1} max={1} onChange={(v) => updateSampler({ pan: v })} />
            <Field label="Pitch" value={instrument.pitchSemitones} min={-24} max={24} step={1} onChange={(v) => updateSampler({ pitchSemitones: v })} format={(v) => `${v.toFixed(0)}st`} />
          </div>

          <div className="synth-section">
            <div className="synth-section-title">Envelope (ADSR)</div>
            <Field label="Attack" value={instrument.attack} min={0} max={2} onChange={(v) => updateSampler({ attack: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Decay" value={instrument.decay} min={0} max={2} onChange={(v) => updateSampler({ decay: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Sustain" value={instrument.sustain} min={0} max={1} onChange={(v) => updateSampler({ sustain: v })} />
            <Field label="Release" value={instrument.release} min={0} max={3} onChange={(v) => updateSampler({ release: v })} format={(v) => `${v.toFixed(2)}s`} />
            <div className="field-row">
              <label>Loop</label>
              <input type="checkbox" checked={instrument.loop} onChange={(e) => updateSampler({ loop: e.target.checked })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
