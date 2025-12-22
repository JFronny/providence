import { getLatestBlockHash, getNonce } from "../random";
import type { WheelConfig } from "../types";
import { WheelModel } from "./wheel/model";
import { WheelView } from "./wheel/view";
import { message } from "src/scenes/message.tsx";

export async function initWheelScreen(root: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const configStr = params.get("config");

  if (!configStr) {
    message(root, "No configuration provided");
    return;
  }

  let config: WheelConfig;
  try {
    config = JSON.parse(configStr);
  } catch (e) {
    message(root, "Error parsing configuration");
    console.error("Error parsing configuration", configStr, e);
    return;
  }
  console.log("Loaded config:", config);

  if (!config.hash) {
    message(root, "Fetching latest block hash...");
    const hash = await getLatestBlockHash();
    if (hash) {
      config.hash = hash;
      const newConfigStr = encodeURIComponent(JSON.stringify(config));
      window.location.href = `/?config=${newConfigStr}`;
    } else {
      message(root, "Failed to fetch latest block hash");
    }
    return;
  }

  const nonce = await getNonce(config.hash);
  if (!nonce) {
    message(root, "Failed to fetch nonce");
    return;
  }

  const model = new WheelModel(config, nonce);
  const view = new WheelView(root);

  view.bindSpin(() => {
    model.spin();
  });

  let lastSectorIndex = -1;
  let animationId: number;

  function update(timestamp: number = performance.now()) {
    const finished = model.update(timestamp);

    if (finished) {
      const winner = model.getCurrentSector();
      if (winner) {
        view.showResult(winner, config.actions, () => {
          // Resume idle spin
          update();
        });
        cancelAnimationFrame(animationId);
        return;
      }
    }

    const currentSector = model.getCurrentSector();
    if (currentSector) {
      // Find index of current sector
      const index = model.sectors.indexOf(currentSector);
      if (index !== -1 && index !== lastSectorIndex) {
        if (model.isSpinning) view.playTick();
        lastSectorIndex = index;
      }
    }

    view.draw(model);
    animationId = requestAnimationFrame(update);
  }

  // Start
  update();
}
