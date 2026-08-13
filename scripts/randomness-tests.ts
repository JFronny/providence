/**
 * Randomness experiments for Providence.
 *
 * Runs classical statistical tests on:
 *  1) mulberry32 uniforms (bit-level NIST SP 800-22 style checks)
 *  2) wheel outcomes produced by the real WheelModel pick logic
 *
 * Optional live fetch of recent NIST beacon pulses (no extra runtime deps).
 *
 * Usage:
 *   pnpm test:randomness
 *   pnpm test:randomness -- --samples=20000 --options=6
 *   pnpm test:randomness -- --nist=64
 */
import { mulberry32, seedFromHex } from "../src/random.ts";
import { WheelModel } from "../src/scenes/wheel/model.ts";
import type { WheelConfig, WheelOption } from "../src/types.ts";

// --- CLI -----------------------------------------------------------------

function argInt(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return fallback;
  const n = Number(hit.slice(prefix.length));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const SAMPLES = argInt("samples", 20_000);
const OPTION_COUNT = argInt("options", 6);
const NIST_PULSES = argInt("nist", 0);
const ALPHA = 0.01;

// --- Stats helpers (no external deps) ------------------------------------

/** Upper-tail critical values for chi-square at alpha=0.01 (df -> critical). */
const CHI2_CRIT_01: Record<number, number> = {
  1: 6.634897,
  2: 9.21034,
  3: 11.34487,
  4: 13.2767,
  5: 15.08627,
  6: 16.81189,
  7: 18.47531,
  8: 20.09024,
  9: 21.66599,
  10: 23.20925,
  15: 30.57791,
  20: 37.56623,
  24: 42.97982,
  31: 52.19139,
  63: 92.01004,
};

function chi2Critical(df: number, alpha = ALPHA): number {
  if (alpha !== 0.01) throw new Error("Only alpha=0.01 critical table is embedded");
  if (CHI2_CRIT_01[df] != null) return CHI2_CRIT_01[df];
  // Wilson–Hilferty approximation for missing dfs
  const z = 2.326348; // ~N(0,1) 0.99 quantile
  const h = 2 / (9 * df);
  const term = 1 - h + z * Math.sqrt(h);
  return df * term * term * term;
}

function chiSquare(observed: number[], expected: number[]): { stat: number; df: number } {
  if (observed.length !== expected.length) throw new Error("length mismatch");
  let stat = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] <= 0) continue;
    const d = observed[i] - expected[i];
    stat += (d * d) / expected[i];
  }
  return { stat, df: observed.length - 1 };
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function erfc(x: number): number {
  // Abramowitz and Stegun 7.1.26
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const ans = poly * Math.exp(-z * z);
  return x >= 0 ? ans : 2 - ans;
}

interface TestResult {
  name: string;
  detail: string;
  pass: boolean;
}

function report(r: TestResult) {
  const mark = r.pass ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${r.name}: ${r.detail}`);
}

// --- Classical bit tests on [0,1) stream ---------------------------------

/** NIST SP 800-22 Frequency (Monobit) test on sign bits of uniforms. */
function monobitTest(bits: number[]): TestResult {
  const n = bits.length;
  let s = 0;
  for (const b of bits) s += b === 1 ? 1 : -1;
  const sobs = Math.abs(s) / Math.sqrt(n);
  const p = erfc(sobs / Math.SQRT2);
  return {
    name: "Frequency (monobit)",
    detail: `n=${n} S_obs=${sobs.toFixed(4)} p≈${p.toFixed(4)} (α=${ALPHA})`,
    pass: p >= ALPHA,
  };
}

/** NIST SP 800-22 Runs test (sequence of identical bits). */
function runsTest(bits: number[]): TestResult {
  const n = bits.length;
  const ones = bits.reduce((a, b) => a + b, 0);
  const pi = ones / n;
  // Prerequisite: proportion of ones not too far from 1/2
  const tau = 2 / Math.sqrt(n);
  if (Math.abs(pi - 0.5) >= tau) {
    return {
      name: "Runs",
      detail: `prerequisite failed |π-1/2|=${Math.abs(pi - 0.5).toFixed(4)} ≥ τ=${tau.toFixed(4)}`,
      pass: false,
    };
  }
  let v = 1;
  for (let i = 1; i < n; i++) if (bits[i] !== bits[i - 1]) v++;
  const num = Math.abs(v - 2 * n * pi * (1 - pi));
  const den = 2 * Math.sqrt(2 * n) * pi * (1 - pi);
  const p = erfc(num / den);
  return {
    name: "Runs",
    detail: `V_n=${v} π=${pi.toFixed(4)} p≈${p.toFixed(4)} (α=${ALPHA})`,
    pass: p >= ALPHA,
  };
}

/**
 * Chi-square goodness-of-fit on k equal bins of U(0,1) samples
 * (equidistribution / frequency test on continuous uniforms).
 */
function uniformBinsTest(samples: number[], bins = 16): TestResult {
  const counts = Array.from({ length: bins }, () => 0);
  for (const u of samples) {
    const b = Math.min(bins - 1, Math.floor(u * bins));
    counts[b]++;
  }
  const expected = samples.length / bins;
  const { stat, df } = chiSquare(
    counts,
    counts.map(() => expected),
  );
  const crit = chi2Critical(df);
  return {
    name: `Uniform bin frequency (k=${bins})`,
    detail: `χ²=${stat.toFixed(3)} df=${df} crit₀.₀₁=${crit.toFixed(3)}`,
    pass: stat <= crit,
  };
}

/**
 * Serial (overlapping pairs) test: counts of (floor(u*m), floor(v*m)) pairs.
 * Detects dependence between successive uniforms.
 */
function serialPairsTest(samples: number[], m = 4): TestResult {
  const cells = m * m;
  const counts = Array.from({ length: cells }, () => 0);
  for (let i = 0; i + 1 < samples.length; i++) {
    const a = Math.min(m - 1, Math.floor(samples[i] * m));
    const b = Math.min(m - 1, Math.floor(samples[i + 1] * m));
    counts[a * m + b]++;
  }
  const nPairs = samples.length - 1;
  const expected = nPairs / cells;
  const { stat, df } = chiSquare(
    counts,
    counts.map(() => expected),
  );
  const crit = chi2Critical(df);
  return {
    name: `Serial pairs (m=${m})`,
    detail: `χ²=${stat.toFixed(3)} df=${df} crit₀.₀₁=${crit.toFixed(3)}`,
    pass: stat <= crit,
  };
}

// --- Wheel outcome generation via real model -----------------------------

function equalOptions(n: number): WheelOption[] {
  return Array.from({ length: n }, (_, i) => ({
    label: `O${i}`,
    id: String(i),
    weight: 1,
  }));
}

function weightedOptions(): WheelOption[] {
  // Matches a typical "who does dishes" style imbalance
  return [
    { label: "A", id: "A", weight: 1 },
    { label: "B", id: "B", weight: 1 },
    { label: "C", id: "C", weight: 2 },
    { label: "D", id: "D", weight: 3 },
  ];
}

function makeConfig(options: WheelOption[]): WheelConfig {
  return {
    hash: { type: "historic", hash: "test", source: "Bitcoin" },
    options,
    actions: [],
  };
}

/**
 * One production-equivalent first-spin outcome for a base seed (nonce).
 * Uses WheelModel.spinSeed + pickWinnerIndex + mulberry32 exactly as spin().
 */
function wheelOutcomeIndex(baseSeed: number, options: WheelOption[]): number {
  const model = new WheelModel(makeConfig(options), baseSeed >>> 0);
  const rand = mulberry32(model.spinSeed(0));
  return model.pickWinnerIndex(rand);
}

function wheelFrequencyTest(name: string, seeds: number[], options: WheelOption[]): TestResult {
  const k = options.length;
  const counts = Array.from({ length: k }, () => 0);
  for (const seed of seeds) {
    counts[wheelOutcomeIndex(seed, options)]++;
  }
  const totalWeight = options.reduce((s, o) => s + (o.weight ?? 1), 0);
  const expected = options.map((o) => (seeds.length * (o.weight ?? 1)) / totalWeight);
  const { stat, df } = chiSquare(counts, expected);
  const crit = chi2Critical(df);
  const freq = counts.map((c, i) => `${options[i].label}:${c}`).join(" ");
  return {
    name,
    detail: `χ²=${stat.toFixed(3)} df=${df} crit₀.₀₁=${crit.toFixed(3)} | ${freq}`,
    pass: stat <= crit,
  };
}

// --- NIST live sample (optional) -----------------------------------------

async function fetchNistSeeds(count: number): Promise<number[]> {
  const lastRes = await fetch("https://beacon.nist.gov/beacon/2.0/pulse/last");
  if (!lastRes.ok) throw new Error(`NIST last pulse HTTP ${lastRes.status}`);
  const last = await lastRes.json();
  const chain = last.pulse.chainIndex as number;
  const tip = last.pulse.pulseIndex as number;
  const seeds: number[] = [];
  // Walk backwards from tip; sequential GETs (beacon is public, keep volume modest).
  for (let i = 0; i < count; i++) {
    const pulseIndex = tip - i;
    if (pulseIndex < 1) break;
    const res = await fetch(`https://beacon.nist.gov/beacon/2.0/chain/${chain}/pulse/${pulseIndex}`);
    if (!res.ok) {
      console.warn(`  skip pulse ${chain}/${pulseIndex}: HTTP ${res.status}`);
      continue;
    }
    const data = await res.json();
    seeds.push(seedFromHex(data.pulse.outputValue));
    if ((i + 1) % 16 === 0 || i + 1 === count) {
      console.log(`  fetched ${i + 1}/${count} NIST pulses…`);
    }
  }
  return seeds;
}

// --- Main ----------------------------------------------------------------

function bitsFromUniforms(us: number[]): number[] {
  // Use the top bit of the float mantissa-ish: u >= 0.5
  return us.map((u) => (u >= 0.5 ? 1 : 0));
}

function generateMulberryStream(seed: number, n: number): number[] {
  const rand = mulberry32(seed >>> 0);
  const out = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n; i++) out[i] = rand();
  return out;
}

async function main() {
  console.log("Providence randomness experiments");
  console.log(`samples=${SAMPLES} options=${OPTION_COUNT} alpha=${ALPHA} nist=${NIST_PULSES || "off"}`);
  console.log("");

  let failed = 0;

  // 1) PRNG bit / uniform tests
  console.log("### mulberry32 stream (seed=0xC0FFEE)");
  const uniforms = generateMulberryStream(0xc0ffee, SAMPLES);
  const bitTests = [
    monobitTest(bitsFromUniforms(uniforms)),
    runsTest(bitsFromUniforms(uniforms)),
    uniformBinsTest(uniforms, 16),
    serialPairsTest(uniforms, 4),
  ];
  for (const t of bitTests) {
    report(t);
    if (!t.pass) failed++;
  }
  console.log(`  mean(U)=${mean(uniforms).toFixed(6)} (expect ~0.5)`);
  console.log("");

  // 2) Wheel model — equal weights, independent base seeds (simulates distinct nonces)
  console.log("### WheelModel outcomes (equal weights, independent base seeds)");
  const eq = equalOptions(OPTION_COUNT);
  const independentSeeds = Array.from({ length: SAMPLES }, (_, i) => (Math.imul(i + 1, 0x9e3779b1) >>> 0) ^ 0x85ebca6b);
  const tEq = wheelFrequencyTest(`Equal-weight χ² (${OPTION_COUNT} sectors)`, independentSeeds, eq);
  report(tEq);
  if (!tEq.pass) failed++;
  console.log("");

  // 3) Wheel model — weighted sectors
  console.log("### WheelModel outcomes (weighted sectors 1:1:2:3)");
  const wopts = weightedOptions();
  const tW = wheelFrequencyTest("weighted χ²", independentSeeds, wopts);
  report(tW);
  if (!tW.pass) failed++;
  console.log("");

  // 4) Same base seed, successive respins (respinCount stream) — still should be fair
  console.log("### WheelModel outcomes (fixed nonce, successive respins)");
  {
    const baseSeed = 0x12345678;
    const model = new WheelModel(makeConfig(eq), baseSeed);
    const counts = Array.from({ length: eq.length }, () => 0);
    for (let r = 0; r < SAMPLES; r++) {
      const rand = mulberry32(model.spinSeed(r));
      counts[model.pickWinnerIndex(rand)]++;
    }
    const expected = counts.map(() => SAMPLES / eq.length);
    const { stat, df } = chiSquare(counts, expected);
    const crit = chi2Critical(df);
    const t: TestResult = {
      name: "respin stream equal-weight χ²",
      detail: `χ²=${stat.toFixed(3)} df=${df} crit₀.₀₁=${crit.toFixed(3)}`,
      pass: stat <= crit,
    };
    report(t);
    if (!t.pass) failed++;
  }
  console.log("");

  // 5) Optional live NIST pulse seeds → wheel
  if (NIST_PULSES > 0) {
    console.log(`### Live NIST beacon pulses → wheel (n=${NIST_PULSES})`);
    try {
      const nistSeeds = await fetchNistSeeds(NIST_PULSES);
      console.log(`  got ${nistSeeds.length} seeds; mean32=${mean(nistSeeds).toFixed(2)}`);
      // Bit test on LSB of seeds
      const lsb = nistSeeds.map((s) => s & 1);
      const tBits = monobitTest(lsb);
      report(tBits);
      if (!tBits.pass) failed++;
      if (nistSeeds.length >= OPTION_COUNT * 5) {
        const tNist = wheelFrequencyTest("NIST seeds equal-weight χ²", nistSeeds, eq);
        report(tNist);
        if (!tNist.pass) failed++;
      } else {
        console.log("  skip wheel χ² (too few NIST samples for reliable df)");
      }
    } catch (e) {
      console.error("  NIST fetch failed:", e);
      failed++;
    }
    console.log("");
  }

  console.log(failed === 0 ? "All tests passed." : `${failed} test(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

await main();
