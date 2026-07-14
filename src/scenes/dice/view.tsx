import { TopBar } from "src/components/TopBar";
import { createCoin, createD6, createPolyhedron } from "src/scenes/dice/dice-shapes";
import { DICE_CONFIGS, type DieConfig, type DieResult, type DieType } from "src/scenes/dice/model";
import type { HashSource } from "src/types";

const DIE_TYPES: DieType[] = ["coin", "d4", "d6", "d8", "d10", "d12", "d20"];

const DIE_BUILDERS: Record<DieType, (value: number, color: string) => HTMLElement> = {
  coin: (v) => createCoin(v),
  d4: (v, c) => createPolyhedron("d4", v, c),
  d6: (v) => createD6(v),
  d8: (v, c) => createPolyhedron("d8", v, c),
  d10: (v, c) => createPolyhedron("d10", v, c),
  d12: (v, c) => createPolyhedron("d12", v, c),
  d20: (v, c) => createPolyhedron("d20", v, c),
};

export class DiceView {
  throwButton: HTMLButtonElement;
  sourceSelect: HTMLSelectElement;
  pickerList: HTMLDivElement;
  diceArea: HTMLDivElement;
  resultsArea: HTMLDivElement;
  hashInfo: HTMLDivElement;
  throwCount = 0;
  throwCountEl: HTMLDivElement;

  private onAdd: ((type: DieType) => void) | null = null;
  private onRemove: ((index: number) => void) | null = null;

  constructor(root: HTMLElement) {
    this.throwButton = (
      <button class="dice-throw-btn" disabled>
        🎲 Throw
      </button>
    ) as HTMLButtonElement;
    this.sourceSelect = (
      <select class="form-input dice-source-select">
        <option value="Bitcoin">Bitcoin</option>
        <option value="Monero">Monero</option>
      </select>
    ) as HTMLSelectElement;
    this.pickerList = (<div class="dice-selected-list"></div>) as HTMLDivElement;
    this.diceArea = (<div class="dice-roll-area"></div>) as HTMLDivElement;
    this.resultsArea = (<div class="dice-results"></div>) as HTMLDivElement;
    this.hashInfo = (<div class="block-hash"></div>) as HTMLDivElement;
    this.throwCountEl = (<div class="dice-throw-count"></div>) as HTMLDivElement;

    const pickerButtons = (
      <div class="dice-picker-buttons">
        {DIE_TYPES.map((type) => {
          const cfg = DICE_CONFIGS[type];
          return (
            <button class="dice-picker-btn" style={`border-color: ${cfg.color}`} onclick={() => this.onAdd?.(type)}>
              {cfg.label}
            </button>
          );
        })}
      </div>
    );

    root.replaceChildren(
      <div class="page-layout centered">
        {TopBar()}
        <div class="container">
          <div class="card dice-page">
            <h1>Dice</h1>
            <div class="form-group">
              <label class="form-label">Hash Source:</label>
              {this.sourceSelect}
            </div>
            <div class="form-group">
              <label class="form-label">Add Dice:</label>
              {pickerButtons}
            </div>
            {this.pickerList}
            {this.throwButton}
            {this.diceArea}
            {this.resultsArea}
            {this.hashInfo}
            {this.throwCountEl}
          </div>
        </div>
      </div>,
    );
  }

  get hashSource(): HashSource {
    return this.sourceSelect.value as HashSource;
  }

  bind(callbacks: { onThrow: () => void; onAdd: (type: DieType) => void; onRemove: (index: number) => void }) {
    this.throwButton.addEventListener("click", callbacks.onThrow);
    this.onAdd = callbacks.onAdd;
    this.onRemove = callbacks.onRemove;
  }

  updateSelectedList(dice: DieConfig[]) {
    this.throwButton.disabled = dice.length === 0;
    this.pickerList.replaceChildren(
      ...dice.map((die, i) => (
        <span class="dice-selected-tag" style={`border-color: ${die.color}`} onclick={() => this.onRemove?.(i)}>
          {die.label} ✕
        </span>
      )),
    );
  }

  setLoading(msg: string) {
    this.throwButton.disabled = true;
    this.resultsArea.replaceChildren(<span>{msg}</span>);
    this.diceArea.replaceChildren();
  }

  showHashInfo(hash: string, source: HashSource) {
    this.hashInfo.textContent = `${source} Block Hash: ${hash}`;
  }

  animateRoll(results: DieResult[]): Promise<void> {
    this.resultsArea.replaceChildren();
    this.diceArea.replaceChildren();

    const dieElements: HTMLElement[] = [];

    for (const result of results) {
      const builder = DIE_BUILDERS[result.config.type];
      const dieEl = builder(result.value, result.config.color);
      dieElements.push(dieEl);
      this.diceArea.appendChild(dieEl);
    }

    // Start with tumbling state
    for (const el of dieElements) {
      const inner = el.querySelector(".die-inner") as HTMLElement;
      if (inner) {
        // Random initial tumble
        const rx = Math.floor(Math.random() * 4) * 360 + Math.random() * 360;
        const ry = Math.floor(Math.random() * 4) * 360 + Math.random() * 360;
        const rz = Math.floor(Math.random() * 2) * 360 + Math.random() * 360;
        inner.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
      }
    }

    // After a frame, transition to final position
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          for (const el of dieElements) {
            const inner = el.querySelector(".die-inner") as HTMLElement;
            if (inner) {
              inner.classList.add("die-landing");
              const finalTransform = inner.dataset.final!;
              inner.style.transform = finalTransform;
            }
          }

          // Wait for transition to finish
          setTimeout(() => {
            this.showResults(results);
            this.throwButton.disabled = false;
            resolve();
          }, 2200);
        });
      });
    });
  }

  private showResults(results: DieResult[]) {
    const total = results.reduce((sum, r) => sum + r.value, 0);
    this.resultsArea.replaceChildren(
      <div class="dice-results-inner">
        <div class="dice-results-list">
          {results.map((r) => (
            <span class="dice-result-item" style={`border-color: ${r.config.color}`}>
              {r.config.label}:{" "}
              <strong>{r.config.type === "coin" ? (r.value === 1 ? "Heads" : "Tails") : String(r.value)}</strong>
            </span>
          ))}
        </div>
        {results.length > 1 ? <div class="dice-results-total">Total: {String(total)}</div> : null}
      </div>,
    );
  }
}
