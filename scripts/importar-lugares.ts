/**
 * Importa lugares gerados pelo VIMO Builder para o Firestore.
 *
 * Uso:
 *   npx tsx scripts/importar-lugares.ts ~/OpenBot/Shared/vimo/seeds/sao-jose-dos-campos-sp-places.json
 *
 * Pré-requisitos:
 *   - GOOGLE_APPLICATION_CREDENTIALS apontando para o service account do Firebase
 *     (baixe em Firebase Console > Configurações do projeto > Contas de serviço)
 *   - npm install firebase-admin (só para este script)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import firebaseConfig from '../firebase-applet-config.json';

const seedPath = process.argv[2];
if (!seedPath) {
  console.error('Uso: npx tsx scripts/importar-lugares.ts <caminho-do-seed.json>');
  process.exit(1);
}

const lugares = JSON.parse(readFileSync(resolve(seedPath), 'utf-8')) as Record<string, unknown>[];
console.log(`Importando ${lugares.length} lugares para o Firestore (projeto: ${firebaseConfig.projectId})...`);

const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const { initializeApp, cert, getApps, applicationDefault } = require('firebase-admin/app') as typeof import('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore') as typeof import('firebase-admin/firestore');

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(sa) });
  } else {
    initializeApp({ credential: applicationDefault() });
  }
}

const db = getFirestore((firebaseConfig as Record<string, string>).firestoreDatabaseId ?? '(default)');

const BATCH_SIZE = 500;
let total = 0;

for (let i = 0; i < lugares.length; i += BATCH_SIZE) {
  const lote = lugares.slice(i, i + BATCH_SIZE);
  const batch = db.batch();
  for (const lugar of lote) {
    const id = lugar.id as string;
    batch.set(db.collection('places').doc(id), lugar, { merge: true });
  }
  await batch.commit();
  total += lote.length;
  console.log(`  ${total}/${lugares.length} gravados`);
}

console.log(`Concluído. ${total} lugares importados.`);
