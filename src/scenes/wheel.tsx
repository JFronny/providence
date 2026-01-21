import { cyrb128, getLatestBlockHash, getNonce, pickColor } from "../random";
import type { HashRef, WheelConfig } from "../types";
import { WheelModel } from "./wheel/model";
import { WheelView } from "./wheel/view";
import { message } from "src/scenes/message.tsx";

type ResolvedHash = { hash: string; redirect: boolean };

async function getLatest(message: (message: string) => void): Promise<ResolvedHash | null> {
  message("Fetching latest block hash...");
  const hash = await getLatestBlockHash();
  if (hash) {
    return { hash, redirect: true };
  } else {
    message("Failed to fetch latest block hash");
    return null;
  }
}

export async function resolveHash(ref: HashRef, message: (message: string) => void): Promise<ResolvedHash | null> {
  if (!ref) {
    return getLatest(message);
  } else {
    // this is for legacy API compatibility
    // noinspection SuspiciousTypeOfGuard
    if (typeof ref === "string") {
      return { hash: ref, redirect: false };
    } else
      switch (ref.type) {
        case "current":
          return getLatest(message);
        case "historic":
          return { hash: ref.hash, redirect: false };
        case "next":
          message("Waiting for next block hash");
          const startHash = await getLatestBlockHash();
          if (startHash == null) {
            message("Failed to fetch latest block hash");
            return null;
          }
          let count = 0;
          while (true) {
            count++;
            message(`Waiting for next block hash (${count} polls)`);
            await new Promise((resolve) => setTimeout(resolve, 20000));
            const newHash = await getLatestBlockHash();
            if (newHash && newHash !== startHash) {
              return { hash: newHash, redirect: false };
            }
          }
      }
  }
}

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
  console.log("Loaded config:", structuredClone(config));

  // Normalize
  if (!config.options || config.options.length === 0) {
    config.options = [{ id: "null", label: "Empty Wheel", color: "black" }];
  }
  config.options.forEach((opt) => {
    opt.label = opt.label || opt.id || "null";
    opt.id = opt.id || opt.label;
    opt.weight = Math.max(opt.weight || 0.01, 1);
    opt.color = opt.color || pickColor(cyrb128(opt.id));
  });
  config.options.sort((a, b) => a.label.localeCompare(b.label));
  if (!config.actions) config.actions = [];

  console.log("Normalized config:", config);

  const resolved = await resolveHash(config.hash, (msg) => message(root, msg));
  if (resolved == null) return;
  if (resolved.redirect) {
    config.hash = { hash: resolved.hash, type: "historic" };
    const newConfigStr = encodeURIComponent(JSON.stringify(config));
    window.location.href = `/?config=${newConfigStr}`;
    return;
  }

  const nonce = await getNonce(resolved.hash);
  if (!nonce) {
    message(root, "Failed to fetch nonce");
    return;
  }

  const model = new WheelModel(config, nonce);
  const view = new WheelView(root, resolved.hash);

  view.bind(() => {
    model.spin();
  });

  let lastSectorIndex = -1;
  let animationId: number;

  function update(timestamp: number = performance.now()) {
    const finished = model.update(timestamp);

    if (finished) {
      const winner = model.winningSector;
      if (winner) {
        const removedConfig = structuredClone(config);
        removedConfig.options = config.options.filter((opt) => opt.id !== winner.id);
        const removedUrl =
          config.options.length > 1 ? `/?config=${encodeURIComponent(JSON.stringify(removedConfig))}` : null;
        view.showResult(winner, removedUrl, config.actions, () => {
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
