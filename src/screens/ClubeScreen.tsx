import { useEffect, useState } from 'react';
import { ArrowLeft, PenSquare } from 'lucide-react';
import CriarPostModal from '../components/CriarPostModal';
import { EscudoClube } from '../components/CriarClubeModal';
import { FeedPosts, SkeletonPosts } from '../components/PostCard';
import MascotMessage from '../components/MascotMessage';
import { Avatar, Spinner } from '../components/ui';
import { carregarPostsDoClube } from '../lib/posts';
import {
  ehMembro,
  entrarNoClube,
  nomeDoMes,
  rankingDoClube,
  sairDoClube,
  type PlacarMembro,
} from '../lib/clubes';
import type { Clube, FoodTweet, UserProfile } from '../types';

type AbaClube = 'feed' | 'ranking' | 'membros';

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
    setPlacar(null);
    rankingDoClube(clube).then(setPlacar).catch(() => setPlacar([]));
  }, [clube.id, totalMembros]);

  const atualizar = (c: Clube) => {
    setClube(c);
    onAtualizado(c);
  };

  const handleEntrar = async () => {
    atualizar(
      await entrarNoClube(clube, {
        uid: currentUser.uid,
        name: currentUser.displayName,
        handle: currentUser.handle,
        photo: currentUser.photoURL ?? '',
      }),
    );
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
              className="mt-4 w-full h-11 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
            >
              Entrar no clube
            </button>
          )}
        </section>

        <div role="tablist" className="mt-6 flex border-b border-line">
          {(['feed', 'ranking', 'membros'] as AbaClube[]).map((a) => (
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
              {a === 'feed' ? 'Feed' : a === 'ranking' ? 'Ranking' : 'Membros'}
            </button>
          ))}
        </div>

        {aba === 'feed' &&
          (!membro ? (
            <MascotMessage
              reaction="pensativo"
              title="Feed só para membros"
              subtitle="Entre no clube para ver e publicar no feed dele."
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

        {aba === 'ranking' && (
          <section className="px-4 pt-4">
            <p className="mb-3 text-sm text-muted">
              Quem mais registrou idas em {nomeDoMes()}. Cada avaliação conta como uma ida.
            </p>
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
