import JSX from "../jsx";
import type { WheelConfig } from "../types";
import { TopBar } from "../components/TopBar";
import { getLatestBlockHash } from "src/random.ts";

export function initCreateScreen(root: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const initialHash = params.get("hash") || "";

  const hashInput = (
    <input type="text" value={initialHash} class="form-input" placeholder="Bitcoin Block Hash" />
  ) as HTMLInputElement;
  const contentInput = (
    <textarea class="form-textarea" placeholder="Enter options, one per line. Duplicates increase weight."></textarea>
  ) as HTMLTextAreaElement;

  root.replaceChildren(
    <div class="page-layout centered">
      {TopBar()}
      <div class="container">
        <div class="card">
          <h1>Create Wheel</h1>
          <div class="form-group">
            <label class="form-label">Block Hash:</label>
            {hashInput}
          </div>
          <div class="form-group">
            <label class="form-label">Wheel Contents:</label>
            {contentInput}
          </div>
          <div>
            <button
              type="button"
              onclick={async () => {
                const hash: string = hashInput.value.trim();
                const content = contentInput.value.trim();
                const lines = content
                  .split("\n")
                  .map((l) => l.trim())
                  .filter((l) => l);

                if (lines.length === 0) {
                  alert("Please enter some options.");
                  return;
                }

                const weights: Record<string, number> = {};
                lines.forEach((line) => {
                  weights[line] = (weights[line] || 0) + 1;
                });

                const options = Object.entries(weights).map(([label, weight], index) => ({
                  label,
                  weight,
                  color: `hsl(${(index * 137.508) % 360}, 70%, 50%)`,
                }));

                const config: WheelConfig = {
                  hash: hash || (await getLatestBlockHash()) || undefined,
                  options,
                  actions: [
                    { name: "Google Search", template: "https://www.google.com/search?q={}" },
                    { name: "Bing Search", template: "https://www.bing.com/search?q={}" },
                  ],
                };

                const json = JSON.stringify(config);
                const encoded = encodeURIComponent(json);
                window.location.href = `/?config=${encoded}`;
              }}
            >
              Go to Wheel
            </button>
          </div>
        </div>
      </div>
    </div>,
  );
}
