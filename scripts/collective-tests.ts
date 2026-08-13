/**
 * Pure-function checks for collective commit–reveal helpers.
 * Run: pnpm exec vite-node scripts/collective-tests.ts
 */
import {
  assertLocalSealInCommits,
  commitHex,
  decodeCommitList,
  encodeCommitList,
  generateSeal,
  hexToBytes,
  mergeCommits,
  mergeOpens,
  seedFromOpens,
  verifyComplete,
  type StoredSeal,
} from "../src/collective.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const a = await generateSeal();
  const b = await generateSeal();
  assert(a.cHex !== b.cHex, "distinct seals");
  assert((await commitHex(a.r)) === a.cHex, "bind a");
  assert((await commitHex(hexToBytes(a.rHex))) === a.cHex, "bind a hex");

  // Duplicate commit merge
  const m1 = mergeCommits([a.cHex, b.cHex, a.cHex]);
  assert(m1.length === 2, "unique commits");
  assert(m1[0]! < m1[1]!, "sorted commits");
  assert(mergeCommits([b.cHex], a.cHex).join() === m1.join(), "merge mine");

  const enc = encodeCommitList([b.cHex, a.cHex]);
  assert(decodeCommitList(enc).join() === m1.join(), "commit codec");

  // Opens before full set
  const partial = await mergeOpens(m1, [], [a.rHex]);
  assert(partial.ok, "partial ok");
  assert(partial.ok && partial.opens.length === 1, "one open");

  // Bad open
  const bad = await mergeOpens(m1, [], ["00".repeat(16)]);
  assert(!bad.ok, "reject unknown open");

  // Complete
  const full = await mergeOpens(m1, [a.rHex], [b.rHex]);
  assert(full.ok && full.opens.length === 2, "full opens");
  const v = await verifyComplete(m1, full.ok ? full.opens : []);
  assert(v.ok, "verify complete");

  const s1 = await seedFromOpens(full.ok ? full.opens : []);
  const s2 = await seedFromOpens([...(full.ok ? full.opens : [])].reverse());
  assert(s1 === s2, "seed order-independent");
  assert(Number.isInteger(s1) && s1 >= 0 && s1 <= 0xffffffff, "32-bit seed");

  // Mutated open fails verify
  const mutated = full.ok ? [...full.opens] : [];
  if (mutated[0]) {
    const bytes = hexToBytes(mutated[0]);
    bytes[0] ^= 0xff;
    mutated[0] = Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
  }
  const vBad = await verifyComplete(m1, mutated);
  assert(!vBad.ok, "mutated open rejected");

  const sealA: StoredSeal = {
    rHex: a.rHex,
    cHex: a.cHex,
    fingerprint: "fp",
    commitsAtSeal: [a.cHex, b.cHex],
  };
  const okLocal = await assertLocalSealInCommits(sealA, m1);
  assert(okLocal.ok && okLocal.seal, "local seal in full set");
  const missingSelf = await assertLocalSealInCommits(sealA, [b.cHex]);
  assert(!missingSelf.ok, "reject missing own seal");
  const strippedPeer = await assertLocalSealInCommits(sealA, [a.cHex]);
  assert(!strippedPeer.ok, "reject commit set that dropped a seal seen at seal-time");
  const spectator = await assertLocalSealInCommits(null, m1);
  assert(spectator.ok && spectator.seal === null, "spectator ok");

  console.log("collective-tests: all passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
