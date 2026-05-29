import { TopBar } from "src/components/TopBar";
import { getLatestBlockHash } from "src/random.ts";
import type { HashRef, HashSource, WheelConfig } from "src/types";

export function initCreateScreen(root: HTMLElement, _signal?: AbortSignal) {
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
  const sourceSelect = (
    <select class="form-input">
      <option value="Bitcoin">Bitcoin</option>
      <option value="Monero">Monero</option>
    </select>
  ) as HTMLSelectElement;
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
            <label class="form-label">Hash Source:</label>
            {sourceSelect}
          </div>
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
                let hash: HashRef = {
                  type: "historic",
                  hash: hashInput.value.trim(),
                  source: sourceSelect.value as HashSource,
                };
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
                  hash = { type: "next", source: hash.source };
                } else if (!hash.hash) {
                  const latestHash = await getLatestBlockHash(hash.source!);
                  if (latestHash) hash.hash = latestHash;
                  else hash = { type: "current", source: hash.source };
                }
                const config: WheelConfig = {
                  hash: hash,
                  options,
                  actions: [{ name: "Google Search", template: "https://www.google.com/search?q={}" }],
                };

                const json = JSON.stringify(config);
                const encoded = encodeURIComponent(json);
                window.location.href = `/wheel?config=${encoded}`;
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
