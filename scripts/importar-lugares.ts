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

// Importação dinâmica para não exigir firebase-admin em tempo de build
const admin = await import('firebase-admin').then((m) => m.default);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
  });
}

const db = admin.firestore();
db.settings({ databaseId: (firebaseConfig as Record<string, string>).firestoreDatabaseId ?? '(default)' });

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
