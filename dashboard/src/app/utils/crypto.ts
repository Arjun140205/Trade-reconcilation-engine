const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const PASSWORD = process.env.NEXT_PUBLIC_CRYPTO_SECRET || 'trade-recon-default-shared-secret-key-12345';

const getSubtleCrypto = (): SubtleCrypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.subtle;
  }
  try {
    // Node.js fallback
    return (require('crypto').webcrypto as Crypto).subtle;
  } catch {
    if (typeof crypto !== 'undefined') {
      return crypto.subtle;
    }
  }
  throw new Error('Web Crypto API not supported in this environment');
};

const getRandomValues = (array: Uint8Array): Uint8Array => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(array);
  }
  try {
    return (require('crypto').webcrypto as Crypto).getRandomValues(array);
  } catch {
    if (typeof crypto !== 'undefined') {
      return crypto.getRandomValues(array);
    }
  }
  throw new Error('Web Crypto API not supported in this environment');
};

async function getCryptoKey(password: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const rawKey = enc.encode(password);
  
  const hash = await subtle.digest('SHA-256', rawKey);
  
  return subtle.importKey(
    'raw',
    hash,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

// Safe conversion for Uint8Array to Base64 (Node and Browser compatible)
function uint8ArrayToBase64(arr: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arr).toString('base64');
  }
  let binary = '';
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function encryptPayload(payload: any): Promise<string> {
  const subtle = getSubtleCrypto();
  const text = JSON.stringify(payload);
  const key = await getCryptoKey(PASSWORD);
  const iv = getRandomValues(new Uint8Array(IV_LENGTH));
  
  const enc = new TextEncoder();
  const encrypted = await subtle.encrypt(
    { name: ALGORITHM, iv: iv as any },
    key,
    enc.encode(text)
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return uint8ArrayToBase64(combined);
}

export async function decryptPayload(base64Data: string): Promise<any> {
  const subtle = getSubtleCrypto();
  const combined = base64ToUint8Array(base64Data);
  
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  const key = await getCryptoKey(PASSWORD);
  const decrypted = await subtle.decrypt(
    { name: ALGORITHM, iv: iv as any },
    key,
    ciphertext
  );
  
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}
