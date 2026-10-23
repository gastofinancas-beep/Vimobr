import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { getLocalReviews } from './reviews';
import { criarNotificacao, notificarVarios } from './notifications';
import type { Clube, ClubeMembro, PontuacaoClube, Review } from '../types';

const LS_CLUBES_KEY = 'vimo_clubes_v1';
const LS_CONVITES_KEY = 'vimo_clube_convites_v1';
// Clubes excluídos neste aparelho não voltam pela sincronização
const LS_EXCLUIDOS_KEY = 'vimo_clubes_excluidos_v1';

function lerExcluidos(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_EXCLUIDOS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

/** Clube que foi excluído pelo criador (os posts dele ficam só com quem publicou). */
export const clubeFoiExcluido = (clubeId: string) => lerExcluidos().has(clubeId);

function lerConvites(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_CONVITES_KEY) || '{}');
  } catch {
    return {};
  }
}

function guardarConvite(clubeId: string, codigo: string) {
  try {
    localStorage.setItem(LS_CONVITES_KEY, JSON.stringify({ ...lerConvites(), [clubeId]: codigo }));
  } catch {}
}

function gerarCodigo(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('');
}

export const normalizarCodigo = (c: string) => c.replace(/[^a-z0-9]/gi, '').toUpperCase();

function lerLocais(): Clube[] {
  try {
    const raw = localStorage.getItem(LS_CLUBES_KEY);
    const lista: Clube[] = raw ? JSON.parse(raw) : [];
    const excluidos = lerExcluidos();
    return Array.isArray(lista) ? lista.filter((c) => !excluidos.has(c.id)) : [];
  } catch {
    return [];
  }
}

function salvarLocais(clubes: Clube[]) {
  try {
    localStorage.setItem(LS_CLUBES_KEY, JSON.stringify(clubes));
  } catch {}
}

function substituirLocal(clube: Clube) {
  const lista = lerLocais();
  const i = lista.findIndex((c) => c.id === clube.id);
  if (i >= 0) lista[i] = clube;
  else lista.unshift(clube);
  salvarLocais(lista);
}

/** Grava no servidor em segundo plano; o Firestore pode lançar erro síncrono (ex.: campo vazio). */
export function sincronizar(gravar: () => Promise<unknown>) {
  if (!isFirebaseConfigured) return;
  try {
    gravar().catch(() => {});
  } catch {}
}

export const EVENTO_ABRIR_CLUBE = 'vimo:abrir_clube';

/** Abre um clube a partir de qualquer tela (ex.: toque numa notificação). */
export function abrirClube(clubeId: string): void {
  try {
    sessionStorage.setItem('vimo_comunidade_aba', 'clubes');
    sessionStorage.setItem('vimo_comunidade_clube', clubeId);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_CLUBE, { detail: clubeId }));
}

export function clubesLocais(): Clube[] {
  return lerLocais();
}

export function meusClubesLocais(uid: string): Clube[] {
  return lerLocais().filter((c) => c.membrosUids.includes(uid));
}

export function ehMembro(clube: Clube, uid: string): boolean {
  return clube.membrosUids.includes(uid);
}

export async function carregarClubes(): Promise<Clube[]> {
  const locais = lerLocais();
  if (!isFirebaseConfigured) return locais;
  try {
    const snap = await comPrazo(getDocs(query(collection(db, 'clubes'), limit(200))));
    const excluidos = lerExcluidos();
    const remotos = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Clube)).filter((c) => !excluidos.has(c.id));
    const idsRemotos = new Set(remotos.map((c) => c.id));
    // Lista completa do servidor sem um clube que já existia aqui: o criador excluiu.
    // Clube recém-criado neste aparelho pode ainda não ter subido, então fica.
    const sumiram =
      snap.size < 200 ? locais.filter((c) => !idsRemotos.has(c.id) && Date.now() - c.createdAt > 10 * 60_000) : [];
    if (sumiram.length > 0) {
      try {
        localStorage.setItem(LS_EXCLUIDOS_KEY, JSON.stringify([...excluidos, ...sumiram.map((c) => c.id)]));
      } catch {}
    }
    const mapa = new Map<string, Clube>();
    for (const c of locais) if (!sumiram.includes(c)) mapa.set(c.id, c);
    for (const c of remotos) mapa.set(c.id, c);
    const lista = [...mapa.values()];
    salvarLocais(lista);
    return lista;
  } catch {
    return locais;
  }
}

export interface DadosClube {
  nome: string;
  descricao: string;
  cidade?: string;
  privado?: boolean;
  foto?: string;
  pontuacao?: PontuacaoClube;
  tags?: string[];
}

function semVazios<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export async function criarClube(autor: Omit<ClubeMembro, 'entrouEm'>, dados: DadosClube): Promise<Clube> {
  const agora = Date.now();
  const clube: Clube = semVazios({
    id: crypto.randomUUID(),
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim(),
    cidade: dados.cidade?.trim() || undefined,
    foto: dados.foto,
    pontuacao: dados.pontuacao ?? 'idas',
    tags: dados.tags?.length ? dados.tags : undefined,
    criadorUid: autor.uid,
    privado: !!dados.privado,
    membros: { [autor.uid]: { ...autor, entrouEm: agora } },
    membrosUids: [autor.uid],
    createdAt: agora,
  });
  const codigo = clube.privado ? gerarCodigo() : null;
  if (codigo) guardarConvite(clube.id, codigo);

  substituirLocal(clube);
  sincronizar(async () => {
    const { id, ...campos } = clube;
    await setDoc(doc(db, 'clubes', id), campos);
    // o convite fica num documento que só membros leem
    if (codigo) await setDoc(doc(db, 'clubeConvites', id), { codigo });
  });
  return clube;
}

/** Só o criador edita: nome, foto, descrição, cidade, privacidade, pontuação e tags. */
export async function editarClube(clube: Clube, dados: DadosClube): Promise<Clube> {
  const atualizado: Clube = {
    ...clube,
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim(),
    cidade: dados.cidade?.trim() || undefined,
    foto: dados.foto || undefined,
    pontuacao: dados.pontuacao ?? 'idas',
    tags: dados.tags?.length ? dados.tags : undefined,
    privado: !!dados.privado,
  };
  const precisaCodigo = atualizado.privado && !lerConvites()[clube.id];
  const codigo = precisaCodigo ? gerarCodigo() : null;
  if (codigo) guardarConvite(clube.id, codigo);
  substituirLocal(atualizado);
  sincronizar(async () => {
    await updateDoc(doc(db, 'clubes', clube.id), {
      nome: atualizado.nome,
      descricao: atualizado.descricao,
      cidade: atualizado.cidade ?? deleteField(),
      foto: atualizado.foto ?? deleteField(),
      pontuacao: atualizado.pontuacao,
      tags: atualizado.tags ?? deleteField(),
      privado: atualizado.privado,
    });
    if (codigo) await setDoc(doc(db, 'clubeConvites', clube.id), { codigo });
  });
  return atualizado;
}

/** Foto do clube pequena (até 400 px) para caber no documento do Firestore. */
export async function comprimirFotoClube(file: File, lado = 400): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const i = new Image();
      i.onload = () => resolver(i);
      i.onerror = rejeitar;
      i.src = url;
    });
    // recorte quadrado no centro
    const menor = Math.min(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(lado, menor);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, (img.width - menor) / 2, (img.height - menor) / 2, menor, menor, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function entrarNoClube(clube: Clube, membro: Omit<ClubeMembro, 'entrouEm'>): Promise<Clube> {
  const novo: ClubeMembro = { ...membro, entrouEm: Date.now() };
  const atualizado: Clube = {
    ...clube,
    membros: { ...clube.membros, [membro.uid]: novo },
    membrosUids: [...new Set([...clube.membrosUids, membro.uid])],
  };
  substituirLocal(atualizado);
  sincronizar(() =>
    updateDoc(doc(db, 'clubes', clube.id), {
      [`membros.${membro.uid}`]: novo,
      membrosUids: arrayUnion(membro.uid),
    }),
  );
  avisarCriadorDaEntrada(atualizado, membro);
  return atualizado;
}

function avisarCriadorDaEntrada(clube: Clube, membro: Omit<ClubeMembro, 'entrouEm'>) {
  if (!clube.criadorUid || clube.criadorUid === membro.uid) return;
  criarNotificacao(clube.criadorUid, {
    tipo: 'clube_entrou',
    remetente: { uid: membro.uid, name: membro.name, handle: membro.handle, photo: membro.photo },
    texto: `entrou no clube ${clube.nome}.`,
    clubeId: clube.id,
    clubeNome: clube.nome,
  });
}

/** Código do clube privado, para quem já é membro compartilhar. */
export async function obterCodigoConvite(clube: Clube): Promise<string | null> {
  const local = lerConvites()[clube.id];
  if (local) return local;
  if (!isFirebaseConfigured) return null;
  try {
    const snap = await comPrazo(getDoc(doc(db, 'clubeConvites', clube.id)));
    const codigo = snap.exists() ? (snap.data().codigo as string) : null;
    if (codigo) guardarConvite(clube.id, codigo);
    return codigo;
  } catch {
    return null;
  }
}

export type ResultadoConvite = { ok: true; clube: Clube } | { ok: false; erro: string };

/** Entrada em clube privado: o código é conferido no aparelho ou pelas regras do servidor. */
export async function entrarComConvite(
  clube: Clube,
  membro: Omit<ClubeMembro, 'entrouEm'>,
  codigoDigitado: string,
): Promise<ResultadoConvite> {
  const codigo = normalizarCodigo(codigoDigitado);
  if (codigo.length < 4) return { ok: false, erro: 'Digite o código do convite.' };
  const novo: ClubeMembro = { ...membro, entrouEm: Date.now() };
  const atualizado: Clube = {
    ...clube,
    membros: { ...clube.membros, [membro.uid]: novo },
    membrosUids: [...new Set([...clube.membrosUids, membro.uid])],
  };
  // Uma gravação só: o uso do convite (conferido pelas regras) e a vaga no clube
  const gravarRemoto = () => {
    const lote = writeBatch(db);
    lote.set(doc(db, 'clubeConvites', clube.id, 'usos', membro.uid), { codigo });
    lote.update(doc(db, 'clubes', clube.id), {
      [`membros.${membro.uid}`]: novo,
      membrosUids: arrayUnion(membro.uid),
    });
    return lote.commit();
  };

  const conhecido = lerConvites()[clube.id];
  if (conhecido) {
    if (conhecido !== codigo) return { ok: false, erro: 'Código de convite inválido.' };
    substituirLocal(atualizado);
    sincronizar(gravarRemoto);
    avisarCriadorDaEntrada(atualizado, membro);
    return { ok: true, clube: atualizado };
  }

  if (!isFirebaseConfigured || !membro.uid) return { ok: false, erro: 'Código de convite inválido.' };
  try {
    await comPrazo(gravarRemoto(), 8000);
    guardarConvite(clube.id, codigo);
    substituirLocal(atualizado);
    avisarCriadorDaEntrada(atualizado, membro);
    return { ok: true, clube: atualizado };
  } catch (e) {
    const negado = (e as { code?: string })?.code === 'permission-denied';
    return {
      ok: false,
      erro: negado ? 'Código de convite inválido.' : 'Não foi possível conferir o convite agora. Tente de novo.',
    };
  }
}

/** Só o criador: remove uma pessoa do clube. */
export async function removerMembro(clube: Clube, uid: string): Promise<Clube> {
  if (uid === clube.criadorUid) return clube;
  const membros = { ...clube.membros };
  delete membros[uid];
  const atualizado: Clube = { ...clube, membros, membrosUids: clube.membrosUids.filter((u) => u !== uid) };
  substituirLocal(atualizado);
  sincronizar(() =>
    updateDoc(doc(db, 'clubes', clube.id), {
      [`membros.${uid}`]: deleteField(),
      membrosUids: arrayRemove(uid),
    }),
  );
  const criador = clube.membros[clube.criadorUid];
  if (criador) {
    criarNotificacao(uid, {
      tipo: 'clube_removido',
      remetente: { uid: criador.uid, name: criador.name, handle: criador.handle, photo: criador.photo },
      texto: `removeu você do clube ${clube.nome}.`,
      clubeId: clube.id,
      clubeNome: clube.nome,
    });
  }
  return atualizado;
}

/** Só o criador: apaga o clube para todos. Os posts continuam com quem publicou. */
export function excluirClube(clube: Clube): void {
  try {
    localStorage.setItem(LS_EXCLUIDOS_KEY, JSON.stringify([...lerExcluidos(), clube.id]));
  } catch {}
  salvarLocais(lerLocais().filter((c) => c.id !== clube.id));
  sincronizar(async () => {
    // o convite primeiro: a regra dele consulta o documento do clube
    if (clube.privado) await deleteDoc(doc(db, 'clubeConvites', clube.id)).catch(() => {});
    await deleteDoc(doc(db, 'clubes', clube.id));
  });
}

export async function sairDoClube(clube: Clube, uid: string): Promise<Clube> {
  const membros = { ...clube.membros };
  delete membros[uid];
  const atualizado: Clube = {
    ...clube,
    membros,
    membrosUids: clube.membrosUids.filter((u) => u !== uid),
  };
  substituirLocal(atualizado);
  sincronizar(() =>
    updateDoc(doc(db, 'clubes', clube.id), {
      [`membros.${uid}`]: deleteField(),
      membrosUids: arrayRemove(uid),
    }),
  );
  return atualizado;
}

// ---------- Competição: idas no mês ----------

export function inicioDoMes(data = new Date()): number {
  return new Date(data.getFullYear(), data.getMonth(), 1).getTime();
}

export function nomeDoMes(data = new Date()): string {
  return data.toLocaleDateString('pt-BR', { month: 'long' });
}

/** Rede lenta não pode travar a tela: desiste depois do prazo. */
export function comPrazo<T>(promessa: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, rejeitar) => setTimeout(() => rejeitar(new Error('prazo')), ms)),
  ]);
}

function reviewsLocaisDesde(uids: string[], desde: number): Review[] {
  const alvo = new Set(uids);
  return getLocalReviews().filter((r) => alvo.has(r.uid) && r.visitedAt >= desde);
}

async function reviewsDesde(uids: string[], desde: number): Promise<Review[]> {
  const mapa = new Map<string, Review>();
  for (const r of reviewsLocaisDesde(uids, desde)) mapa.set(r.id, r);
  if (isFirebaseConfigured && uids.length > 0) {
    try {
      const blocos: string[][] = [];
      for (let i = 0; i < uids.length; i += 30) blocos.push(uids.slice(i, i + 30));
      const snaps = await comPrazo(
        Promise.all(blocos.map((b) => getDocs(query(collection(db, 'reviews'), where('uid', 'in', b), limit(500))))),
      );
      for (const s of snaps) {
        for (const d of s.docs) {
          const r = { ...d.data(), id: d.id } as Review;
          if (r.visitedAt >= desde) mapa.set(r.id, r);
        }
      }
    } catch {}
  }
  return [...mapa.values()];
}

export interface PlacarMembro {
  membro: ClubeMembro;
  idas: number;
  lugares: number;
  dias: number;
  /** Pontos pelo sistema de pontuação do clube. */
  valor: number;
}

export const PONTUACOES: { valor: PontuacaoClube; titulo: string; descricao: string; unidade: [string, string] }[] = [
  { valor: 'idas', titulo: 'Mais idas', descricao: 'Quem mais registra idas. Cada avaliação vale um ponto.', unidade: ['ida', 'idas'] },
  {
    valor: 'lugares',
    titulo: 'Lugares diferentes',
    descricao: 'Quem mais conhece lugares novos. Voltar ao mesmo lugar não soma.',
    unidade: ['lugar', 'lugares'],
  },
  { valor: 'dias', titulo: 'Dias ativos', descricao: 'Dias com pelo menos uma ida registrada. Premia a constância.', unidade: ['dia', 'dias'] },
];

export const infoPontuacao = (p?: PontuacaoClube) => PONTUACOES.find((x) => x.valor === p) ?? PONTUACOES[0];

export const unidadePontos = (p: PontuacaoClube | undefined, n: number) => infoPontuacao(p).unidade[n === 1 ? 0 : 1];

export interface PlacarClube {
  clube: Clube;
  idas: number;
  lugares: number;
}

function contar(reviews: Review[], uids: string[]) {
  const doGrupo = reviews.filter((r) => uids.includes(r.uid));
  return { idas: doGrupo.length, lugares: new Set(doGrupo.map((r) => r.placeId)).size };
}

function ordenarClubes(clubes: Clube[], reviews: Review[]): PlacarClube[] {
  return clubes
    .map((clube) => ({ clube, ...contar(reviews, clube.membrosUids) }))
    .sort((a, b) => b.idas - a.idas || b.lugares - a.lugares || b.clube.membrosUids.length - a.clube.membrosUids.length);
}

/** Placar imediato com as idas salvas no aparelho. */
export function rankingLocalDosClubes(clubes: Clube[]): PlacarClube[] {
  const todos = [...new Set(clubes.flatMap((c) => c.membrosUids))];
  return ordenarClubes(clubes, reviewsLocaisDesde(todos, inicioDoMes()));
}

/** Ranking entre clubes: soma das idas dos membros no mês. */
export async function rankingDosClubes(clubes: Clube[]): Promise<PlacarClube[]> {
  const todos = [...new Set(clubes.flatMap((c) => c.membrosUids))];
  return ordenarClubes(clubes, await reviewsDesde(todos, inicioDoMes()));
}

export type PeriodoRanking = 'mensal' | 'geral';

function placarDoClube(clube: Clube, reviews: Review[]): PlacarMembro[] {
  const pont = clube.pontuacao ?? 'idas';
  return Object.values(clube.membros)
    .map((membro) => {
      const minhas = reviews.filter((r) => r.uid === membro.uid);
      const idas = minhas.length;
      const lugares = new Set(minhas.map((r) => r.placeId)).size;
      const dias = new Set(minhas.map((r) => new Date(r.visitedAt).toDateString())).size;
      const valor = pont === 'lugares' ? lugares : pont === 'dias' ? dias : idas;
      return { membro, idas, lugares, dias, valor };
    })
    .sort((a, b) => b.valor - a.valor || b.idas - a.idas || b.lugares - a.lugares || a.membro.entrouEm - b.membro.entrouEm);
}

const desdeDo = (periodo: PeriodoRanking) => (periodo === 'mensal' ? inicioDoMes() : 0);

/** Placar imediato com as idas salvas no aparelho. */
export function rankingLocalDoClube(clube: Clube, periodo: PeriodoRanking = 'mensal'): PlacarMembro[] {
  return placarDoClube(clube, reviewsLocaisDesde(clube.membrosUids, desdeDo(periodo)));
}

/** Ranking interno do clube pelo sistema de pontuação escolhido. */
export async function rankingDoClube(clube: Clube, periodo: PeriodoRanking = 'mensal'): Promise<PlacarMembro[]> {
  return placarDoClube(clube, await reviewsDesde(clube.membrosUids, desdeDo(periodo)));
}

/**
 * Depois de uma ida nova: avisa quem estava à frente no ranking do mês e ficou para trás.
 * Chamado pela tela de avaliar (evita ciclo de importação entre clubes e reviews).
 */
export async function avisarUltrapassagens(autor: Omit<ClubeMembro, 'entrouEm'>, nova: Review): Promise<void> {
  if (!autor.uid) return;
  for (const clube of meusClubesLocais(autor.uid)) {
    try {
      const doMes = (await reviewsDesde(clube.membrosUids, inicioDoMes())).filter((r) => r.id !== nova.id);
      const antes = placarDoClube(clube, doMes);
      const depois = placarDoClube(clube, [...doMes, nova]);
      const meuAntes = antes.find((p) => p.membro.uid === autor.uid)?.valor ?? 0;
      const meuDepois = depois.find((p) => p.membro.uid === autor.uid)?.valor ?? 0;
      if (meuDepois <= meuAntes) continue;
      const passados = antes
        .filter((p) => p.membro.uid !== autor.uid && p.valor > meuAntes && p.valor < meuDepois)
        .map((p) => p.membro.uid);
      notificarVarios(passados, {
        tipo: 'clube_ultrapassou',
        remetente: { uid: autor.uid, name: autor.name, handle: autor.handle, photo: autor.photo },
        texto: `passou você no ranking de ${nomeDoMes()} do clube ${clube.nome}.`,
        clubeId: clube.id,
        clubeNome: clube.nome,
      });
    } catch {}
  }
}
