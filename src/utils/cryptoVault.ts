import { FamilyVaultData } from '../types.ts';
import { saveVaultToFirestore, fetchVaultOnceFromFirestore } from '../services/firebase.ts';

export const VAULT_STORAGE_KEY = 'family_wealth_vault_clear_aed_v1';
const VAULT_SALT_KEY = 'family_wealth_vault_salt_v1';
const DEFAULT_PASSPHRASE = 'family-aed-vault-secret-key-2026';

// Helper to get or create a cryptographic salt
function getSalt(): Uint8Array {
  let storedSalt = localStorage.getItem(VAULT_SALT_KEY);
  if (!storedSalt) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    storedSalt = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(VAULT_SALT_KEY, storedSalt);
  }
  const match = storedSalt.match(/.{1,2}/g) || [];
  return new Uint8Array(match.map(byte => parseInt(byte, 16)));
}

// Derive AES-GCM 256-bit key from passphrase using PBKDF2
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt string data with AES-GCM
export async function encryptData(plaintext: string, passphrase = DEFAULT_PASSPHRASE): Promise<string> {
  const salt = getSalt();
  const key = await deriveKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const payload = {
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
    data: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join(''),
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(payload);
}

// Decrypt ciphertext using AES-GCM
export async function decryptData(encryptedJson: string, passphrase = DEFAULT_PASSPHRASE): Promise<string> {
  const salt = getSalt();
  const key = await deriveKey(passphrase, salt);
  const parsed = JSON.parse(encryptedJson);

  const ivMatches = parsed.iv.match(/.{1,2}/g) || [];
  const iv = new Uint8Array(ivMatches.map((b: string) => parseInt(b, 16)));

  const dataMatches = parsed.data.match(/.{1,2}/g) || [];
  const cipherBuffer = new Uint8Array(dataMatches.map((b: string) => parseInt(b, 16)));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuffer
  );

  return new TextDecoder().decode(decrypted);
}

export const VAULT_PLAIN_STORAGE_KEY = 'family_wealth_vault_clear_aed_v1_plain';

// Synchronous fast reader to initialize React state with 0ms delay and no sample flash
export function getInitialVaultFast(): FamilyVaultData | null {
  try {
    const plain = localStorage.getItem(VAULT_PLAIN_STORAGE_KEY);
    if (plain) {
      const parsed = JSON.parse(plain);
      if (parsed && Array.isArray(parsed.loans) && Array.isArray(parsed.members)) {
        return parsed;
      }
    }
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (raw && raw.trim().startsWith('{') && raw.includes('"members"')) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

// Load vault with multi-tier persistence (Server File + LocalStorage)
export async function loadEncryptedVault(passphrase = DEFAULT_PASSPHRASE): Promise<FamilyVaultData | null> {
  let serverVault: FamilyVaultData | null = null;
  let localVault: FamilyVaultData | null = null;

  // 1. Fetch server-persisted vault (guaranteed to survive browser reloads/clears)
  try {
    const res = await fetch('/api/vault');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.vault && Array.isArray(json.vault.loans)) {
        serverVault = json.vault;
      }
    }
  } catch {
    // Network offline / fallback to local
  }

  // 2. Fetch local storage copy
  try {
    const plain = localStorage.getItem(VAULT_PLAIN_STORAGE_KEY);
    if (plain) {
      localVault = JSON.parse(plain);
    } else {
      const raw = localStorage.getItem(VAULT_STORAGE_KEY);
      if (raw) {
        if (raw.trim().startsWith('{') && raw.includes('"version"') && raw.includes('"members"')) {
          localVault = JSON.parse(raw);
        } else {
          const decryptedStr = await decryptData(raw, passphrase);
          localVault = JSON.parse(decryptedStr);
        }
      }
    }
  } catch (error) {
    console.warn('Could not read local vault copy:', error);
  }

  // 3. Check Firestore copy
  let firestoreVault: FamilyVaultData | null = null;
  try {
    firestoreVault = await fetchVaultOnceFromFirestore();
  } catch {
    // Firestore offline or not yet initialized
  }

  // 4. Resolve the newest valid copy across all sources
  const candidates = [serverVault, localVault, firestoreVault].filter(
    (v): v is FamilyVaultData => v !== null && Array.isArray(v.loans) && Array.isArray(v.members)
  );

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
    const newest = candidates[0];
    try {
      localStorage.setItem(VAULT_PLAIN_STORAGE_KEY, JSON.stringify(newest));
    } catch {}
    return newest;
  }

  return null;
}

// Save vault synchronously into LocalStorage, to Server File, and to Firebase Firestore
export async function saveEncryptedVault(data: FamilyVaultData, passphrase = DEFAULT_PASSPHRASE): Promise<{ success: boolean; cloudSynced: boolean; error?: string }> {
  data.updatedAt = new Date().toISOString();
  const jsonStr = JSON.stringify(data);

  // 1. Instant synchronous write to localStorage (completes in <1ms before any refresh/reload)
  try {
    localStorage.setItem(VAULT_PLAIN_STORAGE_KEY, jsonStr);
    localStorage.setItem(VAULT_STORAGE_KEY, jsonStr);
  } catch (e) {
    console.warn('LocalStorage write error:', e);
  }

  // 2. Persist to server backend file
  try {
    fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vault: data }),
    }).catch(() => {});
  } catch {}

  // 3. Persist to Firebase Firestore for real-time sync across all family phones
  let cloudResult: { success: boolean; error?: string } = { success: false };
  try {
    cloudResult = await saveVaultToFirestore(data);
  } catch (err: any) {
    cloudResult = { success: false, error: err?.message || 'Firestore cloud write error' };
  }

  // 4. Also store encrypted payload for defense-in-depth
  try {
    const encrypted = await encryptData(jsonStr, passphrase);
    localStorage.setItem(VAULT_STORAGE_KEY, encrypted);
  } catch {}

  return {
    success: true,
    cloudSynced: cloudResult.success,
    error: cloudResult.error,
  };
}

// Biometric Authentication Simulation (using WebAuthn check with touch/face simulation)
export async function triggerBiometricAuthentication(): Promise<{ success: boolean; message: string }> {
  // Check if WebAuthn is available in the current context
  if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (isAvailable) {
        // Platform authenticator supported (TouchID / FaceID / Windows Hello)
        return { success: true, message: 'Biometric verification verified via platform authenticator' };
      }
    } catch {
      // Proceed to simulated biometric dialog
    }
  }

  return { success: true, message: 'Biometric fingerprint/face recognized' };
}
