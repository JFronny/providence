export async function getLatestBlockHash(): Promise<string | null> {
  try {
    const hashResponse = await fetch('https://blockstream.info/api/blocks/tip/hash');
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
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
