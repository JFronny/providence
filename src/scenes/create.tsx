import JSX from "../jsx";
import type { HashRef, WheelConfig } from "../types";
import { TopBar } from "../components/TopBar";
import { getLatestBlockHash } from "src/random.ts";

export function initCreateScreen(root: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const initialHash = params.get("hash") || "";

  const hashInput = (
    <input type="text" value={initialHash} class="form-input" placeholder="Latest Block Hash" />
  ) as HTMLInputElement;
  const blockHashGroup = (
    <div class="form-group">
      <label class="form-label">Block Hash:</label>
      {hashInput}
    </div>
  ) as HTMLDivElement;
  const nextHashCheckbox = (
    <input
      type="checkbox"
      class="form-checkbox"
      onchange={(e: InputEvent) => {
        const box = e.target as HTMLInputElement;
        hashInput.disabled = box.checked;
        blockHashGroup.style.display = box.checked ? "none" : "inherit";
      }}
    />
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
            <label class="form-label">
              {nextHashCheckbox}
              Use next hash
            </label>
          </div>
          {blockHashGroup}
          <div class="form-group">
            <label class="form-label">Wheel Contents:</label>
            {contentInput}
          </div>
          <div>
            <button
              type="button"
              onclick={async () => {
                let hash: HashRef = { type: "historic", hash: hashInput.value.trim() };
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

                const options = Object.entries(weights).map(([label, weight]) => ({
                  label,
                  weight,
                }));
                if (nextHashCheckbox.checked) {
                  hash = { type: "next" };
                } else if (!hash.hash) {
                  const latestHash = await getLatestBlockHash();
                  if (latestHash) hash.hash = latestHash;
                  else hash = { type: "current" };
                }
                const config: WheelConfig = {
                  hash: hash,
                  options,
                  actions: [{ name: "Google Search", template: "https://www.google.com/search?q={}" }],
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
