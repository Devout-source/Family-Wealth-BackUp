import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User,
  Auth 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  onSnapshot,
  Firestore 
} from 'firebase/firestore';
import { FamilyVaultData } from '../types.ts';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Clean support for Vercel/Vite environment variables with resilient fallbacks
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDEVn3ZsSh0-ZrD4eymB5DFSpLRqwdagdI",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "family-wealth-8033e.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "family-wealth-8033e",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "family-wealth-8033e.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "996518752094",
  appId: env.VITE_FIREBASE_APP_ID || "1:996518752094:web:dfd05a9a732f8a700469cf",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-SECNE1FBHL"
};

const databaseId = env.VITE_FIREBASE_DATABASE_ID || "(default)";

// 1. Resilient Firebase App Initialization (never throws or crashes the app if unconfigured)
let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const isNamedDb = databaseId && databaseId !== '(default)';
    dbInstance = isNamedDb ? getFirestore(app, databaseId) : getFirestore(app);
    authInstance = getAuth(app);
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      isSupported().then((supported) => {
        if (supported && app) {
          getAnalytics(app);
        }
      }).catch(() => {});
    }
  }
} catch (initErr) {
  console.warn('[Firebase] Initialization skipped or operating in local storage mode:', initErr);
}

export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;

export const googleProvider = new GoogleAuthProvider();
try {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch {
  // Provider configured
}

// 2. Standardized Firestore Error Logging
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = authInstance?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
      tenantId: currentAuth?.tenantId || null,
      providerInfo: currentAuth?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('[Firestore Notice]', JSON.stringify(errInfo));
  return errInfo;
}

// 3. Validate Connection to Firestore on boot
export async function testFirestoreConnection(): Promise<boolean> {
  if (!dbInstance || !authInstance?.currentUser) {
    return false;
  }
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
    return true;
  } catch (err: any) {
    if (app && (err?.code === 'not-found' || err?.message?.includes('not found') || err?.message?.includes('database'))) {
      try {
        const defaultDb = getFirestore(app);
        await getDocFromServer(doc(defaultDb, 'test', 'connection'));
        dbInstance = defaultDb;
        return true;
      } catch {}
    }
    return false;
  }
}

// 4. Sign In / Sign Out Helpers
export async function signInWithGoogleAccount(): Promise<User | null> {
  if (!authInstance) {
    throw new Error('Firebase Authentication is not configured. Running in local encrypted storage mode.');
  }
  try {
    const result = await signInWithPopup(authInstance, googleProvider);
    return result.user;
  } catch (err: any) {
    const errorCode = err?.code || '';
    
    // User intentionally closed popup or opened multiple tabs
    if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
      return null;
    }
    // Google provider not yet enabled in Firebase Console
    if (errorCode === 'auth/configuration-not-found' || errorCode === 'auth/operation-not-allowed') {
      const msg = 'Google Sign-In is not enabled yet in your Firebase Console (project: family-wealth-8033e). Please open Firebase Console -> Build -> Authentication -> Sign-in method, click Google, and enable it.';
      console.warn('[Firebase Auth Setup Required]:', msg);
      const customErr: any = new Error(msg);
      customErr.code = errorCode;
      customErr.consoleUrl = 'https://console.firebase.google.com/project/family-wealth-8033e/authentication/providers';
      throw customErr;
    }
    // Current host domain not added to Firebase Authorized Domains
    if (errorCode === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      const msg = `Domain '${currentHost}' is not in Firebase Authorized Domains. Add it under Firebase Console -> Authentication -> Settings -> Authorized domains.`;
      console.warn('[Firebase Auth Domain Required]:', msg);
      const customErr: any = new Error(msg);
      customErr.code = errorCode;
      customErr.consoleUrl = 'https://console.firebase.google.com/project/family-wealth-8033e/authentication/settings';
      throw customErr;
    }
    console.warn('[Firebase Sign In Warning]:', err?.message || err);
    throw err;
  }
}

export async function signOutFromFirebase(): Promise<void> {
  if (authInstance) {
    await signOut(authInstance);
  }
}

export function onAuthUserChange(callback: (user: User | null) => void) {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
}

// 5. Real-Time Vault Firestore Sync
export const PRIMARY_VAULT_DOC_ID = 'primary';

export function listenToFamilyVault(
  onUpdate: (data: FamilyVaultData) => void,
  onError?: (error: Error) => void,
  onEmpty?: () => void,
  docId: string = PRIMARY_VAULT_DOC_ID
): () => void {
  if (!dbInstance || !authInstance?.currentUser) {
    return () => {};
  }
  let isUnsubscribed = false;
  const path = `vaults/${docId}`;
  const vaultDocRef = doc(dbInstance, 'vaults', docId);

  const unsubscribe = onSnapshot(
    vaultDocRef,
    (snapshot) => {
      if (isUnsubscribed) return;
      if (snapshot.exists()) {
        const rawData = snapshot.data() as FamilyVaultData;
        if (rawData && Array.isArray(rawData.loans) && Array.isArray(rawData.members)) {
          onUpdate(rawData);
        } else if (onEmpty) {
          onEmpty();
        }
      } else {
        if (onEmpty) {
          onEmpty();
        }
      }
    },
    (err) => {
      if (isUnsubscribed) return;
      // Suppress permission-denied if user is in the middle of signing out
      if (err.code === 'permission-denied' && (!authInstance || !authInstance.currentUser)) {
        return;
      }
      handleFirestoreError(err, OperationType.GET, path);
      if (onError) {
        onError(err);
      }
    }
  );

  return () => {
    isUnsubscribed = true;
    try {
      unsubscribe();
    } catch {}
  };
}

export async function saveVaultToFirestore(vault: FamilyVaultData): Promise<{ success: boolean; error?: string }> {
  if (!dbInstance) {
    return { success: false, error: 'Firestore database is not initialized.' };
  }
  if (!authInstance?.currentUser) {
    return { success: false, error: 'Sign in to sync your changes with the cloud.' };
  }
  const path = `vaults/${PRIMARY_VAULT_DOC_ID}`;
  try {
    const vaultDocRef = doc(dbInstance, 'vaults', PRIMARY_VAULT_DOC_ID);
    const cleanPayload: Record<string, any> = {
      version: vault.version || 1,
      currency: 'AED',
      updatedAt: new Date().toISOString(),
      updatedBy: authInstance.currentUser?.email || authInstance.currentUser?.uid || 'Family App',
      members: vault.members || [],
      loans: vault.loans || [],
      installments: vault.installments || [],
      incomes: vault.incomes || [],
      essentials: vault.essentials || [],
      payments: vault.payments || [],
      creditCards: vault.creditCards || [],
      otherSpending: vault.otherSpending || [],
      moneyLent: vault.moneyLent || [],
      savingsGoals: vault.savingsGoals || [],
    };
    await setDoc(vaultDocRef, cleanPayload, { merge: true });
    return { success: true };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, path);
    const errMsg = err?.message || 'Database write failed. Edits saved locally in encrypted vault.';
    return { success: false, error: errMsg };
  }
}

export async function fetchVaultOnceFromFirestore(): Promise<FamilyVaultData | null> {
  if (!dbInstance || !authInstance?.currentUser) {
    return null;
  }
  const path = `vaults/${PRIMARY_VAULT_DOC_ID}`;
  try {
    const vaultDocRef = doc(dbInstance, 'vaults', PRIMARY_VAULT_DOC_ID);
    const snap = await getDoc(vaultDocRef);
    if (snap.exists()) {
      return snap.data() as FamilyVaultData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}
