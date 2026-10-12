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

  const update = (params: InsertEffectParams): void => updateInsert(trackId, insertId, { params });

  return (
    <div className="insert-editor panel">
      <div className="insert-editor-header">
        <span>{insert.params.type.toUpperCase()}</span>
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
        {insert.params.type === 'eq3' && (
          <>
            <Field label="Low" value={insert.params.lowGainDb} min={-24} max={24} onChange={(v) => update({ ...insert.params, lowGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="Mid" value={insert.params.midGainDb} min={-24} max={24} onChange={(v) => update({ ...insert.params, midGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="High" value={insert.params.highGainDb} min={-24} max={24} onChange={(v) => update({ ...insert.params, highGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
          </>
        )}
        {insert.params.type === 'delay' && (
          <>
            <Field label="Time" value={insert.params.timeSeconds} min={0.01} max={1.5} onChange={(v) => update({ ...insert.params, timeSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Feedback" value={insert.params.feedback} min={0} max={0.95} onChange={(v) => update({ ...insert.params, feedback: v })} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'reverb' && (
          <>
            <Field label="Decay" value={insert.params.decaySeconds} min={0.1} max={6} onChange={(v) => update({ ...insert.params, decaySeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'distortion' && (
          <>
            <Field label="Drive" value={insert.params.drive} min={0} max={1} onChange={(v) => update({ ...insert.params, drive: v })} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'limiter' && (
          <>
            <Field label="Threshold" value={insert.params.thresholdDb} min={-40} max={0} onChange={(v) => update({ ...insert.params, thresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="Release" value={insert.params.releaseSeconds} min={0.01} max={1} onChange={(v) => update({ ...insert.params, releaseSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
          </>
        )}
        {insert.params.type === 'parametric_eq' && (
          <>
            {insert.params.bands.map((band, i) => (
              <div key={i} className="eq-band">
                <div className="eq-band-title">Band {i + 1}</div>
                <div className="field-row">
                  <label>Type</label>
                  <select
                    className="themed"
                    value={band.filterType}
                    onChange={(e) => {
                      if (insert.params.type !== 'parametric_eq') return;
                      const bands = [...insert.params.bands] as typeof insert.params.bands;
                      bands[i] = { ...band, filterType: e.target.value as typeof band.filterType };
                      update({ ...insert.params, bands });
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
                    if (insert.params.type !== 'parametric_eq') return;
                    const bands = [...insert.params.bands] as typeof insert.params.bands;
                    bands[i] = { ...band, freqHz: v };
                    update({ ...insert.params, bands });
                  }}
                  format={(v) => `${v.toFixed(0)}Hz`}
                />
                <Field
                  label="Gain"
                  value={band.gainDb}
                  min={-24}
                  max={24}
                  onChange={(v) => {
                    if (insert.params.type !== 'parametric_eq') return;
                    const bands = [...insert.params.bands] as typeof insert.params.bands;
                    bands[i] = { ...band, gainDb: v };
                    update({ ...insert.params, bands });
                  }}
                  format={(v) => `${v.toFixed(1)}dB`}
                />
                <Field
                  label="Q"
                  value={band.q}
                  min={0.1}
                  max={10}
                  onChange={(v) => {
                    if (insert.params.type !== 'parametric_eq') return;
                    const bands = [...insert.params.bands] as typeof insert.params.bands;
                    bands[i] = { ...band, q: v };
                    update({ ...insert.params, bands });
                  }}
                />
              </div>
            ))}
          </>
        )}
        {insert.params.type === 'chorus' && (
          <>
            <Field label="Rate" value={insert.params.rateHz} min={0.05} max={8} onChange={(v) => update({ ...insert.params, rateHz: v })} format={(v) => `${v.toFixed(2)}Hz`} />
            <Field label="Depth" value={insert.params.depthMs} min={0.5} max={20} onChange={(v) => update({ ...insert.params, depthMs: v })} format={(v) => `${v.toFixed(1)}ms`} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'phaser' && (
          <>
            <Field label="Rate" value={insert.params.rateHz} min={0.05} max={5} onChange={(v) => update({ ...insert.params, rateHz: v })} format={(v) => `${v.toFixed(2)}Hz`} />
            <Field label="Depth" value={insert.params.depth} min={0} max={1} onChange={(v) => update({ ...insert.params, depth: v })} />
            <Field label="Feedback" value={insert.params.feedback} min={0} max={0.9} onChange={(v) => update({ ...insert.params, feedback: v })} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'bitcrusher' && (
          <>
            <Field label="Bit Depth" value={insert.params.bitDepth} min={1} max={16} step={1} onChange={(v) => update({ ...insert.params, bitDepth: Math.round(v) })} format={(v) => v.toFixed(0)} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'stereo_widener' && (
          <Field label="Width" value={insert.params.width} min={0} max={2} onChange={(v) => update({ ...insert.params, width: v })} />
        )}
        {insert.params.type === 'compressor' && (
          <>
            <Field label="Threshold" value={insert.params.thresholdDb} min={-60} max={0} onChange={(v) => update({ ...insert.params, thresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
            <Field label="Ratio" value={insert.params.ratio} min={1} max={20} onChange={(v) => update({ ...insert.params, ratio: v })} format={(v) => `${v.toFixed(1)}:1`} />
            <Field label="Attack" value={insert.params.attackSeconds} min={0.001} max={0.5} onChange={(v) => update({ ...insert.params, attackSeconds: v })} format={(v) => `${(v * 1000).toFixed(0)}ms`} />
            <Field label="Release" value={insert.params.releaseSeconds} min={0.01} max={1} onChange={(v) => update({ ...insert.params, releaseSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Makeup" value={insert.params.makeupGainDb} min={0} max={24} onChange={(v) => update({ ...insert.params, makeupGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
          </>
        )}
        {insert.params.type === 'flanger' && (
          <>
            <Field label="Rate" value={insert.params.rateHz} min={0.05} max={3} onChange={(v) => update({ ...insert.params, rateHz: v })} format={(v) => `${v.toFixed(2)}Hz`} />
            <Field label="Depth" value={insert.params.depthMs} min={0.2} max={10} onChange={(v) => update({ ...insert.params, depthMs: v })} format={(v) => `${v.toFixed(1)}ms`} />
            <Field label="Feedback" value={insert.params.feedback} min={0} max={0.9} onChange={(v) => update({ ...insert.params, feedback: v })} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'tremolo' && (
          <>
            <Field label="Rate" value={insert.params.rateHz} min={0.5} max={20} onChange={(v) => update({ ...insert.params, rateHz: v })} format={(v) => `${v.toFixed(1)}Hz`} />
            <Field label="Depth" value={insert.params.depth} min={0} max={1} onChange={(v) => update({ ...insert.params, depth: v })} />
          </>
        )}
        {insert.params.type === 'autopan' && (
          <>
            <Field label="Rate" value={insert.params.rateHz} min={0.1} max={10} onChange={(v) => update({ ...insert.params, rateHz: v })} format={(v) => `${v.toFixed(1)}Hz`} />
            <Field label="Depth" value={insert.params.depth} min={0} max={1} onChange={(v) => update({ ...insert.params, depth: v })} />
          </>
        )}
        {insert.params.type === 'gate' && (
          <Field label="Threshold" value={insert.params.thresholdDb} min={-80} max={0} onChange={(v) => update({ ...insert.params, thresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
        )}
        {insert.params.type === 'saturator' && (
          <>
            <Field label="Drive" value={insert.params.drive} min={0} max={1} onChange={(v) => update({ ...insert.params, drive: v })} />
            <Field label="Warmth" value={insert.params.warmth} min={0} max={1} onChange={(v) => update({ ...insert.params, warmth: v })} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'pingpong_delay' && (
          <>
            <Field label="Time" value={insert.params.timeSeconds} min={0.01} max={1.2} onChange={(v) => update({ ...insert.params, timeSeconds: v })} format={(v) => `${v.toFixed(2)}s`} />
            <Field label="Feedback" value={insert.params.feedback} min={0} max={0.95} onChange={(v) => update({ ...insert.params, feedback: v })} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'ringmod' && (
          <>
            <Field label="Frequency" value={insert.params.frequencyHz} min={20} max={4000} onChange={(v) => update({ ...insert.params, frequencyHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Mix" value={insert.params.mix} min={0} max={1} onChange={(v) => update({ ...insert.params, mix: v })} />
          </>
        )}
        {insert.params.type === 'multiband_compressor' && (
          <>
            <Field label="Low/Mid X" value={insert.params.lowCrossoverHz} min={40} max={1000} onChange={(v) => update({ ...insert.params, lowCrossoverHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <Field label="Mid/High X" value={insert.params.highCrossoverHz} min={1000} max={10000} onChange={(v) => update({ ...insert.params, highCrossoverHz: v })} format={(v) => `${v.toFixed(0)}Hz`} />
            <div className="eq-band">
              <div className="eq-band-title">Low band</div>
              <Field label="Threshold" value={insert.params.lowThresholdDb} min={-60} max={0} onChange={(v) => update({ ...insert.params, lowThresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
              <Field label="Ratio" value={insert.params.lowRatio} min={1} max={20} onChange={(v) => update({ ...insert.params, lowRatio: v })} format={(v) => `${v.toFixed(1)}:1`} />
            </div>
            <div className="eq-band">
              <div className="eq-band-title">Mid band</div>
              <Field label="Threshold" value={insert.params.midThresholdDb} min={-60} max={0} onChange={(v) => update({ ...insert.params, midThresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
              <Field label="Ratio" value={insert.params.midRatio} min={1} max={20} onChange={(v) => update({ ...insert.params, midRatio: v })} format={(v) => `${v.toFixed(1)}:1`} />
            </div>
            <div className="eq-band">
              <div className="eq-band-title">High band</div>
              <Field label="Threshold" value={insert.params.highThresholdDb} min={-60} max={0} onChange={(v) => update({ ...insert.params, highThresholdDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
              <Field label="Ratio" value={insert.params.highRatio} min={1} max={20} onChange={(v) => update({ ...insert.params, highRatio: v })} format={(v) => `${v.toFixed(1)}:1`} />
            </div>
            <Field label="Makeup" value={insert.params.makeupGainDb} min={0} max={24} onChange={(v) => update({ ...insert.params, makeupGainDb: v })} format={(v) => `${v.toFixed(1)}dB`} />
          </>
        )}
      </div>
    </div>
  );
}
