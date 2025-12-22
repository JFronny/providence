export interface WheelOption {
  id?: string;
  label: string;
  weight: number;
  color?: string;
}

export interface WheelAction {
  name: string;
  template: string;
}

export interface WheelConfig {
  hash?: string;
  options: WheelOption[];
  actions: WheelAction[];
}
