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
      </div>
    </div>
  );
}
