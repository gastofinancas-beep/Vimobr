import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarPlus, Copy, Lock, PenSquare, Share2, UserPlus } from 'lucide-react';
import { CriarEventoModal, EventoCard } from '../components/Eventos';
import CriarPostModal from '../components/CriarPostModal';
import { EscudoClube } from '../components/CriarClubeModal';
import { FeedPosts, SkeletonPosts } from '../components/PostCard';
import MascotMessage from '../components/MascotMessage';
import { Mascote } from '../components/Mascote';
import { Avatar, Spinner, inputClass } from '../components/ui';
import { carregarEventos } from '../lib/eventos';
import { carregarPostsDoClube } from '../lib/posts';
import {
  ehMembro,
  entrarComConvite,
  entrarNoClube,
  obterCodigoConvite,
  nomeDoMes,
  rankingDoClube,
  sairDoClube,
  type PlacarMembro,
} from '../lib/clubes';
import type { Clube, Evento, FoodTweet, UserProfile } from '../types';

type AbaClube = 'feed' | 'eventos' | 'ranking' | 'membros';

const ROTULO_ABA: Record<AbaClube, string> = { feed: 'Feed', eventos: 'Eventos', ranking: 'Ranking', membros: 'Membros' };

export default function ClubeScreen({
  clube: clubeInicial,
  posicao,
  currentUser,
  onVoltar,
  onAtualizado,
  onAbrirLugar,
  onAbrirPerfil,
}: {
  clube: Clube;
  posicao?: number;
  currentUser: UserProfile;
  onVoltar: () => void;
  onAtualizado: (clube: Clube) => void;
  onAbrirLugar: (id: string) => void;
  onAbrirPerfil: (uid: string) => void;
}) {
  const [clube, setClube] = useState(clubeInicial);
  const [aba, setAba] = useState<AbaClube>('feed');
  const [posts, setPosts] = useState<FoodTweet[]>([]);
  const [carregandoPosts, setCarregandoPosts] = useState(true);
  const [placar, setPlacar] = useState<PlacarMembro[] | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [criandoEvento, setCriandoEvento] = useState(false);
  const [pedindoConvite, setPedindoConvite] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [erroConvite, setErroConvite] = useState('');
  const [conferindo, setConferindo] = useState(false);
  const [mostrandoConvite, setMostrandoConvite] = useState(false);
  const [codigoClube, setCodigoClube] = useState<string | null | undefined>(undefined);
  const [copiado, setCopiado] = useState<'sim' | 'falhou' | null>(null);

  const membro = ehMembro(clube, currentUser.uid);
  const totalMembros = clube.membrosUids.length;
  const idasDoClube = placar?.reduce((s, p) => s + p.idas, 0);

  const recarregarPosts = () => {
    setCarregandoPosts(true);
    carregarPostsDoClube(clube.id, currentUser.uid)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setCarregandoPosts(false));
  };

  useEffect(() => {
    if (membro) recarregarPosts();
  }, [clube.id, membro]);

  useEffect(() => {
    if (!membro) return;
    carregarEventos([clube.id]).then(setEventos).catch(() => setEventos([]));
  }, [clube.id, membro]);

  useEffect(() => {
    setPlacar(null);
    rankingDoClube(clube).then(setPlacar).catch(() => setPlacar([]));
  }, [clube.id, totalMembros]);

  const atualizar = (c: Clube) => {
    setClube(c);
    onAtualizado(c);
  };

  const eu = {
    uid: currentUser.uid,
    name: currentUser.displayName,
    handle: currentUser.handle,
    photo: currentUser.photoURL ?? '',
  };

  const handleEntrar = async () => {
    if (clube.privado) {
      setPedindoConvite(true);
      return;
    }
    atualizar(await entrarNoClube(clube, eu));
  };

  const handleConvite = async () => {
    setConferindo(true);
    setErroConvite('');
    const r = await entrarComConvite(clube, eu, codigo);
    setConferindo(false);
    if (!r.ok) {
      setErroConvite(r.erro);
      return;
    }
    setPedindoConvite(false);
    setCodigo('');
    atualizar(r.clube);
  };

  const abrirConvite = async () => {
    setMostrandoConvite(true);
    setCopiado(null);
    if (codigoClube === undefined) setCodigoClube(await obterCodigoConvite(clube));
  };

  const textoConvite = (c: string) => `Entre no clube ${clube.nome} no Vimo. Código de convite: ${c}`;

  const copiarCodigo = async () => {
    if (!codigoClube) return;
    try {
      await navigator.clipboard.writeText(codigoClube);
      setCopiado('sim');
    } catch {
      setCopiado('falhou');
    }
  };

  const compartilharCodigo = async () => {
    if (!codigoClube) return;
    try {
      if (navigator.share) await navigator.share({ title: clube.nome, text: textoConvite(codigoClube) });
      else await copiarCodigo();
    } catch {}
  };

  const handleSair = async () => {
    setConfirmandoSaida(false);
    atualizar(await sairDoClube(clube, currentUser.uid));
    setPosts([]);
  };

  const membrosOrdenados = Object.values(clube.membros).sort((a, b) => a.entrouEm - b.entrouEm);

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-2 h-14">
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-s2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span className="font-semibold text-[15px] text-ink truncate">{clube.nome}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        <section className="px-4 pt-2">
          <div className="flex items-center gap-4">
            <EscudoClube nome={clube.nome} tamanho={72} />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[22px] font-bold tracking-tight text-ink leading-tight">{clube.nome}</h1>
              <p className="mt-0.5 text-sm text-muted">
                {clube.privado && <Lock size={12} strokeWidth={2.2} className="mr-1 inline -mt-0.5" />}
                {clube.privado ? 'Privado · ' : ''}
                {totalMembros} {totalMembros === 1 ? 'membro' : 'membros'}
                {clube.cidade ? ` · ${clube.cidade}` : ''}
              </p>
            </div>
          </div>

          {clube.descricao && <p className="mt-3 text-[14px] text-ink-2 leading-relaxed">{clube.descricao}</p>}

          <dl className="mt-4 grid grid-cols-2 rounded-2xl bg-s1 py-3 ring-1 ring-line">
            <div className="flex flex-col items-center">
              <dd className="t-rating text-xl text-ink">{posicao ? `${posicao}º` : '–'}</dd>
              <dt className="text-xs text-muted">no ranking de {nomeDoMes()}</dt>
            </div>
            <div className="flex flex-col items-center border-l border-line">
              <dd className="t-rating text-xl text-ink">{idasDoClube ?? '–'}</dd>
              <dt className="text-xs text-muted">idas no mês</dt>
            </div>
          </dl>

          {membro ? (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPublicando(true)}
                className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
              >
                <PenSquare size={16} strokeWidth={2} />
                Publicar no clube
              </button>
              <button
                type="button"
                onClick={abrirConvite}
                aria-label="Convidar pessoas"
                className="h-11 w-11 flex items-center justify-center rounded-full bg-s1 text-ink ring-1 ring-inset ring-line hover:bg-s2 cursor-pointer"
              >
                <UserPlus size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoSaida(true)}
                className="h-11 px-5 rounded-full bg-s1 text-ink text-sm font-semibold ring-1 ring-inset ring-line hover:bg-s2 cursor-pointer"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleEntrar}
              className="mt-4 w-full h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
            >
              {clube.privado && <Lock size={15} strokeWidth={2.2} />}
              {clube.privado ? 'Entrar com convite' : 'Entrar no clube'}
            </button>
          )}
        </section>

        <div role="tablist" className="mt-6 flex border-b border-line">
          {(['feed', 'eventos', 'ranking', 'membros'] as AbaClube[]).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={`flex-1 py-2.5 text-[14px] font-semibold transition-colors cursor-pointer ${
                aba === a ? 'text-ink border-b-2 border-ink -mb-px' : 'text-muted hover:text-ink-2'
              }`}
            >
              {ROTULO_ABA[a]}
            </button>
          ))}
        </div>

        {aba === 'feed' &&
          (!membro ? (
            <MascotMessage
              reaction="pensativo"
              title="Feed só para membros"
              subtitle={
                clube.privado
                  ? 'Clube privado. Entre com o código de convite para ver o feed.'
                  : 'Entre no clube para ver e publicar no feed dele.'
              }
            />
          ) : carregandoPosts ? (
            <SkeletonPosts />
          ) : posts.length === 0 ? (
            <MascotMessage
              reaction="tranquilo"
              title="Nenhuma publicação no clube"
              subtitle="As publicações feitas para o clube aparecem só aqui."
              ctaLabel="Publicar no clube"
              onCta={() => setPublicando(true)}
            />
          ) : (
            <FeedPosts
              posts={posts}
              setPosts={setPosts}
              currentUser={currentUser}
              onAbrirLugar={onAbrirLugar}
              onAbrirPerfil={onAbrirPerfil}
            />
          ))}

        {aba === 'eventos' && (
          <section className="px-4 pt-4">
            {!membro ? (
              <MascotMessage
                reaction="pensativo"
                title="Eventos só para membros"
                subtitle="Entre no clube para ver e marcar idas com o grupo."
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCriandoEvento(true)}
                  className="mb-4 w-full h-11 flex items-center justify-center gap-2 rounded-full bg-s1 text-ink text-sm font-semibold ring-1 ring-inset ring-line hover:bg-s2 cursor-pointer"
                >
                  <CalendarPlus size={17} strokeWidth={2} />
                  Marcar evento
                </button>
                {eventos === null ? (
                  <Spinner label="Carregando eventos" />
                ) : eventos.length === 0 ? (
                  <div className="flex flex-col items-center py-4 text-center">
                    <Mascote reacao="focado" tamanho={76} />
                    <p className="mt-2 text-sm text-muted">Nenhum evento marcado. Escolha um lugar e chame o clube.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...eventos]
                      .sort((a, b) => {
                        const agora = Date.now();
                        const fa = a.data >= agora, fb = b.data >= agora;
                        return fa !== fb ? (fa ? -1 : 1) : fa ? a.data - b.data : b.data - a.data;
                      })
                      .map((e) => (
                        <EventoCard
                          key={e.id}
                          evento={e}
                          currentUser={currentUser}
                          mostrarClube={false}
                          onAtualizado={(n) => setEventos((prev) => (prev ?? []).map((x) => (x.id === n.id ? n : x)))}
                          onAbrirLugar={onAbrirLugar}
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {aba === 'ranking' && (
          <section className="px-4 pt-4">
            {(() => {
              const lider = placar && placar[0]?.idas > 0 ? placar[0] : null;
              const souLider = lider?.membro.uid === currentUser.uid;
              return (
                <div className="mb-4 flex items-center gap-3">
                  <Mascote reacao={souLider ? 'primeiro-lugar' : lider ? 'desafio' : 'ranking'} tamanho={60} />
                  <p className="min-w-0 text-sm text-muted">
                    {souLider
                      ? `Você lidera o clube em ${nomeDoMes()}.`
                      : lider
                      ? `${lider.membro.name.split(' ')[0]} lidera em ${nomeDoMes()}. Cada avaliação conta como uma ida.`
                      : `Quem mais registrar idas em ${nomeDoMes()} lidera. Cada avaliação conta como uma ida.`}
                  </p>
                </div>
              );
            })()}
            {placar === null ? (
              <Spinner label="Carregando ranking" />
            ) : (
              <ol className="divide-y divide-line rounded-2xl bg-s1 ring-1 ring-line">
                {placar.map((p, i) => (
                  <li key={p.membro.uid}>
                    <button
                      type="button"
                      onClick={() => onAbrirPerfil(p.membro.uid)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer ${
                        p.membro.uid === currentUser.uid ? 'bg-primary/5' : ''
                      }`}
                    >
                      <Posicao n={i + 1} />
                      <Avatar src={p.membro.photo} name={p.membro.name} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-ink">{p.membro.name}</span>
                        <span className="block text-[12px] text-muted">
                          {p.lugares} {p.lugares === 1 ? 'lugar diferente' : 'lugares diferentes'}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block t-rating text-lg text-ink">{p.idas}</span>
                        <span className="block text-[11px] text-muted">{p.idas === 1 ? 'ida' : 'idas'}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {aba === 'membros' && (
          <ul className="divide-y divide-line">
            {membrosOrdenados.map((m) => (
              <li key={m.uid}>
                <button
                  type="button"
                  onClick={() => onAbrirPerfil(m.uid)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-s2 transition-colors cursor-pointer"
                >
                  <Avatar src={m.photo} name={m.name} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{m.name}</span>
                    <span className="block truncate text-[12px] text-muted">{m.handle}</span>
                  </span>
                  {m.uid === clube.criadorUid && (
                    <span className="shrink-0 rounded-full bg-s2 px-2.5 py-1 text-[11px] font-semibold text-ink-2">Criador</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {publicando && (
        <CriarPostModal
          currentUser={currentUser}
          clubeInicial={clube}
          onClose={() => setPublicando(false)}
          onPublicado={() => {
            setPublicando(false);
            setAba('feed');
            recarregarPosts();
          }}
        />
      )}

      {criandoEvento && (
        <CriarEventoModal
          currentUser={currentUser}
          clubes={[clube]}
          clubeInicial={clube}
          onClose={() => setCriandoEvento(false)}
          onCriado={(e) => {
            setCriandoEvento(false);
            setEventos((prev) => [e, ...(prev ?? [])]);
            setAba('eventos');
          }}
        />
      )}

      {pedindoConvite && (
        <Folha onFechar={() => setPedindoConvite(false)}>
          <h2 className="font-semibold text-[16px] text-ink">Entrar em {clube.nome}</h2>
          <p className="mt-1 text-sm text-muted">Este clube é privado. Peça o código a um membro.</p>
          <input
            autoFocus
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              setErroConvite('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleConvite()}
            maxLength={12}
            placeholder="Código de convite"
            autoCapitalize="characters"
            className={`${inputClass} mt-4 text-center font-semibold tracking-[0.25em]`}
          />
          {erroConvite && <p className="mt-2 text-[13px] text-danger">{erroConvite}</p>}
          <button
            type="button"
            onClick={handleConvite}
            disabled={conferindo || codigo.trim().length < 4}
            className="mt-4 w-full h-11 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-40 cursor-pointer"
          >
            {conferindo ? 'Conferindo…' : 'Entrar'}
          </button>
        </Folha>
      )}

      {mostrandoConvite && (
        <Folha onFechar={() => setMostrandoConvite(false)}>
          <h2 className="font-semibold text-[16px] text-ink">Convidar para {clube.nome}</h2>
          {!clube.privado ? (
            <p className="mt-1 text-sm text-muted">
              O clube é público. Peça para a pessoa abrir Comunidade, achar o clube e tocar em Entrar.
            </p>
          ) : codigoClube === undefined ? (
            <Spinner label="Buscando código" />
          ) : codigoClube === null ? (
            <p className="mt-1 text-sm text-muted">Não foi possível carregar o código agora. Tente de novo em instantes.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Envie este código. Só quem tem o código consegue entrar.</p>
              <p className="mt-4 rounded-xl bg-s2 py-4 text-center font-display text-[26px] font-extrabold tracking-[0.3em] text-ink select-all">
                {codigoClube}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={copiarCodigo}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-s2 text-ink text-sm font-semibold cursor-pointer"
                >
                  <Copy size={16} strokeWidth={2} />
                  {copiado === 'sim' ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={compartilharCodigo}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
                >
                  <Share2 size={16} strokeWidth={2} />
                  Compartilhar
                </button>
              </div>
              {copiado === 'falhou' && (
                <p className="mt-2 text-center text-[13px] text-danger">Não foi possível copiar. Toque no código para selecionar.</p>
              )}
            </>
          )}
        </Folha>
      )}

      {confirmandoSaida && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setConfirmandoSaida(false)} aria-hidden="true" />
          <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-bg px-5 pt-5 pb-6 pb-safe">
            <h2 className="font-semibold text-[16px] text-ink">Sair de {clube.nome}?</h2>
            <p className="mt-1 text-sm text-muted">Suas idas deixam de contar para o clube e o feed some para você.</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoSaida(false)}
                className="flex-1 h-11 rounded-full bg-s2 text-ink text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSair}
                className="flex-1 h-11 rounded-full bg-ink text-bg text-sm font-semibold cursor-pointer"
              >
                Sair do clube
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Posicao({ n }: { n: number }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular ${
        n === 1 ? 'bg-primary text-white' : n <= 3 ? 'bg-ink text-bg' : 'bg-s2 text-ink-2'
      }`}
    >
      {n}
    </span>
  );
}

function Folha({ onFechar, children }: { onFechar: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onFechar} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-bg px-5 pt-3 pb-6 pb-safe">
        <div className="mb-3 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>
        {children}
      </div>
    </>
  );
}
