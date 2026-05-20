// See below for the full TypeScript interface
import type { WheelConfig } from "src/types";

export function getExampleUrl() {
  // Put your options and actions here
  const exampleConfig: WheelConfig = {
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

  // The config is encoded as json and passed as a query parameter.
  // Make sure to encode it properly to avoid issues with special characters!
  const json = JSON.stringify(exampleConfig);
  const encoded = encodeURIComponent(json);
  return `${import.meta.env.BASE_URL}wheel?config=${encoded}`;
}
