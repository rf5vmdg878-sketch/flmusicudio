import { useProjectStore } from '@/state/store';
import type { InsertEffectParams } from '@/types/project';
import './InsertEditor.css';

interface Props {
  trackId: string;
  insertId: string;
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

export function InsertEditor({ trackId, insertId, onClose }: Props): JSX.Element | null {
  const track = useProjectStore((s) => s.mixerTracks.find((t) => t.id === trackId));
  const updateInsert = useProjectStore((s) => s.updateInsert);
  const removeInsert = useProjectStore((s) => s.removeInsert);

  const insert = track?.inserts.find((i) => i.id === insertId);
  if (!track || !insert) return null;

  // Captured as a local const (rather than read as `insert.params` inline) so
  // TypeScript's discriminated-union narrowing below actually holds inside the
  // onChange closures — narrowing a nested property path like `insert.params.type`
  // does not survive across a function boundary, but narrowing a plain local
  // variable does.
  const params = insert.params;

  const update = (next: InsertEffectParams): void => updateInsert(trackId, insertId, { params: next });

  return (
    <div className="insert-editor panel">
      <div className="insert-editor-header">
        <span>{params.type.toUpperCase()}</span>
        <label className="insert-enable">
          <input type="checkbox" checked={insert.enabled} onChange={(e) => updateInsert(trackId, insertId, { enabled: e.target.checked })} /> On
        </label>
        <button
          className="icon-btn"
          onClick={() => {
            removeInsert(trackId, insertId);
            onClose();
          }}
        >
          ×
        </button>
      </div>
      <div className="insert-editor-body">
        {params.type === 'eq3' && (
          <>
            <Field label="Low" value={params.lowGainDb} min={-24} max={24} onChange={(v) => update({ ...params, lowGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="Mid" value={params.midGainDb} min={-24} max={24} onChange={(v) => update({ ...params, midGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="High" value={params.highGainDb} min={-24} max={24} onChange={(v) => update({ ...params, highGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
          </>
        )}
        {params.type === 'delay' && (
          <>
            <Field label="Time" value={params.timeSeconds} min={0.01} max={1.5} onChange={(v) => update({ ...params, timeSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Feedback" value={params.feedback} min={0} max={0.95} onChange={(v) => update({ ...params, feedback: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'reverb' && (
          <>
            <Field label="Decay" value={params.decaySeconds} min={0.1} max={6} onChange={(v) => update({ ...params, decaySeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'distortion' && (
          <>
            <Field label="Drive" value={params.drive} min={0} max={1} onChange={(v) => update({ ...params, drive: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'limiter' && (
          <>
            <Field label="Threshold" value={params.thresholdDb} min={-40} max={0} onChange={(v) => update({ ...params, thresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="Release" value={params.releaseSeconds} min={0.01} max={1} onChange={(v) => update({ ...params, releaseSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
          </>
        )}
        {params.type === 'parametric_eq' && (
          <>
            {params.bands.map((band, i) => (
              <div key={i} className="eq-band">
                <div className="eq-band-title">Band {i + 1}</div>
                <div className="field-row">
                  <label>Type</label>
                  <select
                    className="themed"
                    value={band.filterType}
                    onChange={(e) => {
                      if (params.type !== 'parametric_eq') return;
                      const bands = [...params.bands] as typeof params.bands;
                      bands[i] = { ...band, filterType: e.target.value as typeof band.filterType };
                      update({ ...params, bands });
                    }}
                  >
                    <option value="lowshelf">lowshelf</option>
                    <option value="peaking">peaking</option>
                    <option value="highshelf">highshelf</option>
                  </select>
                </div>
                <Field
                  label="Freq"
                  value={band.freqHz}
                  min={20}
                  max={16000}
                  step={10}
                  onChange={(v) => {
                    if (params.type !== 'parametric_eq') return;
                    const bands = [...params.bands] as typeof params.bands;
                    bands[i] = { ...band, freqHz: v };
                    update({ ...params, bands });
                  }}
                  format={(v) => `${v.toFixed(0)}Hz`}
                />
                <Field
                  label="Gain"
                  value={band.gainDb}
                  min={-24}
                  max={24}
                  onChange={(v) => {
                    if (params.type !== 'parametric_eq') return;
                    const bands = [...params.bands] as typeof params.bands;
                    bands[i] = { ...band, gainDb: v };
                    update({ ...params, bands });
                  }}
                  format={(v) => `${v.toFixed(1)}dB`}
                />
                <Field
                  label="Q"
                  value={band.q}
                  min={0.1}
                  max={10}
                  onChange={(v) => {
                    if (params.type !== 'parametric_eq') return;
                    const bands = [...params.bands] as typeof params.bands;
                    bands[i] = { ...band, q: v };
                    update({ ...params, bands });
                  }}
                />
              </div>
            ))}
          </>
        )}
        {params.type === 'chorus' && (
          <>
            <Field label="Rate" value={params.rateHz} min={0.05} max={8} onChange={(v) => update({ ...params, rateHz: v })} format={(v) => `${v.toFixed(2)}Hz`} />
            <Field label="Depth" value={params.depthMs} min={0.5} max={20} onChange={(v) => update({ ...params, depthMs: v })} format={(v) => `${v.toFixed(1)}ms`} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'phaser' && (
          <>
            <Field label="Rate" value={params.rateHz} min={0.05} max={5} onChange={(v) => update({ ...params, rateHz: v })} format={(v) => `${v.toFixed(2)}Hz`} />
            <Field label="Depth" value={params.depth} min={0} max={1} onChange={(v) => update({ ...params, depth: v })} />
            <Field label="Feedback" value={params.feedback} min={0} max={0.9} onChange={(v) => update({ ...params, feedback: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'bitcrusher' && (
          <>
            <Field label="Bit Depth" value={params.bitDepth} min={1} max={16} step={1} onChange={(v) => update({ ...params, bitDepth: Math.round(v) })} format={(v) => v.toFixed(0)} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'stereo_widener' && (
          <Field label="Width" value={params.width} min={0} max={2} onChange={(v) => update({ ...params, width: v })} />
        )}
        {params.type === 'compressor' && (
          <>
            <Field label="Threshold" value={params.thresholdDb} min={-60} max={0} onChange={(v) => update({ ...params, thresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="Ratio" value={params.ratio} min={1} max={20} onChange={(v) => update({ ...params, ratio: v })} format={(v) => `${v.toFixed(1)}:1`} />
            <Field label="Attack" value={params.attackSeconds} min={0.001} max={0.5} onChange={(v) => update({ ...params, attackSeconds: v })} format={(v) => `${(v * 1000).toFixed(0)}ms`} />
            <Field label="Release" value={params.releaseSeconds} min={0.01} max={1} onChange={(v) => update({ ...params, releaseSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Makeup" value={params.makeupGainDb} min={0} max={24} onChange={(v) => update({ ...params, makeupGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
          </>
        )}
        {params.type === 'flanger' && (
          <>
            <Field label="Rate" value={params.rateHz} min={0.05} max={3} onChange={(v) => update({ ...params, rateHz: v })} format={(v) => `${v.toFixed(2)}Hz`} />
            <Field label="Depth" value={params.depthMs} min={0.2} max={10} onChange={(v) => update({ ...params, depthMs: v })} format={(v) => `${v.toFixed(1)}ms`} />
            <Field label="Feedback" value={params.feedback} min={0} max={0.9} onChange={(v) => update({ ...params, feedback: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'tremolo' && (
          <>
            <Field label="Rate" value={params.rateHz} min={0.5} max={20} onChange={(v) => update({ ...params, rateHz: v })} format={(v) => `${v.toFixed(1)}Hz`} />
            <Field label="Depth" value={params.depth} min={0} max={1} onChange={(v) => update({ ...params, depth: v })} />
          </>
        )}
        {params.type === 'autopan' && (
          <>
            <Field label="Rate" value={params.rateHz} min={0.1} max={10} onChange={(v) => update({ ...params, rateHz: v })} format={(v) => `${v.toFixed(1)}Hz`} />
            <Field label="Depth" value={params.depth} min={0} max={1} onChange={(v) => update({ ...params, depth: v })} />
          </>
        )}
        {params.type === 'gate' && (
          <Field label="Threshold" value={params.thresholdDb} min={-80} max={0} onChange={(v) => update({ ...params, thresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
        )}
        {params.type === 'saturator' && (
          <>
            <Field label="Drive" value={params.drive} min={0} max={1} onChange={(v) => update({ ...params, drive: v })} />
            <Field label="Warmth" value={params.warmth} min={0} max={1} onChange={(v) => update({ ...params, warmth: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'pingpong_delay' && (
          <>
            <Field label="Time" value={params.timeSeconds} min={0.01} max={1.2} onChange={(v) => update({ ...params, timeSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Feedback" value={params.feedback} min={0} max={0.95} onChange={(v) => update({ ...params, feedback: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'ringmod' && (
          <>
            <Field label="Frequency" value={params.frequencyHz} min={20} max={4000} onChange={(v) => update({ ...params, frequencyHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'multiband_compressor' && (
          <>
            <Field label="Low/Mid X" value={params.lowCrossoverHz} min={40} max={1000} onChange={(v) => update({ ...params, lowCrossoverHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Mid/High X" value={params.highCrossoverHz} min={1000} max={10000} onChange={(v) => update({ ...params, highCrossoverHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <div className="eq-band">
              <div className="eq-band-title">Low band</div>
              <Field label="Threshold" value={params.lowThresholdDb} min={-60} max={0} onChange={(v) => update({ ...params, lowThresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
              <Field label="Ratio" value={params.lowRatio} min={1} max={20} onChange={(v) => update({ ...params, lowRatio: v })} format={(v) => `${v.toFixed(1)}:1`} />
            </div>
            <div className="eq-band">
              <div className="eq-band-title">Mid band</div>
              <Field label="Threshold" value={params.midThresholdDb} min={-60} max={0} onChange={(v) => update({ ...params, midThresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
              <Field label="Ratio" value={params.midRatio} min={1} max={20} onChange={(v) => update({ ...params, midRatio: v })} format={(v) => `${v.toFixed(1)}:1`} />
            </div>
            <div className="eq-band">
              <div className="eq-band-title">High band</div>
              <Field label="Threshold" value={params.highThresholdDb} min={-60} max={0} onChange={(v) => update({ ...params, highThresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
              <Field label="Ratio" value={params.highRatio} min={1} max={20} onChange={(v) => update({ ...params, highRatio: v })} format={(v) => `${v.toFixed(1)}:1`} />
            </div>
            <Field label="Makeup" value={params.makeupGainDb} min={0} max={24} onChange={(v) => update({ ...params, makeupGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
          </>
        )}
        {params.type === 'exciter' && (
          <>
            <Field label="Frequency" value={params.frequencyHz} min={500} max={10000} onChange={(v) => update({ ...params, frequencyHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Amount" value={params.amount} min={0} max={1} onChange={(v) => update({ ...params, amount: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'vinyl_warmth' && (
          <>
            <Field label="Warmth" value={params.warmth} min={0} max={1} onChange={(v) => update({ ...params, warmth: v })} />
            <Field label="Grit" value={params.grit} min={0} max={1} onChange={(v) => update({ ...params, grit: v })} />
            <Field label="Wobble" value={params.wobble} min={0} max={1} onChange={(v) => update({ ...params, wobble: v })} />
            <Field label="Noise" value={params.noiseLevel} min={0} max={1} onChange={(v) => update({ ...params, noiseLevel: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'stereo_delay' && (
          <>
            <Field label="Left Time" value={params.leftTimeSeconds} min={0.01} max={1.2} onChange={(v) => update({ ...params, leftTimeSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Right Time" value={params.rightTimeSeconds} min={0.01} max={1.2} onChange={(v) => update({ ...params, rightTimeSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Feedback" value={params.feedback} min={0} max={0.95} onChange={(v) => update({ ...params, feedback: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'resonator' && (
          <>
            <Field label="Frequency" value={params.frequencyHz} min={40} max={4000} onChange={(v) => update({ ...params, frequencyHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Resonance" value={params.resonance} min={0} max={0.98} onChange={(v) => update({ ...params, resonance: v })} />
            <Field label="Mix" value={params.mix} min={0} max={1} onChange={(v) => update({ ...params, mix: v })} />
          </>
        )}
        {params.type === 'de_esser' && (
          <>
            <Field label="Frequency" value={params.frequencyHz} min={2000} max={12000} onChange={(v) => update({ ...params, frequencyHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Threshold" value={params.thresholdDb} min={-60} max={0} onChange={(v) => update({ ...params, thresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="Ratio" value={params.ratio} min={1} max={20} onChange={(v) => update({ ...params, ratio: v })} format={(v) => `${v.toFixed(1)}:1`} />
          </>
        )}
        {params.type === 'transient_shaper' && (
          <>
            <Field label="Attack" value={params.attackSeconds} min={0.001} max={0.1} onChange={(v) => update({ ...params, attackSeconds: v })} format={(v) => `${(v * 1000).toFixed(0)}ms`} />
            <Field label="Release" value={params.releaseSeconds} min={0.01} max={0.5} onChange={(v) => update({ ...params, releaseSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Amount" value={params.amount} min={-1} max={1} onChange={(v) => update({ ...params, amount: v })} />
          </>
        )}
        {params.type === 'wah_sweep' && (
          <>
            <Field label="Rate" value={params.rateHz} min={0.1} max={10} onChange={(v) => update({ ...params, rateHz: v })} format={(v) => `${v.toFixed(1)}Hz`} />
            <Field label="Depth" value={params.depth} min={0} max={1} onChange={(v) => update({ ...params, depth: v })} />
            <Field label="Base Freq" value={params.baseFreqHz} min={200} max={3000} onChange={(v) => update({ ...params, baseFreqHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Resonance" value={params.resonance} min={0.5} max={15} onChange={(v) => update({ ...params, resonance: v })} />
          </>
        )}
      </div>
    </div>
  );
}
