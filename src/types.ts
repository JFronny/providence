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

export type HashRef = { type: "historic"; hash: string } | { type: "current" } | { type: "next" };

export interface WheelConfig {
  hash: HashRef;
  options: WheelOption[];
  actions: WheelAction[];
}
