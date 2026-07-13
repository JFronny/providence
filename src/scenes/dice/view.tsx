import { TopBar } from "src/components/TopBar";
import { DICE_CONFIGS, type DieConfig, type DieResult, type DieType } from "src/scenes/dice/model";
import type { HashSource } from "src/types";

const DIE_TYPES: DieType[] = ["coin", "d4", "d6", "d8", "d10", "d12", "d20"];

// D6 face rotations: which rotateX/rotateY shows face N on top
const D6_ROTATIONS: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(0deg) rotateY(90deg)",
  3: "rotateX(-90deg) rotateY(0deg)",
  4: "rotateX(90deg) rotateY(0deg)",
  5: "rotateX(0deg) rotateY(-90deg)",
  6: "rotateX(180deg) rotateY(0deg)",
};

// Pip layouts for d6 faces
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
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
    this.throwButton = (<button class="dice-throw-btn" disabled>🎲 Throw</button>) as HTMLButtonElement;
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
            <button
              class="dice-picker-btn"
              style={`border-color: ${cfg.color}`}
              onclick={() => this.onAdd?.(type)}
            >
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

  bind(callbacks: {
    onThrow: () => void;
    onAdd: (type: DieType) => void;
    onRemove: (index: number) => void;
  }) {
    this.throwButton.addEventListener("click", callbacks.onThrow);
    this.onAdd = callbacks.onAdd;
    this.onRemove = callbacks.onRemove;
  }

  updateSelectedList(dice: DieConfig[]) {
    this.throwButton.disabled = dice.length === 0;
    this.pickerList.replaceChildren(
      ...dice.map((die, i) => (
        <span
          class="dice-selected-tag"
          style={`border-color: ${die.color}`}
          onclick={() => this.onRemove?.(i)}
        >
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
      let dieEl: HTMLElement;
      if (result.config.type === "d6") {
        dieEl = this.createD6(result.value);
      } else if (result.config.type === "coin") {
        dieEl = this.createCoin(result.value);
      } else {
        dieEl = this.createToken(result);
      }
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

  private createD6(value: number): HTMLElement {
    const size = 80;
    const half = size / 2;
    const faces = [1, 2, 3, 4, 5, 6].map((n) => {
      const faceTransforms: Record<number, string> = {
        1: `rotateY(0deg) translateZ(${half}px)`,
        2: `rotateY(-90deg) translateZ(${half}px)`,
        3: `rotateX(90deg) translateZ(${half}px)`,
        4: `rotateX(-90deg) translateZ(${half}px)`,
        5: `rotateY(90deg) translateZ(${half}px)`,
        6: `rotateY(180deg) translateZ(${half}px)`,
      };
      return (
        <div class="die-face die-face-d6" style={`transform: ${faceTransforms[n]}`}>
          {PIP_LAYOUTS[n].map(([x, y]) => (
            <span class="die-pip" style={`left: ${x}%; top: ${y}%`}></span>
          ))}
        </div>
      );
    });

    // Add extra tumble rotations so it looks like it spins
    const extraX = (Math.floor(Math.random() * 3) + 2) * 360;
    const extraY = (Math.floor(Math.random() * 3) + 2) * 360;
    const finalTransform = `rotateX(${extraX}deg) rotateY(${extraY}deg) ${D6_ROTATIONS[value]}`;

    const inner = (
      <div class="die-inner die-inner-d6" data-final={finalTransform}>
        {faces}
      </div>
    ) as HTMLElement;

    return (
      <div class="die-container die-container-d6">
        {inner}
      </div>
    ) as HTMLElement;
  }

  private createCoin(value: number): HTMLElement {
    const label = value === 1 ? "H" : "T";
    const backLabel = value === 1 ? "T" : "H";
    const extraY = (Math.floor(Math.random() * 4) + 3) * 360;
    const finalY = value === 1 ? 0 : 180;
    const finalTransform = `rotateY(${extraY + finalY}deg)`;

    const inner = (
      <div class="die-inner die-inner-coin" data-final={finalTransform}>
        <div class="die-face die-face-coin-front">{label}</div>
        <div class="die-face die-face-coin-back">{backLabel}</div>
      </div>
    ) as HTMLElement;

    return (
      <div class="die-container die-container-coin">
        {inner}
      </div>
    ) as HTMLElement;
  }

  private createToken(result: DieResult): HTMLElement {
    const { config, value } = result;
    const extraX = (Math.floor(Math.random() * 3) + 2) * 360;
    const extraY = (Math.floor(Math.random() * 3) + 2) * 360;
    const finalTransform = `rotateX(${extraX}deg) rotateY(${extraY}deg)`;

    const inner = (
      <div class="die-inner die-inner-token" data-final={finalTransform}>
        <div class="die-face die-face-token-front" style={`background-color: ${config.color}`}>
          <span class="die-token-value">{String(value)}</span>
        </div>
        <div class="die-face die-face-token-back" style={`background-color: ${config.color}; filter: brightness(0.7)`}>
          <span class="die-token-label">{config.label}</span>
        </div>
      </div>
    ) as HTMLElement;

    return (
      <div class="die-container die-container-token">
        {inner}
      </div>
    ) as HTMLElement;
  }

  private showResults(results: DieResult[]) {
    const total = results.reduce((sum, r) => sum + r.value, 0);
    this.resultsArea.replaceChildren(
      <div class="dice-results-inner">
        <div class="dice-results-list">
          {results.map((r) => (
            <span class="dice-result-item" style={`border-color: ${r.config.color}`}>
              {r.config.label}: <strong>{r.config.type === "coin" ? (r.value === 1 ? "Heads" : "Tails") : String(r.value)}</strong>
            </span>
          ))}
        </div>
        {results.length > 1 ? <div class="dice-results-total">Total: {String(total)}</div> : null}
      </div>,
    );
  }
}
