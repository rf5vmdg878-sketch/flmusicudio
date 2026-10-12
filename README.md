# Beat Forge Studio

An open-source, desktop beat-making studio / DAW — step sequencer (channel rack), piano roll,
playlist/timeline, mixer with insert effects, a subtractive synth engine, and a sampler, built
with Electron + React + the Web Audio API.

## About the name, and FL Studio

This project is **inspired by** the classic step-sequencer-plus-piano-roll workflow that FL
Studio (and similar tools) popularized. It is **not** a clone of FL Studio, and never will be:

- It does not use the FL Studio name, logo, or any of its branding.
- It does not copy FL Studio's source code, proprietary UI design, or bundled sounds/plugins.
- "Exact one-to-one" parity with a commercial, 20+-year-old product is not a realistic or
  legal goal for an open-source project — that would mean reproducing trademarked branding and
  proprietary assets, which this project deliberately avoids.

What it does aim for is a **genuinely useful, from-scratch beat studio** with its own identity,
built around the same core workflow: pattern-based step sequencing, a piano roll for melodies,
a playlist for song arrangement, and a mixer with effect inserts.

## Current feature set

- **Step sequencer (Channel Rack)** — per-channel step grids, mute/solo, volume/pan, multiple
  patterns.
- **Piano roll** — note drawing/deleting/resizing for melodic (synth) channels.
- **Playlist** — arrange patterns onto song tracks; move/resize/delete blocks; song-mode
  playback loops the arrangement.
- **Mixer** — per-track fader/pan/mute/solo, insert effect slots, master bus.
- **Built-in instrument packages**:
  - A full drum kit (kick, snare, closed/open hi-hat, clap, toms, rim, crash, shaker) —
    every sound is **synthesized procedurally in code**, not sampled, so it ships
    royalty-free and can be freely re-pitched/reshaped.
  - A 2-oscillator subtractive synth engine with five starter presets (Sub Bass, Saw Lead,
    Warm Pad, Pluck, Electric Keys) — new presets are just parameter sets, no new code needed.
  - A sampler channel that can import your own WAV/MP3/OGG/FLAC/AIFF files (desktop app only).
- **Insert effects**: 3-band EQ, delay, algorithmic reverb, distortion, limiter — all
  implemented directly on Web Audio nodes (no external plugin format).
- **Export**: render the current pattern or full song to a 16-bit WAV file.
- **Project save/load** as JSON, via native file dialogs in the desktop app.

## Architecture

```
electron/            Electron main process + preload (file dialogs, IPC)
src/
  audio/             Web Audio engine: scheduler, mixer graph, instruments, effects, WAV export
  state/             zustand store — the single source of truth for the project
  presets/           Default instrument & effect factory data
  components/        React UI: ChannelRack, PianoRoll, Playlist, Mixer, TopBar
  types/             Shared TypeScript types for the project data model
```

The audio engine is intentionally decoupled from React: `audioEngine` (a singleton in
`src/audio/AudioEngine.ts`) subscribes to the zustand store and keeps a persistent Web Audio
graph in sync, while a lookahead scheduler (`src/audio/Scheduler.ts`) reads the store on each
tick to decide what to trigger. The same step-resolution logic is reused for offline WAV
rendering (`src/audio/export/renderToWav.ts`), so exports match what you hear during playback.

## Getting started

```bash
npm install
npm run dev:electron   # launches the Vite dev server + Electron window
```

Other scripts:

- `npm run dev` — run just the React app in a browser (sample import/export dialogs fall back
  to browser downloads instead of native file dialogs).
- `npm run build` — typecheck + build the renderer bundle.
- `npm run package` — build everything and package a desktop installer via electron-builder.
- `npm run typecheck` — TypeScript only, no emit.

## Extending it

- **New synth preset**: add an entry to `SYNTH_PRESETS` in `src/presets/instruments.ts`.
- **New drum sound**: add a case to `triggerDrumSound` in `src/audio/instruments/DrumSynth.ts`
  and a matching entry in `DEFAULT_DRUM_KIT`.
- **New insert effect**: add a variant to `InsertEffectParams` in `src/types/project.ts`, a
  builder in `src/audio/effects/insertNodes.ts`, and a param editor in
  `src/components/Mixer/InsertEditor.tsx`.

## Roadmap ideas (not yet implemented)

This first pass covers the core loop end-to-end; it does not yet include automation lanes,
MIDI hardware input, audio recording, third-party plugin (VST) hosting, or a browser/library
of community sample packs. Contributions welcome.

## License

MIT — see [LICENSE](./LICENSE).
