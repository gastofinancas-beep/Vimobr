// Testa o firestore.rules no emulador: quem pode e quem não pode gravar cada coisa.
// Rodar com: npm run test:regras (precisa de Java; baixa o emulador na primeira vez)
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, increment, getDoc } from 'firebase/firestore';
const env = await initializeTestEnvironment({ projectId: 'demo-vimo', firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8089 } });
const a = env.authenticatedContext('ana').firestore(), b = env.authenticatedContext('bia').firestore();
let falhas = 0;
const t = async (nome, p) => { try { await p; console.log('ok  ', nome); } catch (e) { falhas++; console.log('FALHA', nome, '-', String(e.message).slice(0, 120)); } };
const perfil = (uid) => ({ uid, displayName: uid, handle: '@' + uid, followersCount: 0, followingCount: 0 });

await t('perfil: criar o próprio', assertSucceeds(setDoc(doc(a, 'users/ana'), perfil('ana'))));
await t('perfil: criar o próprio (bia)', assertSucceeds(setDoc(doc(b, 'users/bia'), perfil('bia'))));
await t('perfil: nascer PRO é negado', assertFails(setDoc(doc(env.authenticatedContext('caio').firestore(), 'users/caio'), { ...perfil('caio'), plano: 'pro' })));
await t('perfil: virar PRO é negado', assertFails(updateDoc(doc(a, 'users/ana'), { plano: 'pro' })));
await t('perfil: merge com plano pro é negado', assertFails(setDoc(doc(a, 'users/ana'), { plano: 'pro' }, { merge: true })));
await t('perfil: editar bio', assertSucceeds(setDoc(doc(a, 'users/ana'), { bio: 'oi', displayNameLower: 'ana' }, { merge: true })));
await t('perfil: inventar seguidores é negado', assertFails(updateDoc(doc(a, 'users/ana'), { followersCount: 999 })));
await t('perfil: editar o de outra pessoa é negado', assertFails(updateDoc(doc(b, 'users/ana'), { bio: 'x' })));
const seguir = (db, eu, alvo, n = 1) => { const l = writeBatch(db); l.set(doc(db, `users/${eu}/following/${alvo}`), { at: 1 }); l.set(doc(db, `users/${alvo}/followers/${eu}`), { at: 1 }); l.update(doc(db, `users/${eu}`), { followingCount: increment(1) }); l.update(doc(db, `users/${alvo}`), { followersCount: increment(n) }); return l.commit(); };
await t('seguir: contador +2 é negado', assertFails(seguir(b, 'bia', 'ana', 2)));
await t('seguir: contador sem a vaga é negado', assertFails(updateDoc(doc(b, 'users/ana'), { followersCount: increment(1) })));
await t('seguir: lote completo', assertSucceeds(seguir(b, 'bia', 'ana')));
await t('seguir: duas vezes é negado', assertFails(seguir(b, 'bia', 'ana')));
const deixar = (db, eu, alvo) => { const l = writeBatch(db); l.delete(doc(db, `users/${eu}/following/${alvo}`)); l.delete(doc(db, `users/${alvo}/followers/${eu}`)); l.update(doc(db, `users/${eu}`), { followingCount: increment(-1) }); l.update(doc(db, `users/${alvo}`), { followersCount: increment(-1) }); return l.commit(); };
await t('seguir: deixar de seguir', assertSucceeds(deixar(b, 'bia', 'ana')));
console.log('     contadores ana:', (await getDoc(doc(a, 'users/ana'))).data().followersCount);

const rev = (uid) => ({ uid, placeId: 'osm-1', ratings: { comida: 4 }, overall: 4, text: 'bom', likesCount: 0, commentsCount: 0, createdAt: 1 });
await t('avaliação: publicar em nome de outro é negado', assertFails(setDoc(doc(b, 'reviews/r0'), rev('ana'))));
await t('avaliação: publicar a própria', assertSucceeds(setDoc(doc(a, 'reviews/r1'), rev('ana'))));
await t('avaliação: outra pessoa editar o texto é negado', assertFails(updateDoc(doc(b, 'reviews/r1'), { text: 'hackeado', overall: 1 })));
await t('avaliação: curtida sem registro é negada', assertFails(updateDoc(doc(b, 'reviews/r1'), { likesCount: increment(1) })));
const curtir = (db, col, id, uid, n = 1) => { const l = writeBatch(db); l.set(doc(db, `${col}/${id}/likes/${uid}`), { at: 1 }); l.update(doc(db, `${col}/${id}`), { likesCount: increment(n) }); return l.commit(); };
await t('avaliação: curtida +50 é negada', assertFails(curtir(b, 'reviews', 'r1', 'bia', 50)));
await t('avaliação: curtir', assertSucceeds(curtir(b, 'reviews', 'r1', 'bia')));
await t('avaliação: curtir de novo é negado', assertFails(curtir(b, 'reviews', 'r1', 'bia')));
{ const l = writeBatch(b); l.delete(doc(b, 'reviews/r1/likes/bia')); l.update(doc(b, 'reviews/r1'), { likesCount: increment(-1) }); await t('avaliação: descurtir', assertSucceeds(l.commit())); }
{ const l = writeBatch(b); l.set(doc(b, 'reviews/r1/comments/c1'), { uid: 'bia', text: 'oi', createdAt: 1 }); l.update(doc(b, 'reviews/r1'), { commentsCount: increment(1) }); await t('avaliação: comentar', assertSucceeds(l.commit())); }
await t('avaliação: comentar em nome de outro é negado', assertFails(setDoc(doc(b, 'reviews/r1/comments/c2'), { uid: 'ana', text: 'x' })));
await t('avaliação: autor edita', assertSucceeds(updateDoc(doc(a, 'reviews/r1'), { text: 'muito bom' })));
await t('avaliação: outra pessoa apagar é negado', assertFails(deleteDoc(doc(b, 'reviews/r1'))));

await t('lugar: criar', assertSucceeds(setDoc(doc(a, 'places/osm-1'), { id: 'osm-1', name: 'Café X', source: 'openstreetmap' })));
await t('lugar: criar pela 1ª avaliação', assertSucceeds(setDoc(doc(a, 'places/osm-2'), { name: 'Bar Y', reviewsCount: 1, sums: { comida: 4 } }, { merge: true })));
await t('lugar: criar já reivindicado é negado', assertFails(setDoc(doc(b, 'places/osm-9'), { name: 'Z', claimed: true })));
await t('lugar: apagar é negado', assertFails(deleteDoc(doc(b, 'places/osm-1'))));
await t('lugar: trocar o nome é negado', assertFails(updateDoc(doc(b, 'places/osm-1'), { name: 'Outro' })));
await t('lugar: somar avaliação', assertSucceeds(setDoc(doc(b, 'places/osm-1'), { reviewsCount: 1, sums: { comida: 4 } }, { merge: true })));
await t('lugar: contagem +100 é negada', assertFails(updateDoc(doc(b, 'places/osm-1'), { reviewsCount: 101 })));
await t('lugar: descontar avaliação', assertSucceeds(updateDoc(doc(b, 'places/osm-1'), { reviewsCount: 0, sums: { comida: 0 } })));
await t('lugar: cadastro de usuário', assertSucceeds(setDoc(doc(a, 'places/user-1'), { id: 'user-1', name: 'Novo', submittedBy: 'ana', verificacao: 'verifying', lat: 0, lng: 0 })));
await t('lugar: quem cadastrou grava a verificação', assertSucceeds(updateDoc(doc(a, 'places/user-1'), { verificacao: 'verified', googlePlaceId: 'abc' })));
await t('lugar: outra pessoa mexer na verificação é negado', assertFails(updateDoc(doc(b, 'places/user-1'), { verificacao: 'pending_review' })));

const post = (uid) => ({ uid, text: 'oi', visibilidade: 'publico', likesCount: 0, commentsCount: 0, createdAt: 1 });
await t('post: publicar', assertSucceeds(setDoc(doc(a, 'posts/p1'), post('ana'))));
await t('post: curtida sem registro é negada', assertFails(updateDoc(doc(b, 'posts/p1'), { likesCount: increment(1) })));
await t('post: curtir', assertSucceeds(curtir(b, 'posts', 'p1', 'bia')));
await t('post: contador de comentário +1', assertSucceeds(updateDoc(doc(b, 'posts/p1'), { commentsCount: increment(1) })));
await t('post: outra pessoa editar é negado', assertFails(updateDoc(doc(b, 'posts/p1'), { text: 'x' })));
await t('post: autor arquiva (apaga)', assertSucceeds(deleteDoc(doc(a, 'posts/p1'))));

const notif = (tipo, texto = 'curtiu') => ({ tipo, texto, lida: false, remetente: { uid: 'bia', name: 'Bia' }, createdAt: 1 });
await t('notificação: enviar', assertSucceeds(setDoc(doc(b, 'users/ana/notificacoes/n1'), notif('curtida'))));
await t('notificação: tipo inventado é negado', assertFails(setDoc(doc(b, 'users/ana/notificacoes/n2'), notif('promocao'))));
await t('notificação: texto gigante é negado', assertFails(setDoc(doc(b, 'users/ana/notificacoes/n3'), notif('curtida', 'x'.repeat(500)))));
await t('conta: apagar o próprio perfil', assertSucceeds(deleteDoc(doc(b, 'users/bia'))));
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO'); await env.cleanup(); process.exit(falhas ? 1 : 0);
