import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('Placeholder')
);

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
// Campos undefined são ignorados em vez de derrubar a gravação inteira
function criarFirestore(): Firestore {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId);
  } catch {
    // recarga do módulo em desenvolvimento: a instância já existe
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}
export const db: Firestore = criarFirestore();
export const storage: FirebaseStorage = getStorage(app);
export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();
export const fcmConfig = firebaseConfig;

// Só para testes locais com duas contas: `VITE_FIREBASE_EMULADOR=1 npm run dev` usa os
// emuladores do Firebase (Auth 9099, Firestore 8089) no lugar do projeto real.
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULADOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8089);
}
