import type { InsertEffect } from '@/types/project';
import { buildEffectNode, type EffectNode } from './insertNodes';

export interface InsertChainHandle {
  input: GainNode;
  output: GainNode;
  dispose: () => void;
  update: (inserts: InsertEffect[]) => void;
}

/** Builds a fresh series chain of effect nodes for the given inserts list.
 * Called only when the chain's structure changes (add/remove/reorder/enable
 * toggle), so a param tweak on an existing effect goes through `update`
 * instead of rebuilding the graph (see MixerGraph's `insertChainShape`). */
export function buildInsertChain(ctx: BaseAudioContext, inserts: InsertEffect[]): InsertChainHandle {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const nodes: EffectNode[] = [];

  let cursor: AudioNode = input;
  for (const insert of inserts) {
    if (!insert.enabled) continue;
    const node = buildEffectNode(ctx, insert.params);
    nodes.push(node);
    cursor.connect(node.input);
    cursor = node.output;
  }
  cursor.connect(output);

  return {
    input,
    output,
    update: (nextInserts) => {
      // Push latest param values into same-typed nodes without rebuilding the graph.
      const enabledNow = nextInserts.filter((i) => i.enabled);
      enabledNow.forEach((insert, idx) => {
        nodes[idx]?.update(insert.params);
      });
    },
    dispose: () => {
      nodes.forEach((n) => n.dispose());
      input.disconnect();
      output.disconnect();
    },
  };
}
