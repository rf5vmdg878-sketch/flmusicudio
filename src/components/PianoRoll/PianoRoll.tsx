import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useProjectStore } from '@/state/store';
import { audioEngine } from '@/audio/AudioEngine';
import type { PianoRollNote } from '@/types/project';
import './PianoRoll.css';

const CELL_WIDTH = 24;
const ROW_HEIGHT = 16;
const PITCH_MIN = 36; // C2
const PITCH_MAX = 95; // B6
const DEFAULT_NOTE_LENGTH = 4;
const STEPS_PER_BEAT = 4;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function pitchName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  return `${NOTE_NAMES[pitch % 12]}${octave}`;
}

export function PianoRoll(): JSX.Element {
  const channels = useProjectStore((s) => s.channels);
  const patterns = useProjectStore((s) => s.patterns);
  const transport = useProjectStore((s) => s.transport);
  const selectedChannelId = useProjectStore((s) => s.selectedChannelId);
  const selectChannel = useProjectStore((s) => s.selectChannel);
  const addNote = useProjectStore((s) => s.addNote);
  const removeNote = useProjectStore((s) => s.removeNote);
  const updateNote = useProjectStore((s) => s.updateNote);

  const melodicChannels = useMemo(() => channels.filter((c) => c.isMelodic), [channels]);
  const activeChannelId = selectedChannelId && melodicChannels.some((c) => c.id === selectedChannelId) ? selectedChannelId : melodicChannels[0]?.id ?? null;

  const currentPatternId = transport.currentPatternId ?? patterns[0]?.id ?? null;
  const pattern = patterns.find((p) => p.id === currentPatternId);

  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; length: number } | null>(null);

  useEffect(() => {
    if (!dragNoteId || !pattern || !activeChannelId) return;
    const handleMove = (e: MouseEvent): void => {
      if (!dragStartRef.current) return;
      const deltaSteps = Math.round((e.clientX - dragStartRef.current.x) / CELL_WIDTH);
      const nextLength = Math.max(1, dragStartRef.current.length + deltaSteps);
      updateNote(pattern.id, activeChannelId, dragNoteId, { lengthSteps: nextLength });
    };
    const handleUp = (): void => {
      setDragNoteId(null);
      dragStartRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragNoteId, pattern, activeChannelId, updateNote]);

  if (!pattern) return <div className="piano-roll empty">No pattern selected.</div>;
  if (!activeChannelId) {
    return (
      <div className="piano-roll empty">
        Add or select a synth channel in the Channel Rack to edit its melody here.
      </div>
    );
  }

  const notes = pattern.notesByChannel[activeChannelId] ?? [];
  const pitches: number[] = [];
  for (let p = PITCH_MAX; p >= PITCH_MIN; p--) pitches.push(p);

  const activeStep = transport.playMode === 'pattern' && transport.isPlaying ? transport.currentStep % pattern.lengthSteps : -1;

  const handleCellClick = (pitch: number, step: number): void => {
    addNote(pattern.id, activeChannelId, { pitch, startStep: step, lengthSteps: DEFAULT_NOTE_LENGTH, velocity: 0.9 });
    audioEngine.previewChannel(activeChannelId, 0.9, 0.3, pitch);
  };

  const handleNoteClick = (note: PianoRollNote, e: MouseEvent): void => {
    e.stopPropagation();
    removeNote(pattern.id, activeChannelId, note.id);
  };

  const startResize = (note: PianoRollNote, e: MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    setDragNoteId(note.id);
    dragStartRef.current = { x: e.clientX, length: note.lengthSteps };
  };

  const gridWidth = pattern.lengthSteps * CELL_WIDTH;
  const gridHeight = pitches.length * ROW_HEIGHT;

  return (
    <div className="piano-roll">
      <div className="piano-roll-toolbar">
        <select className="themed" value={activeChannelId} onChange={(e) => selectChannel(e.target.value)}>
          {melodicChannels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="piano-roll-hint">Click grid to add a note · Click a note to delete · Drag right edge to resize</span>
      </div>

      <div className="piano-roll-scroll scroll">
        <div className="piano-roll-layout" style={{ width: gridWidth + 48 }}>
          <div className="keyboard" style={{ height: gridHeight }}>
            {pitches.map((pitch) => (
              <div key={pitch} className={`key ${pitch % 12 === 0 ? 'c-key' : ''} ${[1, 3, 6, 8, 10].includes(pitch % 12) ? 'black' : 'white'}`} style={{ height: ROW_HEIGHT }}>
                {pitch % 12 === 0 ? pitchName(pitch) : ''}
              </div>
            ))}
          </div>

          <div className="grid-area" style={{ width: gridWidth, height: gridHeight }}>
            {pitches.map((pitch, rowIndex) => (
              <div key={pitch} className={`grid-row ${pitch % 12 === 0 ? 'c-row' : ''}`} style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, width: gridWidth }}>
                {Array.from({ length: pattern.lengthSteps }, (_, step) => (
                  <button
                    key={step}
                    className={`grid-cell ${step === activeStep ? 'playing' : ''} ${step % STEPS_PER_BEAT === 0 ? 'beat' : ''}`}
                    style={{ width: CELL_WIDTH, height: ROW_HEIGHT }}
                    onClick={() => handleCellClick(pitch, step)}
                  />
                ))}
              </div>
            ))}

            {notes.map((note) => {
              const rowIndex = PITCH_MAX - note.pitch;
              if (rowIndex < 0 || rowIndex >= pitches.length) return null;
              return (
                <div
                  key={note.id}
                  className="note-block"
                  style={{
                    left: note.startStep * CELL_WIDTH,
                    top: rowIndex * ROW_HEIGHT,
                    width: note.lengthSteps * CELL_WIDTH - 2,
                    height: ROW_HEIGHT - 2,
                    opacity: 0.55 + note.velocity * 0.45,
                  }}
                  onClick={(e) => handleNoteClick(note, e)}
                >
                  <div className="note-resize-handle" onMouseDown={(e) => startResize(note, e)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
