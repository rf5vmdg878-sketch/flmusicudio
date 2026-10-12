import { useState } from 'react';
import { useProjectStore } from '@/state/store';
import { MASTER_TRACK_ID } from '@/state/defaultProject';
import { EFFECT_TYPES, defaultEffectParams } from '@/presets/effectDefaults';
import { InsertEditor } from './InsertEditor';
import './Mixer.css';

export function Mixer(): JSX.Element {
  const mixerTracks = useProjectStore((s) => s.mixerTracks);
  const setMixerVolume = useProjectStore((s) => s.setMixerVolume);
  const setMixerPan = useProjectStore((s) => s.setMixerPan);
  const toggleMixerMute = useProjectStore((s) => s.toggleMixerMute);
  const toggleMixerSolo = useProjectStore((s) => s.toggleMixerSolo);
  const addMixerTrack = useProjectStore((s) => s.addMixerTrack);
  const removeMixerTrack = useProjectStore((s) => s.removeMixerTrack);
  const addInsert = useProjectStore((s) => s.addInsert);

  const [openSlot, setOpenSlot] = useState<{ trackId: string; insertId: string } | null>(null);
  const [addMenuTrackId, setAddMenuTrackId] = useState<string | null>(null);

  return (
    <div className="mixer">
      <div className="mixer-strips scroll">
        {mixerTracks.map((track) => {
          const isMaster = track.id === MASTER_TRACK_ID;
          return (
            <div key={track.id} className={`mixer-strip ${isMaster ? 'master' : ''}`}>
              <div className="strip-name">{track.name}</div>

              <div className="strip-inserts">
                {track.inserts.map((insert) => (
                  <button
                    key={insert.id}
                    className={`insert-slot ${insert.enabled ? '' : 'disabled'} ${openSlot?.insertId === insert.id ? 'active' : ''}`}
                    onClick={() => setOpenSlot({ trackId: track.id, insertId: insert.id })}
                  >
                    {insert.params.type}
                  </button>
                ))}
                <div className="insert-add-wrap">
                  <button className="insert-slot empty" onClick={() => setAddMenuTrackId(addMenuTrackId === track.id ? null : track.id)}>
                    + fx
                  </button>
                  {addMenuTrackId === track.id && (
                    <div className="insert-add-menu panel">
                      {EFFECT_TYPES.map((et) => (
                        <button
                          key={et.type}
                          className="add-menu-item"
                          onClick={() => {
                            addInsert(track.id, defaultEffectParams(et.type));
                            setAddMenuTrackId(null);
                          }}
                        >
                          {et.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="strip-fader-row">
                <input
                  className="fader"
                  type="range"
                  min={0}
                  max={125}
                  value={Math.round(track.volume * 100)}
                  onChange={(e) => setMixerVolume(track.id, Number(e.target.value) / 100)}
                />
                <span className="fader-value">{Math.round(track.volume * 100)}</span>
              </div>

              <input
                className="slider strip-pan"
                type="range"
                min={-100}
                max={100}
                value={Math.round(track.pan * 100)}
                onChange={(e) => setMixerPan(track.id, Number(e.target.value) / 100)}
              />

              <div className="strip-buttons">
                <button className={`icon-btn ${track.muted ? 'active' : ''}`} onClick={() => toggleMixerMute(track.id)}>
                  M
                </button>
                {!isMaster && (
                  <button className={`icon-btn ${track.soloed ? 'active' : ''}`} onClick={() => toggleMixerSolo(track.id)}>
                    S
                  </button>
                )}
                {!isMaster && (
                  <button className="icon-btn" onClick={() => removeMixerTrack(track.id)}>
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="mixer-strip add-strip">
          <button className="btn small" onClick={() => addMixerTrack()}>
            + Insert Track
          </button>
        </div>
      </div>

      {openSlot && <InsertEditor trackId={openSlot.trackId} insertId={openSlot.insertId} onClose={() => setOpenSlot(null)} />}
    </div>
  );
}
