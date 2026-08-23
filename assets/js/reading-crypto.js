const VAULT_FORMAT = "jeffkao-reading-vault";
const VAULT_VERSION = 1;
const PAYLOAD_SCHEMA = 1;
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const AES_KEY_BITS = 256;
const GCM_TAG_BITS = 128;
const AAD = new TextEncoder().encode(`${VAULT_FORMAT}:v${VAULT_VERSION}`);
const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** A safe, user-presentable error raised by vault operations. */
export class VaultError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VaultError";
    this.code = code;
  }
}

/** Encode an ArrayBuffer or typed-array view as unpadded base64url. */
export function bytesToBase64Url(value) {
  const bytes = asUint8Array(value);
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const block = (first << 16) | (second << 8) | third;

    output += BASE64URL_ALPHABET[(block >>> 18) & 63];
    output += BASE64URL_ALPHABET[(block >>> 12) & 63];

    if (index + 1 < bytes.length) {
      output += BASE64URL_ALPHABET[(block >>> 6) & 63];
    }
    if (index + 2 < bytes.length) {
      output += BASE64URL_ALPHABET[block & 63];
    }
  }

  return output;
}

/** Decode canonical, unpadded base64url into bytes. */
export function base64UrlToBytes(value) {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9_-]*$/.test(value) ||
    value.length % 4 === 1
  ) {
    throw new VaultError("invalid_base64url", "Invalid base64url data.");
  }

  const output = new Uint8Array(Math.floor((value.length * 6) / 8));
  let accumulator = 0;
  let bitCount = 0;
  let outputIndex = 0;

  for (const character of value) {
    accumulator =
      (accumulator << 6) | BASE64URL_ALPHABET.indexOf(character);
    bitCount += 6;

    if (bitCount >= 8) {
      bitCount -= 8;
      output[outputIndex] = (accumulator >>> bitCount) & 255;
      outputIndex += 1;
    }
  }

  if (bytesToBase64Url(output) !== value) {
    throw new VaultError("invalid_base64url", "Invalid base64url data.");
  }

  return output;
}

export {
  bytesToBase64Url as encodeBase64Url,
  base64UrlToBytes as decodeBase64Url,
};

/** Create a new encrypted v1 vault containing JSON-compatible items. */
export async function createVault(password, items = []) {
  assertPassword(password);
  const normalizedItems = normalizeItems(items);
  const crypto = getWebCrypto();
  const salt = randomBytes(crypto, SALT_BYTES);
  let key;

  try {
    key = await deriveKey(crypto.subtle, password, salt, PBKDF2_ITERATIONS);
    return await encryptPayload(crypto, key, salt, PBKDF2_ITERATIONS, {
      schema: PAYLOAD_SCHEMA,
      revision: 1,
      updated_at: new Date().toISOString(),
      items: normalizedItems,
    });
  } catch (error) {
    if (error instanceof VaultError) {
      throw error;
    }
    throw new VaultError(
      "create_failed",
      "The encrypted reading vault could not be created.",
    );
  }
}

/** Decrypt and authenticate a vault, returning its versioned payload. */
export async function decryptVault(password, envelope) {
  assertPassword(password);
  const validated = validateEnvelope(envelope);
  return (await unlockVault(password, validated)).payload;
}

/**
 * Replace a vault's items after authenticating it. The KDF settings are kept,
 * the revision is incremented, and a fresh AES-GCM IV is generated.
 */
export async function updateVault(password, envelope, items) {
  assertPassword(password);
  const normalizedItems = normalizeItems(items);
  const validated = validateEnvelope(envelope);
  const { crypto, key, payload } = await unlockVault(password, validated);

  try {
    return await encryptPayload(
      crypto,
      key,
      validated.salt,
      validated.iterations,
      {
        schema: PAYLOAD_SCHEMA,
        revision: payload.revision + 1,
        updated_at: new Date().toISOString(),
        items: normalizedItems,
      },
    );
  } catch (error) {
    if (error instanceof VaultError) {
      throw error;
    }
    throw new VaultError(
      "update_failed",
      "The encrypted reading vault could not be updated.",
    );
  }
}

export { updateVault as reencryptVault };

/** Append one JSON-compatible item while deriving and authenticating only once. */
export async function appendToVault(password, envelope, item) {
  assertPassword(password);
  const [normalizedItem] = normalizeItems([item]);
  const validated = validateEnvelope(envelope);
  const { crypto, key, payload } = await unlockVault(password, validated);

  try {
    return await encryptPayload(
      crypto,
      key,
      validated.salt,
      validated.iterations,
      {
        schema: PAYLOAD_SCHEMA,
        revision: payload.revision + 1,
        updated_at: new Date().toISOString(),
        items: [...payload.items, normalizedItem],
      },
    );
  } catch (error) {
    if (error instanceof VaultError) throw error;
    throw new VaultError(
      "update_failed",
      "The encrypted reading vault could not be updated.",
    );
  }
}

function asUint8Array(value) {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new VaultError(
    "invalid_bytes",
    "Expected an ArrayBuffer or typed-array view.",
  );
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new VaultError(
      "invalid_password",
      "Enter a non-empty vault password.",
    );
  }
}

function getWebCrypto() {
  const crypto = globalThis.crypto;
  if (
    !crypto ||
    !crypto.subtle ||
    typeof crypto.getRandomValues !== "function"
  ) {
    throw new VaultError(
      "crypto_unavailable",
      "This browser does not provide the Web Crypto API required by the vault.",
    );
  }
  return crypto;
}

function randomBytes(crypto, length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function deriveKey(subtle, password, salt, iterations) {
  const encodedPassword = new TextEncoder().encode(password);

  try {
    const keyMaterial = await subtle.importKey(
      "raw",
      encodedPassword,
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return await subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations,
      },
      keyMaterial,
      { name: "AES-GCM", length: AES_KEY_BITS },
      false,
      ["encrypt", "decrypt"],
    );
  } finally {
    encodedPassword.fill(0);
  }
}

async function encryptPayload(crypto, key, salt, iterations, payload) {
  const iv = randomBytes(crypto, IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  try {
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: AAD,
        tagLength: GCM_TAG_BITS,
      },
      key,
      plaintext,
    );

    return {
      format: VAULT_FORMAT,
      version: VAULT_VERSION,
      kdf: {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations,
        salt: bytesToBase64Url(salt),
      },
      cipher: {
        name: "AES-GCM",
        key_bits: AES_KEY_BITS,
        tag_bits: GCM_TAG_BITS,
        iv: bytesToBase64Url(iv),
      },
      ciphertext: bytesToBase64Url(ciphertext),
    };
  } finally {
    plaintext.fill(0);
  }
}

async function unlockVault(password, validated) {
  const crypto = getWebCrypto();

  try {
    const key = await deriveKey(
      crypto.subtle,
      password,
      validated.salt,
      validated.iterations,
    );
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: validated.iv,
        additionalData: AAD,
        tagLength: GCM_TAG_BITS,
      },
      key,
      validated.ciphertext,
    );
    const plaintext = new Uint8Array(plaintextBuffer);

    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
      const payload = JSON.parse(decoded);
      validatePayload(payload);
      return { crypto, key, payload };
    } finally {
      plaintext.fill(0);
    }
  } catch {
    throw new VaultError(
      "unlock_failed",
      "Unable to unlock the vault. The password may be incorrect or the vault may be damaged.",
    );
  }
}

function validateEnvelope(envelope) {
  try {
    assertRecord(envelope);
    if (envelope.format !== VAULT_FORMAT || envelope.version !== VAULT_VERSION) {
      throw new Error();
    }

    assertRecord(envelope.kdf);
    if (
      envelope.kdf.name !== "PBKDF2" ||
      envelope.kdf.hash !== "SHA-256" ||
      envelope.kdf.iterations !== PBKDF2_ITERATIONS
    ) {
      throw new Error();
    }
    const salt = base64UrlToBytes(envelope.kdf.salt);
    if (salt.byteLength !== SALT_BYTES) {
      throw new Error();
    }

    assertRecord(envelope.cipher);
    if (
      envelope.cipher.name !== "AES-GCM" ||
      envelope.cipher.key_bits !== AES_KEY_BITS ||
      envelope.cipher.tag_bits !== GCM_TAG_BITS
    ) {
      throw new Error();
    }
    const iv = base64UrlToBytes(envelope.cipher.iv);
    if (iv.byteLength !== IV_BYTES) {
      throw new Error();
    }

    const ciphertext = base64UrlToBytes(envelope.ciphertext);
    if (ciphertext.byteLength <= GCM_TAG_BITS / 8) {
      throw new Error();
    }

    return {
      salt,
      iterations: envelope.kdf.iterations,
      iv,
      ciphertext,
    };
  } catch {
    throw new VaultError(
      "invalid_envelope",
      "This file is not a valid encrypted reading vault.",
    );
  }
}

function validatePayload(payload) {
  assertRecord(payload);
  if (
    payload.schema !== PAYLOAD_SCHEMA ||
    !Number.isSafeInteger(payload.revision) ||
    payload.revision < 1 ||
    typeof payload.updated_at !== "string" ||
    !isCanonicalIsoDate(payload.updated_at) ||
    !Array.isArray(payload.items)
  ) {
    throw new Error();
  }
}

function assertRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error();
  }
}

function isCanonicalIsoDate(value) {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    throw new VaultError("invalid_items", "Vault items must be an array.");
  }

  try {
    assertJsonValue(items, new Set());
    return JSON.parse(JSON.stringify(items));
  } catch {
    throw new VaultError(
      "invalid_items",
      "Vault items must contain only JSON-compatible values.",
    );
  }
}

function assertJsonValue(value, ancestors) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error();
    }
    return;
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    throw new Error();
  }

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (!isArray && prototype !== Object.prototype && prototype !== null) {
    throw new Error();
  }

  ancestors.add(value);
  try {
    const values = isArray ? value : Object.values(value);
    for (const entry of values) {
      assertJsonValue(entry, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}
