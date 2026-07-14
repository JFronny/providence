import { mulberry32 } from "src/random.ts";

export type DieType = "coin" | "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

export interface DieConfig {
  type: DieType;
  sides: number;
  label: string;
  color: string;
}

export interface DieResult {
  config: DieConfig;
  value: number;
  extraSpin: ExtraSpin;
}

export interface ExtraSpin {
  rx: number;
  ry: number;
}

export const DICE_CONFIGS: Record<DieType, Omit<DieConfig, "type">> = {
  coin: { sides: 2, label: "Coin", color: "#c9a84c" },
  d4: { sides: 4, label: "D4", color: "#e74c3c" },
  d6: { sides: 6, label: "D6", color: "#f0f0f0" },
  d8: { sides: 8, label: "D8", color: "#3498db" },
  d10: { sides: 10, label: "D10", color: "#2ecc71" },
  d12: { sides: 12, label: "D12", color: "#9b59b6" },
  d20: { sides: 20, label: "D20", color: "#e67e22" },
};

export function makeDieConfig(type: DieType): DieConfig {
  return { type, ...DICE_CONFIGS[type] };
}

export class DiceModel {
  selectedDice: DieConfig[] = [];
  results: DieResult[] | null = null;

  addDie(type: DieType) {
    this.selectedDice.push(makeDieConfig(type));
  }

  removeDie(index: number) {
    this.selectedDice.splice(index, 1);
  }

  roll(seed: number): DieResult[] {
    const rand = mulberry32(seed);
    this.results = this.selectedDice.map((config) => ({
      config,
      value: Math.floor(rand() * config.sides) + 1,
      extraSpin: {
        rx: (Math.floor(rand() * 3) + 2) * 360,
        ry: (Math.floor(rand() * 3) + 2) * 360,
      },
    }));
    return this.results;
  }
}
