import { getLatestBlockHash, getNonce } from "src/random";
import { DiceModel } from "src/scenes/dice/model";
import { DiceView } from "src/scenes/dice/view";
import type { HashSource } from "src/types";

export async function initDiceScreen(root: HTMLElement, signal?: AbortSignal) {
  const model = new DiceModel();
  const view = new DiceView(root);
  let cachedRoll: { source: HashSource; hash: string; baseSeed: number } | null = null;

  view.sourceSelect.select.addEventListener("change", () => {
    cachedRoll = null;
    view.clearHashInfo();
  });

  async function resolveBaseSeed(source: HashSource): Promise<{ source: HashSource; hash: string; baseSeed: number } | null> {
    if (cachedRoll?.source === source) return cachedRoll;

    view.setLoading("Fetching block hash...");
    const hash = await getLatestBlockHash(source);
    if (signal?.aborted) return null;
    if (!hash) {
      view.setLoading("Failed to fetch block hash");
      view.setThrowLocked(false);
      return null;
    }

    view.setLoading("Fetching nonce...");
    const baseSeed = await getNonce(hash, source);
    if (signal?.aborted) return null;
    if (baseSeed == null) {
      view.setLoading("Failed to fetch nonce");
      view.setThrowLocked(false);
      return null;
    }

    cachedRoll = { source, hash, baseSeed };
    view.showHashInfo(hash, source);
    return cachedRoll;
  }

  view.bind({
    onAdd(type) {
      model.addDie(type);
      view.updateSelectedList(model.selectedDice);
      view.setThrowCount(model.throwCount);
    },
    onRemove(index) {
      model.removeDie(index);
      view.updateSelectedList(model.selectedDice);
      view.setThrowCount(model.throwCount);
    },
    async onThrow() {
      if (model.selectedDice.length === 0) return;

      const source = view.hashSource;
      const rollInfo = await resolveBaseSeed(source);
      if (signal?.aborted || !rollInfo) return;

      const results = model.roll(rollInfo.baseSeed);
      view.setThrowCount(model.throwCount);
      await view.animateRoll(results);
    },
  });

  // Start with a d6 by default
  model.addDie("d6");
  view.updateSelectedList(model.selectedDice);
  view.setThrowCount(model.throwCount);
}
