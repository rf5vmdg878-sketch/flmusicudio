import { useMemo, useState } from 'react';
import { useProjectStore } from '@/state/store';
import { audioEngine } from '@/audio/AudioEngine';
import {
  ADDITIVE_PRESETS,
  DEFAULT_DRUM_KIT,
  FM_SYNTH_PRESETS,
  NOISE_PRESETS,
  SYNTH_PRESETS,
  WAVETABLE_PRESETS,
  makeSamplerForGenerator,
  makeSlicerForSample,
} from '@/presets/instruments';
import { InstrumentEditor } from './InstrumentEditor';
import './ChannelRack.css';

const STEPS_PER_BEAT = 4;

export function ChannelRack(): JSX.Element {
  const channels = useProjectStore((s) => s.channels);
  const patterns = useProjectStore((s) => s.patterns);
  const transport = useProjectStore((s) => s.transport);
  const mixerTracks = useProjectStore((s) => s.mixerTracks);
  const selectedChannelId = useProjectStore((s) => s.selectedChannelId);
  const selectChannel = useProjectStore((s) => s.selectChannel);
  const selectPattern = useProjectStore((s) => s.selectPattern);
  const setPlayMode = useProjectStore((s) => s.setPlayMode);
  const toggleStep = useProjectStore((s) => s.toggleStep);
  const toggleChannelMute = useProjectStore((s) => s.toggleChannelMute);
  const toggleChannelSolo = useProjectStore((s) => s.toggleChannelSolo);
  const setChannelVolume = useProjectStore((s) => s.setChannelVolume);
  const setChannelPan = useProjectStore((s) => s.setChannelPan);
  const removeChannel = useProjectStore((s) => s.removeChannel);
  const addChannel = useProjectStore((s) => s.addChannel);
  const addSample = useProjectStore((s) => s.addSample);
  const addPattern = useProjectStore((s) => s.addPattern);
  const renamePattern = useProjectStore((s) => s.renamePattern);

  const [showAddMenu, setShowAddMenu] = useState(false);

  const currentPatternId = transport.currentPatternId ?? patterns[0]?.id ?? null;
  const pattern = useMemo(() => patterns.find((p) => p.id === currentPatternId), [patterns, currentPatternId]);

  const drumsTrack = mixerTracks.find((t) => t.name === 'Drums') ?? mixerTracks[0];
  const synthsTrack = mixerTracks.find((t) => t.name === 'Synths') ?? mixerTracks[0];

  const handleSelectPattern = (id: string): void => {
    selectPattern(id);
    setPlayMode('pattern');
    useProjectStore.setState((s) => ({ transport: { ...s.transport, currentPatternId: id } }));
  };

  const handleStepClick = (channelId: string, stepIndex: number, currentlyOn: boolean): void => {
    if (!pattern) return;
    toggleStep(pattern.id, channelId, stepIndex);
    if (!currentlyOn) audioEngine.previewChannel(channelId, 0.9, 0.25);
  };

  const handleAddDrum = (generatorId: (typeof DEFAULT_DRUM_KIT)[number]): void => {
    addChannel(generatorId.name, generatorId.color, makeSamplerForGenerator(generatorId.generatorId), drumsTrack.id, false);
    setShowAddMenu(false);
  };

  const handleAddSynth = (preset: (typeof SYNTH_PRESETS)[number]): void => {
    addChannel(preset.name, preset.color, preset.params, synthsTrack.id, true);
    setShowAddMenu(false);
  };

  const handleAddFm = (preset: (typeof FM_SYNTH_PRESETS)[number]): void => {
    addChannel(preset.name, preset.color, preset.params, synthsTrack.id, true);
    setShowAddMenu(false);
  };

  const handleAddWavetable = (preset: (typeof WAVETABLE_PRESETS)[number]): void => {
    addChannel(preset.name, preset.color, preset.params, synthsTrack.id, true);
    setShowAddMenu(false);
  };

  const handleAddNoise = (preset: (typeof NOISE_PRESETS)[number]): void => {
    addChannel(preset.name, preset.color, preset.params, drumsTrack.id, false);
    setShowAddMenu(false);
  };

  const handleAddAdditive = (preset: (typeof ADDITIVE_PRESETS)[number]): void => {
    addChannel(preset.name, preset.color, preset.params, synthsTrack.id, true);
    setShowAddMenu(false);
  };

  const handleAddSliceDeck = async (): Promise<void> => {
    if (!window.beatForge) return;
    const result = await window.beatForge.importSamples();
    if (!result.ok || result.files.length === 0) return;
    const file = result.files[0];
    const sampleId = `slice-${Date.now()}`;
    addSample(sampleId, file.name, `data:audio/wav;base64,${file.data}`);
    addChannel(`Slice Deck: ${file.name}`, '#ff922b', makeSlicerForSample(sampleId, 8), drumsTrack.id, true);
    setShowAddMenu(false);
  };

  if (!pattern) return <div className="channel-rack empty">No pattern selected.</div>;

  const activeStep = transport.playMode === 'pattern' && transport.isPlaying ? transport.currentStep % pattern.lengthSteps : -1;

  return (
    <div className="channel-rack">
      <div className="pattern-bar">
        <div className="pattern-list scroll">
          {patterns.map((p) => (
            <button
              key={p.id}
              className={`pattern-chip ${p.id === currentPatternId ? 'active' : ''}`}
              onClick={() => handleSelectPattern(p.id)}
              onDoubleClick={() => {
                const name = prompt('Pattern name', p.name);
                if (name) renamePattern(p.id, name);
              }}
            >
              {p.name}
            </button>
          ))}
          <button className="btn small" onClick={() => addPattern()}>
            + Pattern
          </button>
        </div>
      </div>

      <div className="channel-rack-row">
      <div className="channel-rack-body scroll">
        <div className="rack-header-row">
          <div className="rack-header-labels">Channel</div>
          <div className="rack-header-steps">
            {Array.from({ length: pattern.lengthSteps }, (_, i) => (
              <div key={i} className={`step-header ${i === activeStep ? 'playing' : ''} ${i % STEPS_PER_BEAT === 0 ? 'beat' : ''}`}>
                {i % STEPS_PER_BEAT === 0 ? i / STEPS_PER_BEAT + 1 : ''}
              </div>
            ))}
          </div>
        </div>

        {channels.map((channel) => {
          const steps = pattern.stepsByChannel[channel.id] ?? [];
          return (
            <div key={channel.id} className={`channel-row ${selectedChannelId === channel.id ? 'selected' : ''}`}>
              <div className="channel-info" style={{ borderLeftColor: channel.color }}>
                <button className="channel-name" onClick={() => selectChannel(channel.id)} title="Edit instrument">
                  {channel.name}
                </button>
                <div className="channel-controls">
                  <button className={`icon-btn ${channel.muted ? 'active' : ''}`} title="Mute" onClick={() => toggleChannelMute(channel.id)}>
                    M
                  </button>
                  <button className={`icon-btn ${channel.soloed ? 'active' : ''}`} title="Solo" onClick={() => toggleChannelSolo(channel.id)}>
                    S
                  </button>
                  <input
                    className="slider mini"
                    type="range"
                    min={0}
                    max={125}
                    value={Math.round(channel.volume * 100)}
                    onChange={(e) => setChannelVolume(channel.id, Number(e.target.value) / 100)}
                    title="Volume"
                  />
                  <input
                    className="slider mini"
                    type="range"
                    min={-100}
                    max={100}
                    value={Math.round(channel.pan * 100)}
                    onChange={(e) => setChannelPan(channel.id, Number(e.target.value) / 100)}
                    title="Pan"
                  />
                  <button className="icon-btn" title="Remove channel" onClick={() => removeChannel(channel.id)}>
                    ×
                  </button>
                </div>
              </div>
              <div className="channel-steps">
                {steps.map((cell, i) => (
                  <button
                    key={i}
                    className={`step ${cell.on ? 'on' : ''} ${i === activeStep ? 'playing' : ''} ${i % STEPS_PER_BEAT === 0 ? 'beat' : ''}`}
                    style={cell.on ? { background: channel.color } : undefined}
                    onClick={() => handleStepClick(channel.id, i, cell.on)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="add-channel-row">
          <button className="btn small" onClick={() => setShowAddMenu((v) => !v)}>
            + Add Instrument
          </button>
          {showAddMenu && (
            <div className="add-menu panel">
              <div className="add-menu-col">
                <div className="add-menu-title">Drum Kit (synthesized)</div>
                {DEFAULT_DRUM_KIT.map((d) => (
                  <button key={d.generatorId} className="add-menu-item" onClick={() => handleAddDrum(d)}>
                    <span className="swatch" style={{ background: d.color }} /> {d.name}
                  </button>
                ))}
              </div>
              <div className="add-menu-col">
                <div className="add-menu-title">Synth Presets</div>
                {SYNTH_PRESETS.map((p) => (
                  <button key={p.name} className="add-menu-item" onClick={() => handleAddSynth(p)}>
                    <span className="swatch" style={{ background: p.color }} /> {p.name}
                  </button>
                ))}
              </div>
              <div className="add-menu-col">
                <div className="add-menu-title">FM Core Presets</div>
                {FM_SYNTH_PRESETS.map((p) => (
                  <button key={p.name} className="add-menu-item" onClick={() => handleAddFm(p)}>
                    <span className="swatch" style={{ background: p.color }} /> {p.name}
                  </button>
                ))}
                <div className="add-menu-title" style={{ marginTop: 10 }}>
                  Wave Loom Presets
                </div>
                {WAVETABLE_PRESETS.map((p) => (
                  <button key={p.name} className="add-menu-item" onClick={() => handleAddWavetable(p)}>
                    <span className="swatch" style={{ background: p.color }} /> {p.name}
                  </button>
                ))}
                {window.beatForge && (
                  <>
                    <div className="add-menu-title" style={{ marginTop: 10 }}>
                      Sample-based
                    </div>
                    <button className="add-menu-item" onClick={handleAddSliceDeck}>
                      <span className="swatch" style={{ background: '#ff922b' }} /> Slice Deck (import sample)
                    </button>
                  </>
                )}
              </div>
              <div className="add-menu-col">
                <div className="add-menu-title">Noise Forge Presets</div>
                {NOISE_PRESETS.map((p) => (
                  <button key={p.name} className="add-menu-item" onClick={() => handleAddNoise(p)}>
                    <span className="swatch" style={{ background: p.color }} /> {p.name}
                  </button>
                ))}
                <div className="add-menu-title" style={{ marginTop: 10 }}>
                  Harmonic Rig Presets
                </div>
                {ADDITIVE_PRESETS.map((p) => (
                  <button key={p.name} className="add-menu-item" onClick={() => handleAddAdditive(p)}>
                    <span className="swatch" style={{ background: p.color }} /> {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedChannelId && <InstrumentEditor channelId={selectedChannelId} onClose={() => selectChannel(null)} />}
      </div>
    </div>
  );
}
