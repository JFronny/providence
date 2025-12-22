export async function getLatestBlockHash(): Promise<string | null> {
  try {
    const hashResponse = await fetch("https://blockstream.info/api/blocks/tip/hash");
    return await hashResponse.text();
  } catch (error) {
    console.error("Failed to fetch Bitcoin hash:", error);
    return null;
  }
}

export async function getNonce(blockHash: string): Promise<number | null> {
  try {
    const blockResponse = await fetch(`https://blockstream.info/api/block/${blockHash}`);
    const blockData = await blockResponse.json();
    return blockData.nonce; // This is a 32-bit integer (e.g., 2516440237)
  } catch (error) {
    console.error("Failed to fetch Bitcoin nonce:", error);
    return null;
  }
}

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cyrb128(str: string) {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
}

export function pickColor(seed: number) {
  const rand = mulberry32(seed);
  const L = rand() * 0.8;
  const C = rand() * 1.32;
  const H = (rand() * 360) % 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)}deg)`;
}
