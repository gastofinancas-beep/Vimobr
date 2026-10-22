import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Lock,
  Send,
  Settings,
  Share2,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import { CriarEventoModal, EventoCard } from '../components/Eventos';
import CriarClubeModal, { EscudoClube } from '../components/CriarClubeModal';
import MascotMessage from '../components/MascotMessage';
import { Mascote } from '../components/Mascote';
import { Avatar, Spinner, inputClass } from '../components/ui';
import RankingClubeScreen from './RankingClubeScreen';
import { carregarEventos } from '../lib/eventos';
import {
  ehMembro,
  entrarComConvite,
  entrarNoClube,
  infoPontuacao,
  nomeDoMes,
  obterCodigoConvite,
  rankingDoClube,
  rankingLocalDoClube,
  sairDoClube,
  unidadePontos,
  type PlacarMembro,
} from '../lib/clubes';
import type { Clube, Evento, UserProfile } from '../types';

type Vista = 'inicio' | 'ranking' | 'membros' | 'eventos';

export default function ClubeScreen({
  clube: clubeInicial,
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
  const [vista, setVista] = useState<Vista>('inicio');
  const [placar, setPlacar] = useState<PlacarMembro[]>(() => rankingLocalDoClube(clubeInicial));
  const [editando, setEditando] = useState(false);
  const [vendoRegras, setVendoRegras] = useState(false);
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
  const criador = clube.criadorUid === currentUser.uid;
  const totalMembros = clube.membrosUids.length;
  const pont = infoPontuacao(clube.pontuacao);

  useEffect(() => {
    if (!membro) return;
    carregarEventos([clube.id]).then(setEventos).catch(() => setEventos([]));
  }, [clube.id, membro]);

  useEffect(() => {
    let ativo = true;
    setPlacar(rankingLocalDoClube(clube));
    rankingDoClube(clube)
      .then((r) => ativo && setPlacar(r))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [clube.id, totalMembros, clube.pontuacao]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [vista]);

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
    if (clube.privado && codigoClube === undefined) setCodigoClube(await obterCodigoConvite(clube));
  };

  const textoConvite = (c?: string | null) =>
    c
      ? `Entre no clube ${clube.nome} no Vimo. Código de convite: ${c}`
      : `Entre no clube ${clube.nome} no Vimo. Abra Comunidade, busque o clube e toque em Entrar.`;

  const copiarTexto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado('sim');
    } catch {
      setCopiado('falhou');
    }
  };

  const compartilharConvite = async () => {
    const texto = textoConvite(clube.privado ? codigoClube : null);
    try {
      if (navigator.share) await navigator.share({ title: clube.nome, text: texto });
      else await copiarTexto(texto);
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') await copiarTexto(texto);
    }
  };

  const handleSair = async () => {
    setConfirmandoSaida(false);
    atualizar(await sairDoClube(clube, currentUser.uid));
  };

  const membrosOrdenados = Object.values(clube.membros).sort((a, b) => a.entrouEm - b.entrouEm);
  const host = clube.membros[clube.criadorUid];

  if (vista === 'ranking') {
    return (
      <RankingClubeScreen
        clube={clube}
        currentUser={currentUser}
        onVoltar={() => setVista('inicio')}
        onAbrirPerfil={onAbrirPerfil}
      />
    );
  }

  const modais = (
    <>
      {editando && (
        <CriarClubeModal
          currentUser={currentUser}
          clube={clube}
          onClose={() => setEditando(false)}
          onCriado={(c) => {
            setEditando(false);
            atualizar(c);
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
            setVista('eventos');
          }}
        />
      )}

      {vendoRegras && (
        <Folha onFechar={() => setVendoRegras(false)}>
          <div className="flex items-center gap-3">
            <Mascote reacao="ranking" tamanho={64} />
            <div className="min-w-0">
              <h2 className="font-display text-[19px] font-bold text-ink">Regras do clube</h2>
              <p className="text-[13px] text-muted">Pontuação: {pont.titulo}</p>
            </div>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-ink-2">{pont.descricao}</p>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-ink-2">
            <li>Só contam as idas registradas pelos membros com avaliação no Vimo.</li>
            <li>O ranking mensal zera no dia 1. O geral soma todas as idas de cada membro.</li>
          </ul>
          {clube.descricao && (
            <>
              <h3 className="mt-5 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Combinados</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-ink whitespace-pre-line">{clube.descricao}</p>
            </>
          )}
        </Folha>
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
            <>
              <p className="mt-1 text-sm text-muted">O clube é público. Mande o convite e a pessoa entra direto.</p>
              <button
                type="button"
                onClick={compartilharConvite}
                className="mt-4 w-full h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
              >
                <Share2 size={16} strokeWidth={2} />
                {copiado === 'sim' ? 'Convite copiado' : 'Enviar convite'}
              </button>
            </>
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
                  onClick={() => copiarTexto(codigoClube)}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-s2 text-ink text-sm font-semibold cursor-pointer"
                >
                  <Copy size={16} strokeWidth={2} />
                  {copiado === 'sim' ? 'Copiado' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={compartilharConvite}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
                >
                  <Share2 size={16} strokeWidth={2} />
                  Compartilhar
                </button>
              </div>
            </>
          )}
          {copiado === 'falhou' && (
            <p className="mt-2 text-center text-[13px] text-danger">Não foi possível copiar. Toque no código para selecionar.</p>
          )}
        </Folha>
      )}

      {confirmandoSaida && (
        <Folha onFechar={() => setConfirmandoSaida(false)}>
          <h2 className="font-semibold text-[16px] text-ink">Sair de {clube.nome}?</h2>
          <p className="mt-1 text-sm text-muted">Suas idas deixam de contar para o clube.</p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmandoSaida(false)}
              className="flex-1 h-11 rounded-full bg-s2 text-ink text-sm font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button type="button" onClick={handleSair} className="flex-1 h-11 rounded-full bg-ink text-bg text-sm font-semibold cursor-pointer">
              Sair do clube
            </button>
          </div>
        </Folha>
      )}
    </>
  );

  if (vista === 'membros' || vista === 'eventos') {
    return (
      <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-28">
        <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md">
          <div className="max-w-2xl mx-auto grid grid-cols-[44px_1fr_44px] items-center px-4 pt-4 pb-3">
            <button
              type="button"
              onClick={() => setVista('inicio')}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink ring-1 ring-line hover:bg-s2 cursor-pointer"
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
            <h1 className="text-center font-display text-[18px] font-bold text-ink">
              {vista === 'membros' ? `${totalMembros} ${totalMembros === 1 ? 'membro' : 'membros'}` : 'Eventos'}
            </h1>
            <span />
          </div>
        </header>

        <div className="max-w-2xl mx-auto">
          {vista === 'membros' ? (
            <ul className="divide-y divide-line">
              {membrosOrdenados.map((m) => (
                <li key={m.uid}>
                  <button
                    type="button"
                    onClick={() => onAbrirPerfil(m.uid)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-s2 transition-colors cursor-pointer"
                  >
                    <Avatar src={m.photo} name={m.name} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{m.name}</span>
                      {m.handle && <span className="block truncate text-[13px] text-muted">@{m.handle.replace(/^@/, '')}</span>}
                    </span>
                    {m.uid === clube.criadorUid && (
                      <span className="shrink-0 rounded-full bg-s2 px-2.5 py-1 text-[11px] font-semibold text-ink-2">Host</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <section className="px-4 pt-2">
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
                    className="mb-4 w-full h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
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
        </div>
        {modais}
      </div>
    );
  }

  const podio = [placar[1], placar[0], placar[2]];
  const ninguemPontuou = !placar[0] || placar[0].valor === 0;
  const nomesMembros = membrosOrdenados.slice(0, 3).map((m) => m.name.split(' ')[0]);
  const restantes = totalMembros - nomesMembros.length;

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-44">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between px-3 pt-3">
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Fechar clube"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-s2 cursor-pointer"
          >
            <X size={24} strokeWidth={2} />
          </button>
          {criador && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              aria-label="Editar clube"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-s2 cursor-pointer"
            >
              <Settings size={22} strokeWidth={2} />
            </button>
          )}
        </header>

        <section className="px-4 pt-2">
          <div className="flex items-center gap-4">
            <EscudoClube nome={clube.nome} foto={clube.foto} tamanho={92} />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[24px] font-bold leading-tight tracking-tight text-ink">{clube.nome}</h1>
              <p className="mt-1 text-[14px] text-muted">
                {totalMembros} {totalMembros === 1 ? 'membro' : 'membros'} · {clube.privado ? 'Privado' : 'Público'}
              </p>
            </div>
          </div>

          {membro && (
            <p className="mt-4 flex items-center gap-1.5 text-[15px] font-semibold text-primary">
              <CheckCircle2 size={19} strokeWidth={2.2} />
              Você é membro
            </p>
          )}

          <div className="mt-4 grid grid-cols-4 gap-2">
            <Atalho Icon={Users} rotulo="Membros" onClick={() => setVista('membros')} />
            <Atalho Icon={Trophy} rotulo="Ranking" onClick={() => setVista('ranking')} />
            <Atalho Icon={CalendarDays} rotulo="Eventos" onClick={() => setVista('eventos')} />
            <Atalho Icon={FileText} rotulo="Regras" onClick={() => setVendoRegras(true)} />
          </div>
        </section>

        <Bloco>
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-muted">Ranking de {nomeDoMes()}</h2>
            <button
              type="button"
              onClick={() => setVista('ranking')}
              className="flex items-center gap-0.5 text-[14px] font-medium text-muted hover:text-ink cursor-pointer"
            >
              Ver ranking
              <ChevronRight size={17} strokeWidth={2} />
            </button>
          </div>
          {ninguemPontuou ? (
            <div className="mt-3 flex items-center gap-3">
              <Mascote reacao="desafio" tamanho={64} />
              <p className="min-w-0 text-[14px] text-muted">
                Ninguém pontuou em {nomeDoMes()} ainda. {pont.descricao}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 items-end">
              {podio.map((p, i) => {
                const pos = i === 1 ? 1 : i === 0 ? 2 : 3;
                if (!p) return <span key={pos} />;
                return (
                  <button
                    key={p.membro.uid}
                    type="button"
                    onClick={() => onAbrirPerfil(p.membro.uid)}
                    className={`flex min-w-0 flex-col items-center px-1 cursor-pointer ${pos === 1 ? '' : 'pt-6'}`}
                  >
                    <span className="relative">
                      <Avatar src={p.membro.photo} name={p.membro.name} size={pos === 1 ? 64 : 54} />
                      <span
                        className={`absolute -bottom-1 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full text-[12px] font-bold ring-2 ring-bg ${
                          pos === 1 ? 'bg-primary text-white' : pos === 2 ? 'bg-ink text-bg' : 'bg-s3 text-ink'
                        }`}
                      >
                        {pos}
                      </span>
                    </span>
                    <span className="mt-2.5 w-full truncate text-center text-[14px] font-semibold text-ink">{p.membro.name}</span>
                    <span className="text-[13px] text-muted">
                      {p.valor} {unidadePontos(clube.pontuacao, p.valor)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Bloco>

        {host && (
          <Bloco>
            <h2 className="text-[16px] font-semibold text-muted">Host</h2>
            <div className="mt-3 flex items-center gap-3">
              <button type="button" onClick={() => onAbrirPerfil(host.uid)} className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer">
                <Avatar src={host.photo} name={host.name} size={52} />
                <span className="min-w-0">
                  <span className="block truncate text-[17px] font-medium text-ink">{host.name}</span>
                  {host.handle && <span className="block truncate text-[14px] text-muted">@{host.handle.replace(/^@/, '')}</span>}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAbrirPerfil(host.uid)}
                aria-label={`Ver perfil de ${host.name}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-s2 text-ink-2 cursor-pointer"
              >
                <User size={19} strokeWidth={2} />
              </button>
            </div>
          </Bloco>
        )}

        <Bloco>
          <h2 className="text-[16px] font-semibold text-muted">Membros</h2>
          <button type="button" onClick={() => setVista('membros')} className="mt-3 block w-full text-left cursor-pointer">
            <span className="flex items-center">
              {membrosOrdenados.slice(0, 4).map((m, i) => (
                <Avatar key={m.uid} src={m.photo} name={m.name} size={44} className={`ring-2 ring-bg ${i > 0 ? '-ml-3' : ''}`} />
              ))}
              {totalMembros > 4 && (
                <span className="-ml-3 flex h-[44px] items-center rounded-full bg-ink px-3.5 text-[15px] font-semibold text-bg ring-2 ring-bg tabular">
                  +{totalMembros - 4}
                </span>
              )}
            </span>
            <span className="mt-2 block truncate text-[14px] text-muted">
              {nomesMembros.join(', ')}
              {restantes > 0 ? ` e mais ${restantes}` : ''}
            </span>
          </button>
        </Bloco>

        <Bloco>
          <h2 className="text-[16px] font-semibold text-muted">Sobre</h2>
          {clube.descricao ? (
            <p className="mt-2 text-[15px] leading-relaxed text-ink whitespace-pre-line">{clube.descricao}</p>
          ) : (
            <p className="mt-2 text-[14px] text-muted">Sem descrição.</p>
          )}
          <dl className="mt-3 space-y-1 text-[14px]">
            {clube.cidade && (
              <div className="flex gap-2">
                <dt className="text-muted">Local</dt>
                <dd className="text-ink">{clube.cidade}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-muted">Pontuação</dt>
              <dd className="text-ink">{pont.titulo}</dd>
            </div>
          </dl>
          {clube.tags && clube.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {clube.tags.map((t) => (
                <span key={t} className="rounded-full bg-s2 px-3 py-1 text-[13px] font-medium text-ink-2">
                  {t}
                </span>
              ))}
            </div>
          )}
          {membro && !criador && (
            <button
              type="button"
              onClick={() => setConfirmandoSaida(true)}
              className="mt-5 text-[14px] font-semibold text-danger cursor-pointer"
            >
              Sair do clube
            </button>
          )}
        </Bloco>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 px-4">
        <div className="pointer-events-auto mx-auto max-w-2xl">
          {membro ? (
            <button
              type="button"
              onClick={abrirConvite}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-bg/90 text-[16px] font-semibold text-ink shadow-lg ring-1 ring-line backdrop-blur-md cursor-pointer"
            >
              <Send size={19} strokeWidth={2} />
              Convidar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEntrar}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[16px] font-semibold text-white shadow-lg cursor-pointer"
            >
              {clube.privado && <Lock size={17} strokeWidth={2.2} />}
              {clube.privado ? 'Entrar com convite' : 'Entrar no clube'}
            </button>
          )}
        </div>
      </div>

      {modais}
    </div>
  );
}

function Atalho({ Icon, rotulo, onClick }: { Icon: typeof Users; rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-s2 text-ink-2 hover:bg-s3 transition-colors cursor-pointer"
    >
      <Icon size={21} strokeWidth={1.8} />
      <span className="text-[13px] font-medium">{rotulo}</span>
    </button>
  );
}

function Bloco({ children }: { children: React.ReactNode }) {
  return <section className="mt-6 border-t border-line px-4 pt-5">{children}</section>;
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
      <div role="dialog" aria-modal="true" className="fixed bottom-0 left-0 right-0 z-[70] mx-auto max-w-2xl rounded-t-2xl bg-bg px-5 pt-3 pb-6 pb-safe">
        <div className="mb-3 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>
        {children}
      </div>
    </>
  );
}
