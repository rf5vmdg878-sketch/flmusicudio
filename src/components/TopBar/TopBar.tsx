import { useState } from 'react';
import { useProjectStore } from '@/state/store';
import { audioEngine } from '@/audio/AudioEngine';
import { renderProjectToWav } from '@/audio/export/renderToWav';
import './TopBar.css';

function downloadBlobFallback(filename: string, buffer: ArrayBuffer, mime: string): void {
  const blob = new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TopBar(): JSX.Element {
  const transport = useProjectStore((s) => s.transport);
  const projectName = useProjectStore((s) => s.projectName);
  const setBpm = useProjectStore((s) => s.setBpm);
  const setSwing = useProjectStore((s) => s.setSwing);
  const setPlayMode = useProjectStore((s) => s.setPlayMode);
  const setMasterVolume = useProjectStore((s) => s.setMasterVolume);
  const loadProject = useProjectStore((s) => s.loadProject);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState(false);

  const handlePlayStop = (): void => {
    audioEngine.togglePlay();
  };

  const handleSave = async (): Promise<void> => {
    const state = useProjectStore.getState();
    const json = JSON.stringify(state, (key, value) => (key === 'selectedChannelId' || key === 'selectedPatternId' ? undefined : value), 2);
    if (window.beatForge) {
      await window.beatForge.saveProject(json);
    } else {
      downloadBlobFallback(`${state.projectName.replace(/\s+/g, '-')}.bfsproj.json`, new TextEncoder().encode(json).buffer, 'application/json');
    }
  };

  const handleOpen = async (): Promise<void> => {
    if (!window.beatForge) return;
    setBusy(true);
    try {
      const result = await window.beatForge.openProject();
      if (result.ok && result.data) {
        const parsed = JSON.parse(result.data);
        loadProject(parsed);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const project = useProjectStore.getState();
      const target: Parameters<typeof renderProjectToWav>[1] =
        project.transport.playMode === 'song'
          ? { mode: 'song' }
          : { mode: 'pattern', patternId: project.transport.currentPatternId ?? project.patterns[0]?.id ?? '' };
      const buffer = await renderProjectToWav(project, target);
      const filename = `${project.projectName.replace(/\s+/g, '-')}.wav`;
      if (window.beatForge) {
        await window.beatForge.exportWav(buffer);
      } else {
        downloadBlobFallback(filename, buffer, 'audio/wav');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark">BF</span>
        <span className="brand-name">Beat Forge Studio</span>
      </div>

      <button className={`btn primary transport-play ${transport.isPlaying ? 'toggled' : ''}`} onClick={handlePlayStop}>
        {transport.isPlaying ? '■ Stop' : '► Play'}
      </button>

      <div className="topbar-group">
        <label>BPM</label>
        <input
          className="themed"
          type="number"
          min={20}
          max={400}
          value={transport.bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
        />
      </div>

      <div className="topbar-group">
        <label>Swing</label>
        <input
          className="slider"
          type="range"
          min={0}
          max={100}
          value={Math.round(transport.swingPercent * 100)}
          onChange={(e) => setSwing(Number(e.target.value) / 100)}
        />
      </div>

      <div className="topbar-group mode-toggle">
        <button className={`btn small ${transport.playMode === 'pattern' ? 'primary' : ''}`} onClick={() => setPlayMode('pattern')}>
          Pattern
        </button>
        <button className={`btn small ${transport.playMode === 'song' ? 'primary' : ''}`} onClick={() => setPlayMode('song')}>
          Song
        </button>
      </div>

      <div className="topbar-group">
        <label>Master</label>
        <input
          className="slider"
          type="range"
          min={0}
          max={125}
          value={Math.round(transport.masterVolume * 100)}
          onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
        />
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-project-name">{projectName}</div>

      <div className="topbar-group">
        <button className="btn small" onClick={handleOpen} disabled={busy}>
          Open
        </button>
        <button className="btn small" onClick={handleSave}>
          Save
        </button>
        <button className="btn small primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Rendering…' : 'Export WAV'}
        </button>
      </div>
    </div>
  );
}
