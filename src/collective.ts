import { cyrb128, seedFromHex } from "src/random.ts";
import type { WheelConfig, WheelOption } from "src/types.ts";

const SEAL_BYTES = 16;
const HEX_RE = /^[0-9a-f]+$/;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().replace(/^0x/, "");
  if (!HEX_RE.test(clean) || clean.length % 2 !== 0) {
    throw new Error("Invalid hex");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function commitHex(r: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", r.slice().buffer as ArrayBuffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function generateSeal(): Promise<{ r: Uint8Array; rHex: string; cHex: string }> {
  const r = new Uint8Array(SEAL_BYTES);
  crypto.getRandomValues(r);
  const cHex = await commitHex(r);
  return { r, rHex: bytesToHex(r), cHex };
}

/** Sorted unique lowercase hex commitments. */
export function mergeCommits(list: string[], mine?: string | null): string[] {
  const set = new Set<string>();
  for (const c of list) {
    const n = normalizeCommit(c);
    if (n) set.add(n);
  }
  if (mine) {
    const n = normalizeCommit(mine);
    if (n) set.add(n);
  }
  return [...set].sort();
}

function normalizeCommit(c: string): string | null {
  const n = c.trim().toLowerCase().replace(/^0x/, "");
  if (!HEX_RE.test(n) || n.length !== 64) return null;
  return n;
}

function normalizeOpen(r: string): string | null {
  const n = r.trim().toLowerCase().replace(/^0x/, "");
  if (!HEX_RE.test(n) || n.length !== SEAL_BYTES * 2) return null;
  return n;
}

export type MergeOpensResult =
  | { ok: true; opens: string[]; byCommit: Map<string, string> }
  | { ok: false; error: string };

/**
 * Merge open secrets against a locked commitment set.
 * Each open must hash to a locked commit; unknowns and bind failures are rejected.
 */
export async function mergeOpens(
  lockedCommits: string[],
  opensSoFar: string[],
  newOpens: string[],
): Promise<MergeOpensResult> {
  const locked = new Set(mergeCommits(lockedCommits));
  if (locked.size === 0) {
    return { ok: false, error: "No locked commitments" };
  }

  const byCommit = new Map<string, string>();

  async function addOpen(rHexRaw: string): Promise<string | null> {
    const rHex = normalizeOpen(rHexRaw);
    if (!rHex) return "Invalid open encoding";
    const cHex = await commitHex(hexToBytes(rHex));
    if (!locked.has(cHex)) {
      return "Open does not match any locked commitment";
    }
    const prev = byCommit.get(cHex);
    if (prev && prev !== rHex) {
      return "Conflicting open for the same commitment";
    }
    byCommit.set(cHex, rHex);
    return null;
  }

  for (const o of opensSoFar) {
    const err = await addOpen(o);
    if (err) return { ok: false, error: err };
  }
  for (const o of newOpens) {
    const err = await addOpen(o);
    if (err) return { ok: false, error: err };
  }

  // Canonical open order: sorted by commitment
  const opens = [...byCommit.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([, r]) => r);

  return { ok: true, opens, byCommit };
}

export async function verifyComplete(
  commits: string[],
  opens: string[],
): Promise<{ ok: true; opens: string[] } | { ok: false; error: string }> {
  const locked = mergeCommits(commits);
  if (locked.length === 0) return { ok: false, error: "Empty commitment set" };
  const merged = await mergeOpens(locked, opens, []);
  if (!merged.ok) return merged;
  if (merged.byCommit.size !== locked.length) {
    return {
      ok: false,
      error: `Incomplete opens (${merged.byCommit.size}/${locked.length})`,
    };
  }
  for (const c of locked) {
    if (!merged.byCommit.has(c)) {
      return { ok: false, error: "Missing open for a locked commitment" };
    }
  }
  return { ok: true, opens: merged.opens };
}

/** Fold all opens into one 32-bit seed (SHA-256 of sorted raw opens, then seedFromHex). */
export async function seedFromOpens(openHexes: string[]): Promise<number> {
  const sorted = openHexes
    .map((o) => normalizeOpen(o)!)
    .filter(Boolean)
    .sort();
  if (sorted.length === 0) throw new Error("No opens");
  const parts = sorted.map((h) => hexToBytes(h));
  let total = 0;
  for (const p of parts) total += p.length;
  const concat = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    concat.set(p, off);
    off += p.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", concat.buffer as ArrayBuffer);
  return seedFromHex(bytesToHex(new Uint8Array(digest)));
}

/** Stable fingerprint of wheel options (not commits/opens) for local seal storage. */
export function configFingerprint(config: Pick<WheelConfig, "options" | "actions">): string {
  const options = config.options.map((o) => normalizeOption(o)).sort((a, b) => a.id.localeCompare(b.id));
  const actions = (config.actions || []).map((a) => ({ name: a.name, template: a.template }));
  return String(cyrb128(JSON.stringify({ options, actions })));
}

function normalizeOption(o: WheelOption): { id: string; label: string; weight: number } {
  const label = o.label || o.id || "null";
  const id = o.id || label;
  return { id, label, weight: Math.max(o.weight || 0.01, 1) };
}

const STORAGE_PREFIX = "providence.collective.seal.";

export type StoredSeal = {
  rHex: string;
  cHex: string;
  fingerprint: string;
  /** Commitments known when this device sealed (must remain ⊆ later lock). */
  commitsAtSeal?: string[];
};

export function loadSeal(fingerprint: string): StoredSeal | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + fingerprint);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSeal;
    if (!parsed?.rHex || !parsed?.cHex || parsed.fingerprint !== fingerprint) return null;
    if (parsed.commitsAtSeal) {
      parsed.commitsAtSeal = mergeCommits(parsed.commitsAtSeal);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSeal(seal: StoredSeal): void {
  localStorage.setItem(STORAGE_PREFIX + seal.fingerprint, JSON.stringify(seal));
}

export function clearSeal(fingerprint: string): void {
  localStorage.removeItem(STORAGE_PREFIX + fingerprint);
}

export async function ensureSeal(fingerprint: string, commitsAtSeal?: string[]): Promise<StoredSeal> {
  const existing = loadSeal(fingerprint);
  if (existing) {
    const c = await commitHex(hexToBytes(existing.rHex));
    if (c === existing.cHex) {
      // Refresh snapshot if we learned more commits while still collecting.
      if (commitsAtSeal?.length) {
        const next = mergeCommits([...(existing.commitsAtSeal || [existing.cHex]), ...commitsAtSeal, existing.cHex]);
        if (!existing.commitsAtSeal || next.join(".") !== existing.commitsAtSeal.join(".")) {
          existing.commitsAtSeal = next;
          saveSeal(existing);
        }
      }
      return existing;
    }
  }
  const gen = await generateSeal();
  const seal: StoredSeal = {
    rHex: gen.rHex,
    cHex: gen.cHex,
    fingerprint,
    commitsAtSeal: mergeCommits([...(commitsAtSeal || []), gen.cHex]),
  };
  saveSeal(seal);
  return seal;
}

/**
 * Confirm local seal still binds and is present in `commits`, and that every
 * commitment known at seal time is still in the set (no silent removal/swap).
 */
export async function assertLocalSealInCommits(
  seal: StoredSeal | null,
  commits: string[],
): Promise<{ ok: true; seal: StoredSeal } | { ok: false; error: string } | { ok: true; seal: null }> {
  if (!seal) return { ok: true, seal: null };
  const locked = mergeCommits(commits);
  let c: string;
  try {
    c = await commitHex(hexToBytes(seal.rHex));
  } catch {
    return { ok: false, error: "Local seal is corrupted. Start a new round on this device." };
  }
  if (c !== seal.cHex) {
    return { ok: false, error: "Local seal no longer binds. Start a new round on this device." };
  }
  if (!locked.includes(seal.cHex)) {
    return {
      ok: false,
      error: "Your seal is missing from this commitment set. Do not trust this link; start a new round.",
    };
  }
  const baseline = mergeCommits(seal.commitsAtSeal || [seal.cHex]);
  for (const prev of baseline) {
    if (!locked.includes(prev)) {
      return {
        ok: false,
        error:
          "The commitment set changed since you sealed (a seal is missing). Do not trust this link; start a new round.",
      };
    }
  }
  return { ok: true, seal };
}

/** Compact commit list for URL fragments: c1.c2.c3 */
export function encodeCommitList(commits: string[]): string {
  return mergeCommits(commits).join(".");
}

export function decodeCommitList(payload: string): string[] {
  if (!payload) return [];
  return mergeCommits(payload.split(/[.,]/).filter(Boolean));
}

/** Compact opens: r1.r2 (sorted later by verify) */
export function encodeOpenList(opens: string[]): string {
  const uniq = new Set<string>();
  for (const o of opens) {
    const n = normalizeOpen(o);
    if (n) uniq.add(n);
  }
  return [...uniq].sort().join(".");
}

export function decodeOpenList(payload: string): string[] {
  if (!payload) return [];
  const out: string[] = [];
  for (const part of payload.split(/[.,]/)) {
    const n = normalizeOpen(part);
    if (n) out.push(n);
  }
  return out;
}

export function shortHex(hex: string, n = 8): string {
  return hex.slice(0, n);
}
