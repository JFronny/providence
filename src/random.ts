import type {HashSource} from "src/types.ts";

/**
 * Get the latest block hash from a blockchain source
 * @param source blockchain source
 * @returns block hash
 */
export async function getLatestBlockHash(source: HashSource): Promise<string | null> {
  try {
    switch (source) {
      case "Bitcoin":
        const bitcoinResponse = await fetch("https://blockstream.info/api/blocks/tip/hash");
        return await bitcoinResponse.text();
      case "Monero":
        const moneroResponse = await fetch("https://xmrchain.net/api/networkinfo"); // localmonero.co doesn't provide block hashes
        const moneroData = await moneroResponse.json();
        return moneroData.data.top_block_hash;
    }
  } catch (error) {
    console.error("Failed to fetch Bitcoin hash:", error);
    return null;
  }
}

/**
 * Get the nonce of a block hash
 * @param blockHash block hash
 * @param source blockchain source
 * @returns 32-bit integer nonce
 */
export async function getNonce(blockHash: string, source: HashSource): Promise<number | null> {
  try {
    const proxyUrl = "https://corsproxy.io/?";
    switch (source) {
      case "Bitcoin":
        const bitcoinResponse = await fetch(`https://blockstream.info/api/block/${blockHash}`);
        const bitcoinData = await bitcoinResponse.json();
        return bitcoinData.nonce;
      case "Monero":
        const targetUrl = `https://localmonero.co/blocks/api/get_block_header/${blockHash}`;
        const moneroResponse = await fetch(proxyUrl + encodeURIComponent(targetUrl)); // xmrchain.net doesn't provide nonces
        const moneroData = await moneroResponse.json();
        return moneroData.block_header.nonce;
    }
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
  const H = (rand() * 360) % 360;
  return `hsl(${H.toFixed(1)}, 70%, 45%)`;
}
