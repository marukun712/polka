import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface PolkaEvent {
  id: string;
  publickey: string;
  signature: string;
  event: string;
  timestamp: string;
  message: Record<string, any>;
}

export interface EncryptedKey {
  version: number;
  ciphertext: string;
  salt: string;
  iv: string;
  nonce: string;
}

/**
 * Generate a new Schnorr keypair
 */
export function generateKeypair(): { privateKey: Uint8Array; publicKey: string } {
  const privateKey = schnorr.utils.randomPrivateKey();
  const publicKey = bytesToHex(schnorr.getPublicKey(privateKey));
  return { privateKey, publicKey };
}

/**
 * Sign an event with Schnorr signature
 */
export function signEvent(event: Omit<PolkaEvent, 'id' | 'signature'>, privateKey: Uint8Array): PolkaEvent {
  const eventData = JSON.stringify({
    publickey: event.publickey,
    event: event.event,
    timestamp: event.timestamp,
    message: event.message
  });

  const messageHash = sha256(new TextEncoder().encode(eventData));
  const signature = schnorr.sign(messageHash, privateKey);

  const id = bytesToHex(sha256(signature));

  return {
    ...event,
    id,
    signature: bytesToHex(signature)
  };
}

/**
 * Verify event signature
 */
export function verifyEvent(event: PolkaEvent): boolean {
  try {
    const eventData = JSON.stringify({
      publickey: event.publickey,
      event: event.event,
      timestamp: event.timestamp,
      message: event.message
    });

    const messageHash = sha256(new TextEncoder().encode(eventData));
    const publicKey = hexToBytes(event.publickey);
    const signature = hexToBytes(event.signature);

    return schnorr.verify(signature, messageHash, publicKey);
  } catch (e) {
    console.error('Signature verification failed:', e);
    return false;
  }
}

/**
 * Encrypt private key using NIP-49 inspired format
 * (Simplified version using Web Crypto API)
 */
export async function encryptPrivateKey(
  privateKey: Uint8Array,
  password: string
): Promise<EncryptedKey> {
  const encoder = new TextEncoder();
  const salt = randomBytes(16);

  // Derive key from password
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = randomBytes(12);
  const nonce = randomBytes(32);

  // Encrypt private key
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    derivedKey,
    privateKey
  );

  return {
    version: 1,
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    nonce: bytesToHex(nonce)
  };
}

/**
 * Decrypt private key
 */
export async function decryptPrivateKey(
  encryptedKey: EncryptedKey,
  password: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const salt = hexToBytes(encryptedKey.salt);
  const iv = hexToBytes(encryptedKey.iv);
  const ciphertext = hexToBytes(encryptedKey.ciphertext);

  // Derive key from password
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Decrypt private key
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    derivedKey,
    ciphertext
  );

  return new Uint8Array(decrypted);
}

/**
 * Store encrypted key in browser storage
 */
export async function storeEncryptedKey(encryptedKey: EncryptedKey): Promise<void> {
  await browser.storage.local.set({ encryptedPrivateKey: encryptedKey });
}

/**
 * Load encrypted key from browser storage
 */
export async function loadEncryptedKey(): Promise<EncryptedKey | null> {
  const result = await browser.storage.local.get('encryptedPrivateKey');
  return result.encryptedPrivateKey || null;
}

/**
 * Store public key in browser storage
 */
export async function storePublicKey(publicKey: string): Promise<void> {
  await browser.storage.local.set({ publicKey });
}

/**
 * Load public key from browser storage
 */
export async function loadPublicKey(): Promise<string | null> {
  const result = await browser.storage.local.get('publicKey');
  return result.publicKey || null;
}
