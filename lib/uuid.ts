// lib/uuid.ts

import { randomUUID } from "node:crypto";

// RFC 9562 UUID v7

const VERSION = 0x70;
const VARIANT = 0x80;

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const byteToHex: string[] = [];

for (let i = 0; i < 256; i++) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}

let lastTimestamp = 0;
let sequence = 0;

// Vérifie support natif UUID v7.
function supportsNativeUUIDv7(): boolean {
  try {
    return typeof randomUUID({
      version: "v7" as never,
    }) === "string";
  } catch {
    return false;
  }
}

const HAS_NATIVE_UUID_V7 = supportsNativeUUIDv7();

// Génère UUID v7 monotonic.
export function generateUUIDv7(
  timestamp: number = Date.now(),
): string {
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(
      "Invalid timestamp.",
    );
  }

  if (timestamp < 0) {
    throw new RangeError(
      "Timestamp cannot be negative.",
    );
  }

  // Implémentation native Node.js.
  if (HAS_NATIVE_UUID_V7) {
    return randomUUID({
      version: "v7" as never,
    });
  }

  /**
   * Gestion monotonique.
   */
  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1) & 0x0fff;
  } else {
    sequence = 0;
    lastTimestamp = timestamp;
  }

  const bytes = new Uint8Array(16);

  globalThis.crypto.getRandomValues(bytes);

  const ts = BigInt(timestamp);

  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);

  // Version 7.
  bytes[6] =
    ((sequence >> 8) & 0x0f) | VERSION;
  bytes[7] = sequence & 0xff;

  // Variant RFC.
  bytes[8] =
    (bytes[8] & 0x3f) | VARIANT;
  return stringify(bytes);
}

export function validateUUIDv7(
  uuid: string,
): boolean {
  return UUID_V7_REGEX.test(uuid);
}

export function extractTimestamp(
  uuid: string,
): bigint | null {
  if (!validateUUIDv7(uuid)) {
    return null;
  }

  const hex =
    uuid.slice(0, 8) +
    uuid.slice(9, 13);
  return BigInt(`0x${hex}`);
}

function stringify(
  bytes: Uint8Array,
): string {
  return (
    byteToHex[bytes[0]] +
    byteToHex[bytes[1]] +
    byteToHex[bytes[2]] +
    byteToHex[bytes[3]] +
    "-" +
    byteToHex[bytes[4]] +
    byteToHex[bytes[5]] +
    "-" +
    byteToHex[bytes[6]] +
    byteToHex[bytes[7]] +
    "-" +
    byteToHex[bytes[8]] +
    byteToHex[bytes[9]] +
    "-" +
    byteToHex[bytes[10]] +
    byteToHex[bytes[11]] +
    byteToHex[bytes[12]] +
    byteToHex[bytes[13]] +
    byteToHex[bytes[14]] +
    byteToHex[bytes[15]]
  );
}
