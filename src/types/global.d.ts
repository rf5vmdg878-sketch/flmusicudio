import type { BeatForgeBridge } from '../../electron/preload';

declare global {
  interface Window {
    beatForge?: BeatForgeBridge;
  }
}

export {};
