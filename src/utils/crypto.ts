import { useEffect, useRef, useState } from 'react';

export function formatTimestamp(ts?: string | number): string {
  if (!ts || Number(ts) === 0) return '';
  const date = new Date(1000 * Number(ts));
  if (isNaN(date.getTime())) return '';
  const dayPart = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${dayPart} • ${timePart}`;
}

export function formatDuration(seconds?: string | number): string {
  const num = Number(seconds);
  if (!num || isNaN(num) || num <= 0) return '';
  const h = Math.floor(num / 3600);
  const m = Math.floor((num % 3600) / 60);
  const s = Math.floor(num % 60);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${String(s).padStart(2, '0')}`;
}

const SBOX = new Uint8Array([
  99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118,
  202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192,
  183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21,
  4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117,
  9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132,
  83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207,
  208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168,
  81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210,
  205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115,
  96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219,
  224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121,
  231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8,
  186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138,
  112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158,
  225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223,
  140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22,
]);

const INV_SBOX = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  INV_SBOX[SBOX[i]] = i;
}

const RCON = new Uint8Array([0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54]);

function gfMul(a: number, b: number): number {
  let result = 0;
  let x = a;
  let y = b;
  for (let i = 0; i < 8; i++) {
    if (y & 1) result ^= x;
    const hi = x & 128;
    x = (x << 1) & 255;
    if (hi) x ^= 27;
    y >>= 1;
  }
  return result;
}

function invShiftRows(state: Uint8Array): void {
  let tmp = state[13];
  state[13] = state[9];
  state[9] = state[5];
  state[5] = state[1];
  state[1] = tmp;

  tmp = state[2];
  state[2] = state[10];
  state[10] = tmp;

  tmp = state[6];
  state[6] = state[14];
  state[14] = tmp;

  tmp = state[3];
  state[3] = state[7];
  state[7] = state[11];
  state[11] = state[15];
  state[15] = tmp;
}

function addRoundKey(state: Uint8Array, roundKeys: Uint8Array, round: number): void {
  const offset = 16 * round;
  for (let i = 0; i < 16; i++) {
    state[i] ^= roundKeys[offset + i];
  }
}

function invMixColumns(state: Uint8Array): void {
  for (let i = 0; i < 16; i += 4) {
    const s0 = state[i];
    const s1 = state[i + 1];
    const s2 = state[i + 2];
    const s3 = state[i + 3];
    state[i] = gfMul(s0, 14) ^ gfMul(s1, 11) ^ gfMul(s2, 13) ^ gfMul(s3, 9);
    state[i + 1] = gfMul(s0, 9) ^ gfMul(s1, 14) ^ gfMul(s2, 11) ^ gfMul(s3, 13);
    state[i + 2] = gfMul(s0, 13) ^ gfMul(s1, 9) ^ gfMul(s2, 14) ^ gfMul(s3, 11);
    state[i + 3] = gfMul(s0, 11) ^ gfMul(s1, 13) ^ gfMul(s2, 9) ^ gfMul(s3, 14);
  }
}

function expandKey(key: Uint8Array): Uint8Array {
  const expanded = new Uint8Array(176);
  expanded.set(key);
  let bytesGenerated = 16;
  let rconIter = 1;
  const temp = new Uint8Array(4);

  while (bytesGenerated < 176) {
    for (let i = 0; i < 4; i++) {
      temp[i] = expanded[bytesGenerated - 4 + i];
    }
    if (bytesGenerated % 16 === 0) {
      const t0 = temp[0];
      temp[0] = SBOX[temp[1]] ^ RCON[rconIter];
      temp[1] = SBOX[temp[2]];
      temp[2] = SBOX[temp[3]];
      temp[3] = SBOX[t0];
      rconIter++;
    }
    for (let i = 0; i < 4; i++) {
      expanded[bytesGenerated] = expanded[bytesGenerated - 16] ^ temp[i];
      bytesGenerated++;
    }
  }
  return expanded;
}

function decryptBlock(block: Uint8Array, roundKeys: Uint8Array): Uint8Array {
  const state = new Uint8Array(block);
  addRoundKey(state, roundKeys, 10);
  for (let round = 9; round >= 1; round--) {
    invShiftRows(state);
    for (let i = 0; i < 16; i++) {
      state[i] = INV_SBOX[state[i]];
    }
    addRoundKey(state, roundKeys, round);
    invMixColumns(state);
  }
  invShiftRows(state);
  for (let i = 0; i < 16; i++) {
    state[i] = INV_SBOX[state[i]];
  }
  addRoundKey(state, roundKeys, 0);
  return state;
}

function decodeBase64(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decryptAppxLink(encrypted?: string | null): string | null {
  try {
    if (!encrypted || typeof encrypted !== 'string' || !encrypted.includes(':')) {
      return null;
    }
    const [cipherB64, ivB64] = encrypted.split(':');
    if (!cipherB64 || !ivB64) return null;

    const cipherBytes = decodeBase64(cipherB64);
    const ivBytes = decodeBase64(ivB64);
    if (cipherBytes.length === 0 || cipherBytes.length % 16 !== 0 || ivBytes.length !== 16) {
      return null;
    }

    const keyBytes = new TextEncoder().encode('638udh3829162018');
    const roundKeys = expandKey(keyBytes);
    const plaintext = new Uint8Array(cipherBytes.length);
    let prevBlock = ivBytes;

    for (let offset = 0; offset < cipherBytes.length; offset += 16) {
      const currentBlock = cipherBytes.subarray(offset, offset + 16);
      const decrypted = decryptBlock(currentBlock, roundKeys);
      for (let i = 0; i < 16; i++) {
        plaintext[offset + i] = decrypted[i] ^ prevBlock[i];
      }
      prevBlock = currentBlock;
    }

    const padLen = plaintext[plaintext.length - 1];
    if (padLen < 1 || padLen > 16) return null;
    for (let i = plaintext.length - padLen; i < plaintext.length; i++) {
      if (plaintext[i] !== padLen) return null;
    }

    return new TextDecoder().decode(plaintext.subarray(0, plaintext.length - padLen));
  } catch {
    return null;
  }
}

export function useAutoRetryCountdown(
  active: boolean,
  onRetry: () => void,
  options?: { intervalMs?: number; maxRetries?: number }
): number | null {
  const intervalMs = options?.intervalMs ?? 45000;
  const maxRetries = options?.maxRetries ?? 8;
  const initialSeconds = Math.ceil(intervalMs / 1000);

  const [countdown, setCountdown] = useState<number | null>(null);
  const retryRef = useRef(onRetry);

  useEffect(() => {
    retryRef.current = onRetry;
  }, [onRetry]);

  useEffect(() => {
    if (!active) return;
    let retries = 0;
    let secondsLeft = initialSeconds;

    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        retries += 1;
        if (retries > maxRetries) {
          clearInterval(timer);
          setCountdown(null);
          return;
        }
        secondsLeft = initialSeconds;
        retryRef.current();
      }
      setCountdown(secondsLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [active, initialSeconds, maxRetries]);

  return active ? (countdown ?? initialSeconds) : null;
}
