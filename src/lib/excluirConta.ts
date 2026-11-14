import { deleteUser } from 'firebase/auth';
import {
  arrayRemove, collection, deleteDoc, deleteField, doc, getDocs, increment, limit, query, runTransaction, updateDoc,
  where, writeBatch,
  type DocumentReference, type Query,
} from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import type { Review } from '../types';

/**
 * Exclusão de conta: apaga o que a pessoa publicou e o que é só dela, depois o perfil e o login.
 * Cada etapa é independente: uma falha (regra, rede) não impede as outras.
 *
 * O que o app não consegue apagar sozinho, por regra de segurança: comentários e curtidas
 * que OUTRAS pessoas deixaram no conteúdo apagado. Eles ficam órfãos e inacessíveis pelo app.
 */

async function apagarTodos(consulta: Query, apagar: (r: DocumentReference) => Promise<unknown> = deleteDoc) {
  // em páginas, para não estourar memória em contas grandes
  for (let volta = 0; volta < 20; volta++) {
    const snap = await getDocs(query(consulta, limit(200)));
    if (snap.empty) return;
    await Promise.allSettled(snap.docs.map((d) => apagar(d.ref)));
    if (snap.size < 200) return;
  }
}

/** Apaga a avaliação descontando as notas dela do lugar. */
async function apagarAvaliacao(reviewRef: DocumentReference) {
  await runTransaction(db, async (tx) => {
    const rev = await tx.get(reviewRef);
    if (!rev.exists()) return;
    const dados = rev.data() as Omit<Review, 'id'>;
    const placeRef = dados.placeId ? doc(db, 'places', dados.placeId) : null;
    const lugar = placeRef ? await tx.get(placeRef) : null;
    tx.delete(reviewRef);
    if (placeRef && lugar?.exists() && (lugar.data()?.reviewsCount ?? 0) > 0) {
      const sums: Record<string, number> = { ...(lugar.data()?.sums ?? {}) };
      Object.entries(dados.ratings || {}).forEach(([chave, valor]) => {
        if (typeof valor === 'number' && valor > 0 && sums[chave]) sums[chave] = Math.max(0, sums[chave] - valor);
      });
      tx.update(placeRef, { reviewsCount: lugar.data()!.reviewsCount - 1, sums });
    }
  });
}

async function apagarPasta(caminho: string) {
  const lista = await listAll(ref(storage, caminho));
  await Promise.allSettled(lista.items.map((item) => deleteObject(item)));
}

async function sairDosClubes(uid: string) {
  const snap = await getDocs(query(collection(db, 'clubes'), where('membrosUids', 'array-contains', uid), limit(200)));
  await Promise.allSettled(
    snap.docs.map(async (d) => {
      if (d.data().criadorUid === uid) {
        // clube sem dono não tem quem administre: sai junto com a conta
        if (d.data().privado) await deleteDoc(doc(db, 'clubeConvites', d.id)).catch(() => {});
        await deleteDoc(d.ref);
      } else {
        await updateDoc(d.ref, { [`membros.${uid}`]: deleteField(), membrosUids: arrayRemove(uid) });
      }
    }),
  );
}

/** Quem eu sigo: sai da lista de seguidores de cada pessoa (com o contador dela). */
async function desfazerSeguindo(uid: string) {
  const snap = await getDocs(query(collection(db, 'users', uid, 'following'), limit(1000)));
  await Promise.allSettled(
    snap.docs.map(async (d) => {
      const lote = writeBatch(db);
      lote.delete(doc(db, 'users', d.id, 'followers', uid));
      lote.update(doc(db, 'users', d.id), { followersCount: increment(-1) });
      await lote.commit().catch(() => {});
      await deleteDoc(d.ref);
    }),
  );
}

export async function excluirContaCompleta(uid: string): Promise<void> {
  const usuario = auth.currentUser;
  if (!usuario || usuario.uid !== uid) throw new Error('Sessão expirada');

  // O Firebase só apaga o login de quem entrou há pouco. Confere antes, para não
  // apagar o conteúdo e deixar a conta pela metade.
  const ultimoLogin = Date.parse(usuario.metadata.lastSignInTime || '');
  if (!ultimoLogin || Date.now() - ultimoLogin > 4 * 60_000) {
    throw Object.assign(new Error('Login antigo'), { code: 'auth/requires-recent-login' });
  }

  const meu = (sub: string) => collection(db, 'users', uid, sub);
  await Promise.allSettled([
    apagarTodos(query(collection(db, 'reviews'), where('uid', '==', uid)), apagarAvaliacao),
    apagarTodos(query(collection(db, 'posts'), where('uid', '==', uid))),
    apagarTodos(query(collection(db, 'eventos'), where('criadorUid', '==', uid))),
    apagarTodos(query(meu('postsPrivados'))),
    apagarTodos(query(meu('notificacoes'))),
    apagarTodos(query(meu('bloqueados'))),
    apagarTodos(query(meu('fcmTokens'))),
    sairDosClubes(uid),
    desfazerSeguindo(uid),
    apagarPasta(`reviews/${uid}`),
    apagarPasta(`posts/${uid}`),
    apagarPasta(`avatars/${uid}`),
  ]);

  // Perfil e login por último: as etapas acima precisam da pessoa logada
  await deleteDoc(doc(db, 'users', uid));
  await deleteUser(usuario);
}
