import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useProjectStore } from '@/state/store';
import type { AutomationLane, AutomationTarget, PlaylistBlock } from '@/types/project';
import './Playlist.css';

const BAR_WIDTH = 28;
const TRACK_HEIGHT = 36;
const AUTOMATION_HEIGHT = 50;
const MIN_VISIBLE_BARS = 48;

function laneValueRange(target: AutomationTarget): { min: number; max: number } {
  return target.kind === 'mixerVolume' ? { min: 0, max: 1 } : { min: -1, max: 1 };
}

function valueToY(target: AutomationTarget, value: number, height: number): number {
  const { min, max } = laneValueRange(target);
  const normalized = (value - min) / (max - min);
  return height - normalized * height;
}

function yToValue(target: AutomationTarget, y: number, height: number): number {
  const { min, max } = laneValueRange(target);
  const normalized = Math.max(0, Math.min(1, 1 - y / height));
  return min + normalized * (max - min);
}

export function Playlist(): JSX.Element {
  const playlistTracks = useProjectStore((s) => s.playlistTracks);
  const playlistBlocks = useProjectStore((s) => s.playlistBlocks);
  const patterns = useProjectStore((s) => s.patterns);
  const mixerTracks = useProjectStore((s) => s.mixerTracks);
  const automationLanes = useProjectStore((s) => s.automationLanes);
  const transport = useProjectStore((s) => s.transport);
  const addPlaylistTrack = useProjectStore((s) => s.addPlaylistTrack);
  const removePlaylistTrack = useProjectStore((s) => s.removePlaylistTrack);
  const toggleMutePlaylistTrack = useProjectStore((s) => s.toggleMutePlaylistTrack);
  const addPlaylistBlock = useProjectStore((s) => s.addPlaylistBlock);
  const moveBlock = useProjectStore((s) => s.moveBlock);
  const resizeBlock = useProjectStore((s) => s.resizeBlock);
  const removeBlock = useProjectStore((s) => s.removeBlock);
  const addAutomationLane = useProjectStore((s) => s.addAutomationLane);
  const removeAutomationLane = useProjectStore((s) => s.removeAutomationLane);
  const addAutomationPoint = useProjectStore((s) => s.addAutomationPoint);
  const updateAutomationPoint = useProjectStore((s) => s.updateAutomationPoint);
  const removeAutomationPoint = useProjectStore((s) => s.removeAutomationPoint);

  const [patternToPlace, setPatternToPlace] = useState<string>(patterns[0]?.id ?? '');
  const [showAutomationMenu, setShowAutomationMenu] = useState(false);
  const [dragState, setDragState] = useState<{ blockId: string; mode: 'move' | 'resize'; startX: number; startBar: number; startLength: number } | null>(null);
  const [pointDrag, setPointDrag] = useState<{
    laneId: string;
    pointId: string;
    startX: number;
    startY: number;
    startBar: number;
    startValue: number;
    target: AutomationTarget;
  } | null>(null);
  const dragRef = useRef(dragState);
  dragRef.current = dragState;
  const pointDragRef = useRef(pointDrag);
  pointDragRef.current = pointDrag;

  useEffect(() => {
    if (!patternToPlace && patterns[0]) setPatternToPlace(patterns[0].id);
  }, [patterns, patternToPlace]);

  useEffect(() => {
    const handleMove = (e: MouseEvent): void => {
      const drag = dragRef.current;
      if (drag) {
        const deltaBars = Math.round((e.clientX - drag.startX) / BAR_WIDTH);
        if (drag.mode === 'move') {
          moveBlock(drag.blockId, blockTrackIdRef.current[drag.blockId], drag.startBar + deltaBars);
        } else {
          resizeBlock(drag.blockId, drag.startLength + deltaBars);
        }
      }
      const pd = pointDragRef.current;
      if (pd) {
        const deltaBar = (e.clientX - pd.startX) / BAR_WIDTH;
        const deltaY = e.clientY - pd.startY;
        const nextBar = Math.max(0, Math.round((pd.startBar + deltaBar) * 4) / 4);
        const range = laneValueRange(pd.target);
        const valuePerPixel = (range.max - range.min) / AUTOMATION_HEIGHT;
        const nextValue = Math.max(range.min, Math.min(range.max, pd.startValue - deltaY * valuePerPixel));
        updateAutomationPoint(pd.laneId, pd.pointId, { bar: nextBar, value: nextValue });
      }
    };
    const handleUp = (): void => {
      setDragState(null);
      setPointDrag(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [moveBlock, resizeBlock, updateAutomationPoint]);

  const blockTrackIdRef = useRef<Record<string, string>>({});
  for (const b of playlistBlocks) blockTrackIdRef.current[b.id] = b.trackId;

  const maxBar = useMemo(
    () =>
      Math.max(
        MIN_VISIBLE_BARS,
        ...playlistBlocks.map((b) => b.startBar + b.lengthBars + 8),
        ...automationLanes.flatMap((l) => l.points.map((p) => p.bar + 8)),
      ),
    [playlistBlocks, automationLanes],
  );

  const patternById = useMemo(() => new Map(patterns.map((p) => [p.id, p])), [patterns]);

  const blocksByTrack = useMemo(() => {
    const map = new Map<string, PlaylistBlock[]>();
    for (const track of playlistTracks) map.set(track.id, []);
    for (const block of playlistBlocks) map.get(block.trackId)?.push(block);
    return map;
  }, [playlistTracks, playlistBlocks]);

  const handleLaneClick = (trackId: string, barIndex: number): void => {
    if (!patternToPlace) return;
    const pattern = patternById.get(patternToPlace);
    if (!pattern) return;
    const lengthBars = Math.max(1, Math.ceil(pattern.lengthSteps / 16));
    addPlaylistBlock(trackId, patternToPlace, barIndex, lengthBars);
  };

  const startMove = (block: PlaylistBlock, e: ReactMouseEvent): void => {
    e.stopPropagation();
    setDragState({ blockId: block.id, mode: 'move', startX: e.clientX, startBar: block.startBar, startLength: block.lengthBars });
  };

  const startResize = (block: PlaylistBlock, e: ReactMouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({ blockId: block.id, mode: 'resize', startX: e.clientX, startBar: block.startBar, startLength: block.lengthBars });
  };

  const handleAddAutomationLane = (mixerTrackId: string, kind: 'mixerVolume' | 'mixerPan'): void => {
    const track = mixerTracks.find((t) => t.id === mixerTrackId);
    const name = `${track?.name ?? 'Track'} ${kind === 'mixerVolume' ? 'Volume' : 'Pan'}`;
    addAutomationLane({ kind, mixerTrackId }, name);
    setShowAutomationMenu(false);
  };

  const handleAutomationLaneClick = (lane: AutomationLane, e: ReactMouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const bar = Math.max(0, Math.round(((e.clientX - rect.left) / BAR_WIDTH) * 4) / 4);
    const value = yToValue(lane.target, e.clientY - rect.top, AUTOMATION_HEIGHT);
    addAutomationPoint(lane.id, bar, value);
  };

  const startPointDrag = (lane: AutomationLane, pointId: string, bar: number, value: number, e: ReactMouseEvent): void => {
    e.stopPropagation();
    setPointDrag({ laneId: lane.id, pointId, startX: e.clientX, startY: e.clientY, startBar: bar, startValue: value, target: lane.target });
  };

  const playheadX = transport.playMode === 'song' && transport.isPlaying ? (transport.currentBar + transport.currentStep / 16) * BAR_WIDTH : -1;

  return (
    <div className="playlist">
      <div className="playlist-toolbar">
        <label>Pattern to place</label>
        <select className="themed" value={patternToPlace} onChange={(e) => setPatternToPlace(e.target.value)}>
          {patterns.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="playlist-hint">Click a lane to place · drag to move · drag right edge to resize · double-click to remove</span>
        <div className="playlist-spacer" />
        <div className="automation-add-wrap">
          <button className="btn small" onClick={() => setShowAutomationMenu((v) => !v)}>
            + Automation Lane
          </button>
          {showAutomationMenu && (
            <div className="add-menu panel automation-add-menu">
              {mixerTracks.map((track) => (
                <div key={track.id} className="automation-add-col">
                  <div className="add-menu-title">{track.name}</div>
                  <button className="add-menu-item" onClick={() => handleAddAutomationLane(track.id, 'mixerVolume')}>
                    Volume
                  </button>
                  <button className="add-menu-item" onClick={() => handleAddAutomationLane(track.id, 'mixerPan')}>
                    Pan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn small" onClick={() => addPlaylistTrack()}>
          + Track
        </button>
      </div>

      <div className="playlist-body scroll">
        <div className="playlist-grid" style={{ width: maxBar * BAR_WIDTH + 140 }}>
          {playlistTracks.map((track) => (
            <div className="playlist-row" key={track.id}>
              <div className="playlist-track-header">
                <button className={`icon-btn ${track.muted ? 'active' : ''}`} onClick={() => toggleMutePlaylistTrack(track.id)}>
                  M
                </button>
                <span className="track-name">{track.name}</span>
                <button className="icon-btn" onClick={() => removePlaylistTrack(track.id)}>
                  ×
                </button>
              </div>
              <div className="playlist-lane" style={{ width: maxBar * BAR_WIDTH, height: TRACK_HEIGHT }}>
                {Array.from({ length: maxBar }, (_, barIndex) => (
                  <button
                    key={barIndex}
                    className={`lane-cell ${barIndex % 4 === 0 ? 'bar-marker' : ''}`}
                    style={{ width: BAR_WIDTH, height: TRACK_HEIGHT }}
                    onClick={() => handleLaneClick(track.id, barIndex)}
                  />
                ))}
                {(blocksByTrack.get(track.id) ?? []).map((block) => {
                  const pattern = patternById.get(block.patternId);
                  return (
                    <div
                      key={block.id}
                      className="playlist-block"
                      style={{ left: block.startBar * BAR_WIDTH, width: block.lengthBars * BAR_WIDTH - 2, height: TRACK_HEIGHT - 6 }}
                      onMouseDown={(e) => startMove(block, e)}
                      onDoubleClick={() => removeBlock(block.id)}
                    >
                      <span className="playlist-block-label">{pattern?.name ?? '—'}</span>
                      <div className="playlist-block-resize" onMouseDown={(e) => startResize(block, e)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {playheadX >= 0 && <div className="playlist-playhead" style={{ left: playheadX + 140 }} />}

          {automationLanes.map((lane) => {
            const sortedPoints = lane.points;
            const polylinePoints = sortedPoints.map((p) => `${p.bar * BAR_WIDTH},${valueToY(lane.target, p.value, AUTOMATION_HEIGHT)}`).join(' ');
            return (
              <div className="playlist-row automation-row" key={lane.id}>
                <div className="playlist-track-header">
                  <span className="track-name">{lane.name}</span>
                  <button className="icon-btn" onClick={() => removeAutomationLane(lane.id)}>
                    ×
                  </button>
                </div>
                <div
                  className="automation-lane"
                  style={{ width: maxBar * BAR_WIDTH, height: AUTOMATION_HEIGHT }}
                  onClick={(e) => handleAutomationLaneClick(lane, e)}
                >
                  {sortedPoints.length >= 2 && (
                    <svg className="automation-svg" width={maxBar * BAR_WIDTH} height={AUTOMATION_HEIGHT}>
                      <polyline points={polylinePoints} fill="none" stroke="#00d9c0" strokeWidth={2} />
                    </svg>
                  )}
                  {sortedPoints.map((p) => (
                    <div
                      key={p.id}
                      className="automation-point"
                      style={{ left: p.bar * BAR_WIDTH - 5, top: valueToY(lane.target, p.value, AUTOMATION_HEIGHT) - 5 }}
                      onMouseDown={(e) => startPointDrag(lane, p.id, p.bar, p.value, e)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        removeAutomationPoint(lane.id, p.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
