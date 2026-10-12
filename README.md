# Beat Forge Studio

An original, open-source desktop beat-making studio and digital audio workstation (DAW) — step
sequencer, piano roll, playlist/timeline, a mixer with insert effects, and a library of
original synth, sampler, and effect plugins — built with Electron, React, and the Web Audio API.

## About this project

Beat Forge Studio is a standalone application with its own design and its own audio engine,
written from scratch. Its layout follows the conventions found across modern music-production
software in general — a pattern-based step sequencer, a piano roll for melodic editing, a
timeline for song arrangement, and a mixer with plugin-style insert effects — because that
workflow is simply how a broad class of beat-making tools are organized, not because it is
copied from any one product. Every instrument, effect, icon, and line of UI code here is
original work.

## Current feature set

- **Step sequencer (Channel Rack)** — per-channel step grids, mute/solo, volume/pan, multiple
  patterns.
- **Piano roll** — note drawing/deleting/resizing for melodic channels.
- **Playlist** — arrange patterns onto song tracks; move/resize/delete blocks; song-mode
  playback loops the arrangement.
- **Mixer** — per-track fader/pan/mute/solo, insert effect slots, master bus.
- **Export**: render the current pattern or full song to a 16-bit WAV file.
- **Project save/load** as JSON, via native file dialogs in the desktop app.

## Plugin catalog

Every instrument and effect below is an original implementation running on native Web Audio
nodes — nothing here is sampled from, modeled on, or copied from any third-party plugin's DSP,
UI, or branding (see [About this project](#about-this-project)). Each is a thin parameter
set over a shared engine (`src/audio/instruments/`, `src/audio/effects/insertNodes.ts`), so
adding a new preset is just data — see [Extending it](#extending-it).

### Instruments

| Plugin | Engine | Notes |
| --- | --- | --- |
| **Drum Kit** | 10 procedurally synthesized drums (kick, snare, closed/open hi-hat, clap, low/high tom, rim, crash, shaker) | No bundled samples — every hit is generated in code, so the kit ships royalty-free and is freely re-pitchable. |
| **Synth** | 2-oscillator subtractive engine with filter + envelope | 5 starter presets: Sub Bass, Saw Lead, Warm Pad, Pluck, Electric Keys. |
| **FM Core** | 2-operator FM (carrier + modulator, independent brightness envelope) | 3 presets: FM Bell, FM E-Piano, FM Growl Bass. |
| **Wave Loom** | Wavetable synth over 4 original hand-authored harmonic tables, with scan position + unison | 4 presets: Organic, Glassy, Buzzy, Hollow. |
| **Harmonic Rig** | Additive/drawbar synth — one sine oscillator per harmonic, individually leveled | 3 presets: Organ, Bell Stack, Mellow Fifths. |
| **Noise Forge** | White/pink/brown noise generator through a filter + envelope | 3 presets, one per noise color — risers, hats, texture FX. |
| **Pluck Rig** | Karplus-Strong physically modeled plucked string (filtered noise burst excites a damped feedback delay loop) | 3 presets: Nylon, Steel, Muted. |
| **Slice Deck** | Samples an imported file into N equal slices, played per piano-roll note | Imports WAV/MP3/OGG/FLAC/AIFF (desktop app only). |
| **Sampler** | Plain one-shot/looped sample playback with pitch, ADSR and gain | Also desktop-only import. |

### Insert effects (mixer plugin slots)

| Plugin | Type | Notes |
| --- | --- | --- |
| **EQ (3-band)** | Fixed-frequency low/mid/high shelving+peaking EQ | |
| **Parametric EQ** | 4 fully adjustable bands (freq/gain/Q/shelf-or-peak each) | |
| **Delay** | Feedback delay with wet/dry mix | |
| **Ping-Pong Delay** | Stereo delay bouncing between L/R with cross-feedback | |
| **Reverb** | Algorithmic reverb (procedurally generated impulse response, no IR samples) | |
| **Chorus Lab** | Short LFO-modulated delay for doubling/thickening | |
| **Flanger** | Short feedback-delay comb filter, LFO-swept | Distinct from Chorus Lab by its feedback path and shorter delay. |
| **Phase Drift** | Cascade of LFO-modulated all-pass filters with feedback | |
| **Tremolo** | Amplitude LFO | |
| **Auto-Pan** | Stereo-position LFO | |
| **Ring Modulator** | Carrier-oscillator amplitude modulation (true ring mod via an AudioParam-driven gain) | |
| **Resonator** | Pitch-tuned feedback delay (comb-filter ringing resonance) | |
| **Distortion** | Waveshaper hard-drive distortion | |
| **Saturator** | Soft tanh-based tape/tube-style saturation with a warmth-scaled high rolloff | |
| **Exciter** | Harmonic enhancer — generates upper harmonics from a high-passed copy of the signal and blends them back in | |
| **Vinyl Warmth** | Lo-fi combo effect: warmth lowpass, light bit-crush grit, subtle pitch wobble, mixed-in surface noise | |
| **Crush Box** | Amplitude bit-depth reduction (1–16 bit) | |
| **Stereo Field** | Mid/side width control | |
| **Stereo Delay** | Independent delay time per channel (vs. Ping-Pong's cross-feeding bounce) | |
| **Dyna Press** | General-purpose dynamics compressor with makeup gain | |
| **Multiband Dyna Press** | 3-band (Linkwitz-Riley-style crossover) compressor, independent threshold/ratio per band | |
| **Gate** | Amplitude-threshold noise gate | |
| **Limiter** | Brick-wall limiter for the master bus | |

## Architecture

```
.github/workflows/   CI: builds installers on Windows/macOS/Linux runners
build/               electron-builder resources (app icon)
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

## Platform support

Beat Forge Studio runs on **Windows, macOS, and Linux** — it's a single Electron + Web Audio
codebase with no platform-specific branches in the app logic; Electron's bundled Chromium
behaves identically across all three. Requirements: [Node.js](https://nodejs.org) 20+ and npm.

## Getting started

```bash
npm install
npm run dev:electron   # launches the Vite dev server + Electron window
```

Other scripts:

- `npm run dev` — run just the React app in a browser (sample import/export dialogs fall back
  to browser downloads instead of native file dialogs).
- `npm run build` — typecheck + build the renderer bundle.
- `npm run typecheck` — TypeScript only, no emit.

### Building installers for each OS

```bash
npm run package:mac     # .dmg + .zip (x64 + Apple Silicon)
npm run package:win     # NSIS installer + portable .exe (x64 + arm64)
npm run package:linux   # .AppImage + .deb + .rpm (x64 + arm64)
npm run package         # builds all three — only macOS can build+sign the .dmg properly;
                         # electron-builder can still cross-build Windows/Linux artifacts from
                         # macOS or Linux hosts, but building each target on its native OS is
                         # the most reliable option (see CI below)
```

Output lands in `release/`. These builds are **unsigned** (no Apple Developer ID or Windows
code-signing certificate is configured) — macOS will show a Gatekeeper warning and Windows will
show a SmartScreen warning on first launch; users can still run the app by choosing "Open Anyway"
/ "Run anyway". Signing is a config addition (`CSC_LINK`/`APPLE_ID` env vars for electron-builder)
left for whoever maintains a release pipeline with real certificates.

### CI: building on all three OSes

`.github/workflows/build.yml` runs a GitHub Actions matrix across `ubuntu-latest`,
`windows-latest`, and `macos-latest`, each building its native package set and uploading the
installers as workflow artifacts. It runs on pushes/PRs to `main` and can be triggered manually.

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
