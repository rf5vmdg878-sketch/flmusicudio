import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useProjectStore } from '@/state/store';
import type { PlaylistBlock } from '@/types/project';
import './Playlist.css';

const BAR_WIDTH = 28;
const TRACK_HEIGHT = 36;
const MIN_VISIBLE_BARS = 48;

export function Playlist(): JSX.Element {
  const playlistTracks = useProjectStore((s) => s.playlistTracks);
  const playlistBlocks = useProjectStore((s) => s.playlistBlocks);
  const patterns = useProjectStore((s) => s.patterns);
  const transport = useProjectStore((s) => s.transport);
  const addPlaylistTrack = useProjectStore((s) => s.addPlaylistTrack);
  const removePlaylistTrack = useProjectStore((s) => s.removePlaylistTrack);
  const toggleMutePlaylistTrack = useProjectStore((s) => s.toggleMutePlaylistTrack);
  const addPlaylistBlock = useProjectStore((s) => s.addPlaylistBlock);
  const moveBlock = useProjectStore((s) => s.moveBlock);
  const resizeBlock = useProjectStore((s) => s.resizeBlock);
  const removeBlock = useProjectStore((s) => s.removeBlock);

  const [patternToPlace, setPatternToPlace] = useState<string>(patterns[0]?.id ?? '');
  const [dragState, setDragState] = useState<{ blockId: string; mode: 'move' | 'resize'; startX: number; startBar: number; startLength: number } | null>(null);
  const dragRef = useRef(dragState);
  dragRef.current = dragState;

  useEffect(() => {
    if (!patternToPlace && patterns[0]) setPatternToPlace(patterns[0].id);
  }, [patterns, patternToPlace]);

  useEffect(() => {
    const handleMove = (e: MouseEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaBars = Math.round((e.clientX - drag.startX) / BAR_WIDTH);
      if (drag.mode === 'move') {
        moveBlock(drag.blockId, blockTrackIdRef.current[drag.blockId], drag.startBar + deltaBars);
      } else {
        resizeBlock(drag.blockId, drag.startLength + deltaBars);
      }
    };
    const handleUp = (): void => setDragState(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [moveBlock, resizeBlock]);

  const blockTrackIdRef = useRef<Record<string, string>>({});
  for (const b of playlistBlocks) blockTrackIdRef.current[b.id] = b.trackId;

  const maxBar = useMemo(() => Math.max(MIN_VISIBLE_BARS, ...playlistBlocks.map((b) => b.startBar + b.lengthBars + 8)), [playlistBlocks]);

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
        </div>
      </div>
    </div>
  );
}
