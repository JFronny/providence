import { cyrb128, getLatestBlockHash, getNonce, pickColor } from "src/random";
import { message } from "src/scenes/message.tsx";
import { WheelModel } from "src/scenes/wheel/model";
import { WheelView } from "src/scenes/wheel/view";
import { DefaultHashSource, type HashRef, type HashSource, type WheelConfig } from "src/types";

type ResolvedHash = { hash: string; redirect: boolean };

async function getLatest(
  source: HashSource,
  message: (message: string) => void,
  signal?: AbortSignal,
): Promise<ResolvedHash | null> {
  if (signal?.aborted) return null;
  message("Fetching latest block hash...");
  const hash = await getLatestBlockHash(source);
  if (signal?.aborted) return null;
  if (hash) {
    return { hash, redirect: true };
  } else {
    message("Failed to fetch latest block hash");
    return null;
  }
}

export async function resolveHash(
  ref: HashRef,
  message: (message: string) => void,
  signal?: AbortSignal,
): Promise<ResolvedHash | null> {
  if (signal?.aborted) return null;
  if (!ref) {
    return getLatest(DefaultHashSource, message, signal);
  } else {
    // this is for legacy API compatibility
    // noinspection SuspiciousTypeOfGuard
    if (typeof ref === "string") {
      return { hash: ref, redirect: false };
    } else
      switch (ref.type) {
        case "current":
          return getLatest(ref.source || DefaultHashSource, message, signal);
        case "historic":
          return { hash: ref.hash, redirect: false };
        case "next":
          message("Waiting for next block hash");
          const startHash = await getLatestBlockHash(ref.source || DefaultHashSource);
          if (startHash == null) {
            message("Failed to fetch latest block hash");
            return null;
          }
          let count = 0;
          while (true) {
            if (signal?.aborted) return null;
            count++;
            message(`Waiting for next block hash (${count} polls)`);
            await new Promise((resolve) => setTimeout(resolve, 20000));
            if (signal?.aborted) return null;
            const newHash = await getLatestBlockHash(ref.source || DefaultHashSource);
            if (newHash && newHash !== startHash) {
              console.log("Got new block hash:", newHash);
              return { hash: newHash, redirect: true };
            } else {
              console.log("Did not get new block hash, retrying...");
            }
          }
      }
  }
}

export async function initWheelScreen(root: HTMLElement, signal?: AbortSignal) {
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

  const resolved = await resolveHash(
    config.hash,
    (msg) => {
      if (!signal?.aborted) message(root, msg);
    },
    signal,
  );
  if (resolved == null || signal?.aborted) return;
  if (resolved.redirect) {
    console.log("Redirecting with resolved hash:", resolved.hash);
    config.hash = { hash: resolved.hash, type: "historic", source: config.hash.source };
    const newConfigStr = encodeURIComponent(JSON.stringify(config));
    window.location.href = `${import.meta.env.BASE_URL}?config=${newConfigStr}`;
    return;
  }

  const nonce = await getNonce(resolved.hash, config.hash.source || DefaultHashSource);
  if (signal?.aborted) return;
  if (!nonce) {
    message(root, "Failed to fetch nonce");
    return;
  }

  const model = new WheelModel(config, nonce);
  const view = new WheelView(root, resolved.hash, config.hash.source || DefaultHashSource);

  view.bind(() => {
    model.spin();
  });

  let lastSectorIndex = -1;
  let animationId: number;

  function update(timestamp: number = performance.now()) {
    if (signal?.aborted) {
      cancelAnimationFrame(animationId);
      return;
    }
    const finished = model.update(timestamp);

    if (finished) {
      const winner = model.winningSector;
      if (winner) {
        const removedConfig = structuredClone(config);
        removedConfig.options = config.options.filter((opt) => opt.id !== winner.id);
        const removedUrl =
          config.options.length > 1
            ? `${import.meta.env.BASE_URL}?config=${encodeURIComponent(JSON.stringify(removedConfig))}`
            : null;
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
