import {getLatestBlockHash, getNonce} from "../random";
import type {WheelConfig} from "../types";
import { WheelModel } from "./wheel/model";
import { WheelView } from "./wheel/view";
import JSX from "src/jsx.ts";

export async function initWheelScreen(root: HTMLElement) {
  const params = new URLSearchParams(window.location.search);
  const configStr = params.get("config");

  if (!configStr) {
    root.replaceChildren(<h1>Invalid Configuration</h1>);
    return;
  }

  let config: WheelConfig;
  try {
    config = JSON.parse(configStr);
  } catch (e) {
    root.replaceChildren(<h1>Error parsing configuration</h1>);
    console.error("Error parsing configuration", configStr, e);
    return;
  }
  console.log("Loaded config:", config);

  if (!config.hash) {
    root.replaceChildren(<h1>Fetching latest hash...</h1>);
    const hash = await getLatestBlockHash();
    if (hash) {
      config.hash = hash;
      const newConfigStr = encodeURIComponent(JSON.stringify(config));
      window.location.href = `/?config=${newConfigStr}`;
    } else {
      root.replaceChildren(<h1>Failed to fetch hash</h1>);
    }
    return;
  }

  const nonce = await getNonce(config.hash);
  if (!nonce) {
    root.replaceChildren(<h1>Failed to fetch nonce</h1>);
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

