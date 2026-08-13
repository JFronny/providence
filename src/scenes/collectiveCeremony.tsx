import {
  assertLocalSealInCommits,
  configFingerprint,
  decodeCommitList,
  decodeOpenList,
  encodeCommitList,
  encodeOpenList,
  ensureSeal,
  loadSeal,
  mergeCommits,
  mergeOpens,
  seedFromOpens,
  shortHex,
  verifyComplete,
  type StoredSeal,
} from "src/collective";
import { TopBar } from "src/components/TopBar";
import { message } from "src/scenes/message.tsx";
import type { WheelConfig } from "src/types";

export type CollectiveComplete = {
  nonce: number;
  commits: string[];
  opens: string[];
  hashLabel: string;
};

function configUrl(config: WheelConfig, fragment?: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = `${base}/wheel?config=${encodeURIComponent(JSON.stringify(config))}`;
  return fragment ? `${path}#${fragment}` : path;
}

async function shareOrCopy(url: string, title: string): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.prompt("Copy link:", url);
  }
}

function parseFragments(): { cc: string | null; cr: string | null } {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return { cc: null, cr: null };
  const sp = new URLSearchParams(raw.includes("=") ? raw : "");
  return { cc: sp.get("cc"), cr: sp.get("cr") };
}

/**
 * Commit–reveal ceremony UI: exactly one primary button on screen.
 * Lock is implicit when the first already-joined participant opens their seal.
 */
export async function runCollectiveCeremony(
  root: HTMLElement,
  config: WheelConfig,
  onComplete: (result: CollectiveComplete) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (config.hash.type !== "collective") return;

  const fingerprint = configFingerprint(config);

  type PendingResult = {
    nonce: number;
    commits: string[];
    opens: string[];
    url: string;
    shared: boolean;
  };

  let pendingResult: PendingResult | null = null;

  async function prepareComplete(commits: string[], opens: string[]): Promise<PendingResult | null> {
    if (!commits.length || !opens.length) return null;
    const verified = await verifyComplete(commits, opens);
    if (!verified.ok) {
      if (opens.length >= commits.length) {
        message(root, verified.error);
        return null;
      }
      return null;
    }
    const local = loadSeal(fingerprint);
    const check = await assertLocalSealInCommits(local, commits);
    if (!check.ok) {
      message(root, check.error);
      return null;
    }
    const nonce = await seedFromOpens(verified.opens);
    if (signal?.aborted) return null;
    config.hash = { type: "collective", commits, opens: verified.opens };
    const url = configUrl(config);
    window.history.replaceState(null, "", url);
    return { nonce, commits, opens: verified.opens, url, shared: false };
  }

  function finishToWheel(result: PendingResult) {
    onComplete({
      nonce: result.nonce,
      commits: result.commits,
      opens: result.opens,
      hashLabel: `collective:${shortHex(result.commits[0] || "")}…`,
    });
  }

  {
    const commits = mergeCommits(config.hash.commits || []);
    const opens = config.hash.opens || [];
    const ready = await prepareComplete(commits, opens);
    if (ready) {
      pendingResult = ready;
    } else if (opens.length >= commits.length && commits.length > 0) {
      // Hard failure already messaged inside prepareComplete when binds fail.
      if (signal?.aborted) return;
    }
  }
  if (signal?.aborted) return;

  const frag = parseFragments();
  let locked = mergeCommits(config.hash.commits || []);
  let commits = locked.length ? locked.slice() : decodeCommitList(frag.cc || "");
  let opens = decodeOpenList(frag.cr || "");
  if (config.hash.opens?.length) {
    const base = locked.length ? locked : commits;
    if (base.length) {
      const early = await mergeOpens(base, opens, config.hash.opens);
      if (early.ok) opens = early.opens;
    }
  }

  // Drop fragment from the bar; share screens put a full URL back via replaceState.
  if (frag.cc || frag.cr) {
    const u = new URL(window.location.href);
    u.hash = "";
    window.history.replaceState(null, "", u.toString());
  }

  let seal: StoredSeal | null = loadSeal(fingerprint);
  let share: { url: string; title: string; blurb: string } | null = null;
  let error = "";
  let openMap = new Map<string, string>();

  const titleEl = (<h1 class="collective-title">Group seals</h1>) as HTMLHeadingElement;
  const leadEl = (<p class="collective-lead"></p>) as HTMLParagraphElement;
  const infoEl = (<p class="collective-status"></p>) as HTMLParagraphElement;
  const errorEl = (<p class="collective-error"></p>) as HTMLParagraphElement;
  const listLabelEl = (
    <p class="collective-list-label">
      <strong>Commitments</strong>
    </p>
  ) as HTMLParagraphElement;
  const listEl = (<ul class="collective-list"></ul>) as HTMLUListElement;
  const actionEl = (<div class="collective-actions"></div>) as HTMLDivElement;

  function renderList(show: string[], showOpenState: boolean) {
    listEl.replaceChildren();
    if (!show.length) {
      listEl.appendChild(<li class="collective-list-empty">No seals yet</li>);
      return;
    }
    for (const c of show) {
      const isMine = !!(seal && c === seal.cHex);
      const isOpen = showOpenState && openMap.has(c);
      const classes = [
        showOpenState ? (isOpen ? "collective-seal-open" : "collective-seal-pending") : "",
        isMine ? "collective-seal-mine" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const state = showOpenState ? (
        <span class="collective-seal-state">{isOpen ? " · open" : " · sealed"}</span>
      ) : null;
      listEl.appendChild(
        <li class={classes || undefined}>
          {shortHex(c, 12)}…{state}
        </li>,
      );
    }
  }

  function primaryButton(label: string, onClick: () => void, disabled = false) {
    return (
      <button type="button" class="btn collective-primary" disabled={disabled || undefined} onclick={onClick}>
        {label}
      </button>
    ) as HTMLButtonElement;
  }

  function enterShare(url: string, title: string, blurb: string) {
    share = { url, title, blurb };
    window.history.replaceState(null, "", url);
  }

  async function lockAndMergeOwnOpen(): Promise<boolean> {
    if (!seal) {
      error = "Seal this device first.";
      return false;
    }

    const candidate = locked.length ? locked : mergeCommits(commits, seal.cHex);
    const check = await assertLocalSealInCommits(seal, candidate);
    if (!check.ok) {
      error = check.error;
      return false;
    }
    if (!check.seal) {
      error = "Seal this device first.";
      return false;
    }
    seal = check.seal;

    if (!locked.length) {
      locked = candidate;
      commits = locked;
      config.hash = { type: "collective", commits: locked };
    }

    const merged = await mergeOpens(locked, opens, [seal.rHex]);
    if (!merged.ok) {
      error = merged.error;
      return false;
    }
    opens = merged.opens;
    openMap = merged.byCommit;
    return true;
  }

  async function paint() {
    if (signal?.aborted) return;
    errorEl.textContent = error;
    error = "";

    if (pendingResult) {
      titleEl.textContent = "Result ready";
      leadEl.textContent =
        "Every seal is open and verified. Share this result link so everyone can open the same wheel. The address bar already holds the full transcript.";
      const localOk = seal && pendingResult.commits.includes(seal.cHex);
      infoEl.textContent = localOk
        ? `${pendingResult.opens.length} seal(s) opened · your seal is included.`
        : `${pendingResult.opens.length} seal(s) opened · no local seal on this device (spectator).`;
      listLabelEl.querySelector("strong")!.textContent = "Opened seals";
      const m = await mergeOpens(pendingResult.commits, pendingResult.opens, []);
      if (m.ok) openMap = m.byCommit;
      renderList(pendingResult.commits, true);
      actionEl.replaceChildren();
      if (!pendingResult.shared) {
        actionEl.appendChild(
          primaryButton("Share result link", () => {
            void (async () => {
              await shareOrCopy(pendingResult!.url, "Providence result");
              pendingResult!.shared = true;
              await paint();
            })();
          }),
        );
      } else {
        actionEl.appendChild(
          primaryButton("Spin the wheel", () => {
            finishToWheel(pendingResult!);
          }),
        );
      }
      return;
    }

    if (!locked.length && seal) {
      commits = mergeCommits(commits, seal.cHex);
      // Keep seal snapshot aware of the growing chain while collecting.
      seal = await ensureSeal(fingerprint, commits);
    }

    if (locked.length) {
      const check = await mergeOpens(locked, opens, []);
      if (check.ok) {
        opens = check.opens;
        openMap = check.byCommit;
      } else {
        errorEl.textContent = check.error;
        openMap = new Map();
      }
      const ready = await prepareComplete(locked, opens);
      if (ready) {
        pendingResult = ready;
        share = null;
        await paint();
        return;
      }
    } else {
      openMap = new Map();
    }

    const showCommits = locked.length ? locked : commits;
    const showOpenState = locked.length > 0;
    listLabelEl.querySelector("strong")!.textContent = showOpenState ? "Seals (open status)" : "Commitments";
    renderList(showCommits, showOpenState);
    actionEl.replaceChildren();

    if (share) {
      titleEl.textContent = "Pass it on";
      leadEl.textContent = share.blurb;
      infoEl.textContent = locked.length
        ? `Opens ${opens.length}/${locked.length}. This page link is what you share.`
        : `Seals in chain: ${showCommits.length}. This page link is what you share.`;
      actionEl.appendChild(
        primaryButton("Share link", () => {
          void shareOrCopy(share!.url, share!.title);
        }),
      );
      return;
    }

    if (!locked.length) {
      if (!seal) {
        titleEl.textContent = "Group seals";
        leadEl.textContent =
          "Each phone seals secret randomness, then you pass one link around. When the link returns to someone already in the chain, they open their seal to lock the list and start reveals.";
        infoEl.textContent = showCommits.length
          ? `${showCommits.length} seal(s) in the link so far. Add yours.`
          : "Start the chain on this phone.";
        actionEl.appendChild(
          primaryButton("Seal my randomness", () => {
            void (async () => {
              seal = await ensureSeal(fingerprint, commits);
              commits = mergeCommits(commits, seal.cHex);
              seal = await ensureSeal(fingerprint, commits);
              enterShare(
                configUrl({ ...config, hash: { type: "collective" } }, `cc=${encodeCommitList(commits)}`),
                "Providence commits",
                "Your seal is in the chain. Share this link with the next person. Wait until everyone has joined before anyone opens a seal.",
              );
              await paint();
            })();
          }),
        );
        return;
      }

      titleEl.textContent = "You’re already in the chain";
      leadEl.textContent =
        "This device already sealed. To add more people, share the page link from the address bar. When everyone is listed, open your seal — that locks the set and starts reveals.";
      infoEl.textContent = `${commits.length} seal(s) listed.`;
      window.history.replaceState(
        null,
        "",
        configUrl({ ...config, hash: { type: "collective" } }, `cc=${encodeCommitList(commits)}`),
      );
      actionEl.appendChild(
        primaryButton("Open my seal", () => {
          void (async () => {
            if (!(await lockAndMergeOwnOpen())) {
              await paint();
              return;
            }
            const ready = await prepareComplete(locked, opens);
            if (ready) {
              pendingResult = ready;
              share = null;
              await paint();
              return;
            }
            enterShare(
              configUrl({ ...config, hash: { type: "collective", commits: locked } }, `cr=${encodeOpenList(opens)}`),
              "Providence reveals",
              "Commitments are locked and your seal is open. Share this reveal link until everyone has opened.",
            );
            await paint();
          })();
        }),
      );
      return;
    }

    // Reveal phase (locked)
    if (!seal) {
      titleEl.textContent = "No local seal";
      leadEl.textContent =
        "This device never sealed for this wheel. Wait for a complete result link, or restart on a phone that joined the commit chain.";
      infoEl.textContent = `Opens ${opens.length}/${locked.length}.`;
      actionEl.appendChild(primaryButton("Cannot open", () => {}, true));
      return;
    }

    {
      const check = await assertLocalSealInCommits(seal, locked);
      if (!check.ok) {
        titleEl.textContent = "Seal check failed";
        leadEl.textContent = check.error;
        infoEl.textContent = `Opens ${opens.length}/${locked.length}.`;
        actionEl.appendChild(primaryButton("Cannot open", () => {}, true));
        return;
      }
    }

    const alreadyOpen = openMap.has(seal.cHex);

    if (!alreadyOpen) {
      titleEl.textContent = "You’re already in the chain";
      leadEl.textContent = "Commitments are locked. Open your seal, then pass the reveal link onward.";
      infoEl.textContent = `Opens ${opens.length}/${locked.length}. Green = open, amber = still sealed.`;
      actionEl.appendChild(
        primaryButton("Open my seal", () => {
          void (async () => {
            if (!(await lockAndMergeOwnOpen())) {
              await paint();
              return;
            }
            const ready = await prepareComplete(locked, opens);
            if (ready) {
              pendingResult = ready;
              share = null;
              await paint();
              return;
            }
            enterShare(
              configUrl({ ...config, hash: { type: "collective", commits: locked } }, `cr=${encodeOpenList(opens)}`),
              "Providence reveals",
              "Your seal is open. Share this link with the next person.",
            );
            await paint();
          })();
        }),
      );
      return;
    }

    const url = configUrl({ ...config, hash: { type: "collective", commits: locked } }, `cr=${encodeOpenList(opens)}`);
    enterShare(
      url,
      "Providence reveals",
      "Your seal is already open on this link. Pass it to anyone who still needs to open.",
    );
    await paint();
  }

  root.replaceChildren(
    <div class="page-layout centered">
      {TopBar()}
      <div class="container">
        <div class="card collective-card">
          {titleEl}
          {leadEl}
          {infoEl}
          {errorEl}
          {listLabelEl}
          {listEl}
          {actionEl}
        </div>
      </div>
    </div>,
  );

  await paint();
}
