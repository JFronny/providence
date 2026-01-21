import type { WheelConfig } from "./types";

export const exampleConfig: WheelConfig = {
  hash: { type: "current" },
  options: [
    { label: "Option 1", id: "1", weight: 1, color: "red" },
    { label: "Option 2", id: "2", weight: 2, color: "blue" },
    { label: "Option 3", id: "3", weight: 1, color: "green" },
  ],
  actions: [
    { name: "Search by ID", template: "https://google.com/search?q={}" },
    { name: "Search by Label", template: "https://google.com/search?q={label}" },
  ],
};

export function getExampleUrl() {
  const json = JSON.stringify(exampleConfig);
  const encoded = encodeURIComponent(json);
  return `/?config=${encoded}`;
}
