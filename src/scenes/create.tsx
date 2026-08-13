import { HashSourceSelect } from "src/components/HashSourceSelect.tsx";
import { TopBar } from "src/components/TopBar";
import { getLatestBlockHash } from "src/random.ts";
import type { HashRef, WheelConfig } from "src/types";

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
  const sourceSelect = new HashSourceSelect();
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
  const beaconControls = (
    <div>
      {sourceSelect.element}
      <div class="form-group">
        <label class="form-label">
          {nextHashCheckbox}
          Use next hash
        </label>
      </div>
      {blockHashGroup}
    </div>
  ) as HTMLDivElement;

  const modeSelect = (
    <select class="form-input">
      <option value="beacon">Public beacon</option>
      <option value="collective">Group seals</option>
    </select>
  ) as HTMLSelectElement;

  const modeHelp = (
    <p class="form-hint">
      Group seals: each phone seals secret randomness, then you pass one link around (commits, then reveals).<br/>
      Fair if at least one person is honest. Someone can still abort and force a retry after seeing opens.
    </p>
  ) as HTMLParagraphElement;

  function syncModeUi() {
    const collective = modeSelect.value === "collective";
    beaconControls.style.display = collective ? "none" : "";
    modeHelp.style.display = collective ? "" : "none";
  }
  modeSelect.onchange = () => syncModeUi();
  syncModeUi();

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
            <label class="form-label">Randomness:</label>
            {modeSelect}
            {modeHelp}
          </div>
          {beaconControls}
          <div class="form-group">
            <label class="form-label">Wheel Contents:</label>
            {contentInput}
          </div>
          <div>
            <button
              type="button"
              onclick={async () => {
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

                let hash: HashRef;
                if (modeSelect.value === "collective") {
                  hash = { type: "collective" };
                } else {
                  hash = {
                    type: "historic",
                    hash: hashInput.value.trim(),
                    source: sourceSelect.value,
                  };
                  if (nextHashCheckbox.checked) {
                    hash = { type: "next", source: sourceSelect.value };
                  } else if (!hash.hash) {
                    const latestHash = await getLatestBlockHash(sourceSelect.value);
                    if (latestHash) hash.hash = latestHash;
                    else hash = { type: "current", source: sourceSelect.value };
                  }
                }

                const config: WheelConfig = {
                  hash,
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
