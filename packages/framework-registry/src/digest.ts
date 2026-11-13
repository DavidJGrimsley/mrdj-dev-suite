/**
 * Browser-safe deterministic SHA-256 hashing and canonical plan serialization.
 *
 * Produces identical digests across Node.js, Web Browsers, Workers, and edge runtimes
 * without any native binary or Node runtime dependencies.
 */

import type { GenerationPlan } from './types.js';

/**
 * Standard SHA-256 implementation in pure TypeScript.
 */
function sha256(ascii: string): string {
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  // UTF-8 encode input
  const utf8: number[] = [];
  for (let idx = 0; idx < ascii.length; idx++) {
    let charcode = ascii.charCodeAt(idx);
    if (charcode < 0x80) {
      utf8.push(charcode);
    } else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      idx++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (ascii.charCodeAt(idx) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }

  const utf8BitLength = utf8.length * 8;
  for (i = 0; i < utf8.length; i++) {
    const wordIdx = i >> 2;
    words[wordIdx] = ((words[wordIdx] ?? 0) | ((utf8[i] ?? 0) << (24 - (i % 4) * 8))) >>> 0;
  }
  const endWordIdx = utf8.length >> 2;
  words[endWordIdx] = ((words[endWordIdx] ?? 0) | (0x80 << (24 - (utf8.length % 4) * 8))) >>> 0;
  words[(((utf8.length + 8) >> 6) << 4) + 15] = utf8BitLength;

  const w = new Array(64);
  for (i = 0; i < words.length; i += 16) {
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = (words[j + i] ?? 0) | 0;
      } else {
        const gamma0 =
          ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^
          ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^
          (w[j - 15] >>> 3);
        const gamma1 =
          ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^
          ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^
          (w[j - 2] >>> 10);
        w[j] = (((gamma1 + (w[j - 7] | 0)) | 0) + ((gamma0 + (w[j - 16] | 0)) | 0)) | 0;
      }

      const s1 =
        ((hash[4]! >>> 6) | (hash[4]! << 26)) ^
        ((hash[4]! >>> 11) | (hash[4]! << 21)) ^
        ((hash[4]! >>> 25) | (hash[4]! << 7));
      const ch = (hash[4]! & hash[5]!) ^ (~hash[4]! & hash[6]!);
      const temp1 = (((hash[7]! + s1) | 0) + ((ch + (k[j]! + (w[j] | 0))) | 0)) | 0;
      const s0 =
        ((hash[0]! >>> 2) | (hash[0]! << 30)) ^
        ((hash[0]! >>> 13) | (hash[0]! << 19)) ^
        ((hash[0]! >>> 22) | (hash[0]! << 10));
      const maj = (hash[0]! & hash[1]!) ^ (hash[0]! & hash[2]!) ^ (hash[1]! & hash[2]!);
      const temp2 = (s0 + maj) | 0;

      hash = [(temp1 + temp2) | 0, hash[0]!, hash[1]!, hash[2]!, (hash[3]! + temp1) | 0, hash[4]!, hash[5]!, hash[6]!];
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j]! + oldHash[j]!) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i]! >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Recursively sort keys of an object to produce deterministic canonical JSON.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite JSON number');
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('Value is not JSON');
    return encoded;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([_, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const serializedProps = entries.map(
    ([k, v]) => `${JSON.stringify(k)}:${canonicalizeJson(v)}`
  );

  return `{${serializedProps.join(',')}}`;
}

/**
 * Computes standard SHA-256 hex digest for any string.
 */
export function computeSha256(text: string): string {
  return sha256(text);
}

/**
 * Computes the immutable, deterministic plan digest for a GenerationPlan.
 *
 * Excludes transient or non-reproducible fields (such as `planDigest` itself)
 * and normalizes all properties canonically.
 */
export function computePlanDigest(
  plan: Omit<GenerationPlan, 'planDigest'> | GenerationPlan
): string {
  const { planDigest: _digest, ...content } = plan as GenerationPlan;
  const canonicalRepresentation = { ...content, targetPlatforms: [...plan.targetPlatforms].sort() };

  const canonicalJson = canonicalizeJson(canonicalRepresentation);
  return computeSha256(canonicalJson);
}

/**
 * Verifies if an approval digest strictly matches a generation plan's digest.
 */
export function verifyPlanApproval(
  plan: GenerationPlan,
  approvedDigest: string
): { approved: boolean; expectedDigest: string; actualDigest: string } {
  const expectedDigest = computePlanDigest(plan);
  const actualDigest = approvedDigest.trim().toLowerCase();
  return {
    approved: plan.planDigest === expectedDigest && expectedDigest === actualDigest,
    expectedDigest,
    actualDigest,
  };
}
