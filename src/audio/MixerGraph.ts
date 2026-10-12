import type { Channel, MixerTrack, ProjectState } from '@/types/project';
import { buildInsertChain, type InsertChainHandle } from './effects/InsertChain';

interface TrackNodes {
  sum: GainNode;
  panner: StereoPannerNode;
  volume: GainNode;
  /** Automation-only nodes: never touched by the manual volume/pan sync below,
   * so a Scheduler-driven ramp on these (see Scheduler's automation handling)
   * never fights the per-tick store sync. Identity defaults (gain=1, pan=0)
   * mean "no lane" has no audible effect. */
  autoGain: GainNode;
  autoPanner: StereoPannerNode;
  chain: InsertChainHandle;
  chainShape: string;
  connectedToMaster: boolean;
}

/** Identifies the chain's *structure* (which effect slots exist, in what order,
 * enabled or not) without caring about parameter values, so a slider drag
 * (which replaces the inserts array but keeps the same shape) updates nodes
 * in place instead of tearing down and rebuilding the audio graph. */
function insertChainShape(inserts: MixerTrack['inserts']): string {
  return inserts.map((i) => `${i.id}:${i.params.type}:${i.enabled}`).join('|');
}

interface ChannelNodes {
  gain: GainNode;
  panner: StereoPannerNode;
  connectedTrackId: string | null;
}

/** Owns the persistent Web Audio graph for the mixer: one node chain per
 * mixer track (sum -> inserts -> pan -> volume -> master) and one small
 * gain/pan pair per instrument channel feeding into its assigned track.
 * `sync` is cheap to call on every store tick: it only creates/destroys/rewires
 * nodes when the underlying structure actually changed. */
export class MixerGraph {
  private readonly ctx: BaseAudioContext;
  private readonly masterTrackId: string;
  private trackNodes = new Map<string, TrackNodes>();
  private channelNodes = new Map<string, ChannelNodes>();

  constructor(ctx: BaseAudioContext, masterTrackId: string) {
    this.ctx = ctx;
    this.masterTrackId = masterTrackId;
  }

  getChannelDestination(channelId: string): AudioNode | undefined {
    return this.channelNodes.get(channelId)?.gain;
  }

  /** The AudioParam an automation lane drives for mixer-track volume (a 0..1
   * multiplier layered on top of the manual fader; identity = 1). */
  getTrackAutomationGainParam(trackId: string): AudioParam | undefined {
    return this.trackNodes.get(trackId)?.autoGain.gain;
  }

  /** The AudioParam an automation lane drives for mixer-track pan (a -1..1
   * offset layered on top of the manual pan; identity = 0). */
  getTrackAutomationPanParam(trackId: string): AudioParam | undefined {
    return this.trackNodes.get(trackId)?.autoPanner.pan;
  }

  sync(project: ProjectState): void {
    this.syncTracks(project.mixerTracks);
    this.syncChannels(project.channels);
  }

  private syncTracks(tracks: MixerTrack[]): void {
    const seen = new Set<string>();
    const anySoloed = tracks.some((t) => t.id !== this.masterTrackId && t.soloed);

    for (const track of tracks) {
      seen.add(track.id);
      let nodes = this.trackNodes.get(track.id);
      if (!nodes) {
        const sum = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();
        const volume = this.ctx.createGain();
        const autoGain = this.ctx.createGain();
        const autoPanner = this.ctx.createStereoPanner();
        const chain = buildInsertChain(this.ctx, track.inserts);
        sum.connect(chain.input);
        chain.output.connect(panner);
        panner.connect(volume);
        volume.connect(autoGain);
        autoGain.connect(autoPanner);
        nodes = {
          sum,
          panner,
          volume,
          autoGain,
          autoPanner,
          chain,
          chainShape: insertChainShape(track.inserts),
          connectedToMaster: false,
        };
        this.trackNodes.set(track.id, nodes);
      }

      const shape = insertChainShape(track.inserts);
      if (nodes.chainShape !== shape) {
        nodes.chain.dispose();
        nodes.sum.disconnect();
        const chain = buildInsertChain(this.ctx, track.inserts);
        nodes.sum.connect(chain.input);
        chain.output.connect(nodes.panner);
        nodes.chain = chain;
        nodes.chainShape = shape;
      } else {
        nodes.chain.update(track.inserts);
      }

      nodes.panner.pan.value = track.pan;
      const muted = track.muted || (track.id !== this.masterTrackId && anySoloed && !track.soloed);
      nodes.volume.gain.value = muted ? 0 : track.volume;
    }

    // Second pass: connect each track's output now that every node exists,
    // so creation order never matters (master may not exist yet in pass one).
    for (const track of tracks) {
      const nodes = this.trackNodes.get(track.id);
      if (!nodes || nodes.connectedToMaster) continue;
      if (track.id === this.masterTrackId) {
        nodes.autoPanner.connect(this.ctx.destination);
        nodes.connectedToMaster = true;
      } else {
        const master = this.trackNodes.get(this.masterTrackId);
        if (master) {
          nodes.autoPanner.connect(master.sum);
          nodes.connectedToMaster = true;
        }
      }
    }

    for (const [id, nodes] of this.trackNodes) {
      if (!seen.has(id)) {
        nodes.chain.dispose();
        nodes.sum.disconnect();
        nodes.panner.disconnect();
        nodes.volume.disconnect();
        nodes.autoGain.disconnect();
        nodes.autoPanner.disconnect();
        this.trackNodes.delete(id);
      }
    }
  }

  private syncChannels(channels: Channel[]): void {
    const seen = new Set<string>();
    const anySoloed = channels.some((c) => c.soloed);

    for (const channel of channels) {
      seen.add(channel.id);
      let nodes = this.channelNodes.get(channel.id);
      if (!nodes) {
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();
        gain.connect(panner);
        nodes = { gain, panner, connectedTrackId: null };
        this.channelNodes.set(channel.id, nodes);
      }

      nodes.panner.pan.value = channel.pan;
      const muted = channel.muted || (anySoloed && !channel.soloed);
      nodes.gain.gain.value = muted ? 0 : channel.volume;

      if (nodes.connectedTrackId !== channel.mixerTrackId) {
        nodes.panner.disconnect();
        const track = this.trackNodes.get(channel.mixerTrackId);
        if (track) {
          nodes.panner.connect(track.sum);
          nodes.connectedTrackId = channel.mixerTrackId;
        } else {
          nodes.connectedTrackId = null;
        }
      }
    }

    for (const [id, nodes] of this.channelNodes) {
      if (!seen.has(id)) {
        nodes.gain.disconnect();
        nodes.panner.disconnect();
        this.channelNodes.delete(id);
      }
    }
  }

  dispose(): void {
    for (const nodes of this.trackNodes.values()) {
      nodes.chain.dispose();
      nodes.sum.disconnect();
      nodes.panner.disconnect();
      nodes.volume.disconnect();
      nodes.autoGain.disconnect();
      nodes.autoPanner.disconnect();
    }
    for (const nodes of this.channelNodes.values()) {
      nodes.gain.disconnect();
      nodes.panner.disconnect();
    }
    this.trackNodes.clear();
    this.channelNodes.clear();
  }
}
