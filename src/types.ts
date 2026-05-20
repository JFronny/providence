export interface WheelOption {
  id?: string;
  label: string;
  weight?: number;
  color?: string;
}

export interface WheelAction {
  name: string;
  template: string;
}

export type HashSource = "Bitcoin" | "Monero"
export const DefaultHashSource: HashSource = "Bitcoin";
export type HashRef = { type: "historic"; hash: string; source?: HashSource }
  | { type: "current"; source?: HashSource }
  | { type: "next"; source?: HashSource };

export interface WheelConfig {
  hash: HashRef;
  options: WheelOption[];
  actions: WheelAction[];
}
