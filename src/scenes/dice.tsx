import { getLatestBlockHash, getNonce } from "src/random";
import { DiceModel } from "src/scenes/dice/model";
import { DiceView } from "src/scenes/dice/view";

export async function initDiceScreen(root: HTMLElement, signal?: AbortSignal) {
  const model = new DiceModel();
  const view = new DiceView(root);

  view.bind({
    onAdd(type) {
      model.addDie(type);
      view.updateSelectedList(model.selectedDice);
    },
    onRemove(index) {
      model.removeDie(index);
      view.updateSelectedList(model.selectedDice);
    },
    async onThrow() {
      if (model.selectedDice.length === 0) return;

      view.throwCount++;
      const source = view.hashSource;
      view.setLoading("Fetching block hash...");

      const hash = await getLatestBlockHash(source);
      if (signal?.aborted) return;
      if (!hash) {
        view.setLoading("Failed to fetch block hash");
        view.throwButton.disabled = false;
        return;
      }

      view.setLoading("Fetching nonce...");
      const nonce = await getNonce(hash, source);
      if (signal?.aborted) return;
      if (!nonce) {
        view.setLoading("Failed to fetch nonce");
        view.throwButton.disabled = false;
        return;
      }

      view.showHashInfo(hash, source);
      const results = model.roll(nonce + view.throwCount - 1);
      await view.animateRoll(results);
      view.throwCountEl.textContent = `Throw count: ${view.throwCount}`;
    },
  });

  // Start with a d6 by default
  model.addDie("d6");
  view.updateSelectedList(model.selectedDice);
}
