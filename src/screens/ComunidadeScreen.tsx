import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import NotificationsModal from '../components/NotificationsModal';
import MascotMessage from '../components/MascotMessage';
import { Mascote } from '../components/Mascote';
import { CriarEventoModal, EventoCard } from '../components/Eventos';
import { Spinner, btn } from '../components/ui';
import ClubesTab from './ClubesTab';
import ClubeScreen from './ClubeScreen';
import { carregarClubes, clubesLocais, meusClubesLocais } from '../lib/clubes';
import { carregarEventos, eventosLocais } from '../lib/eventos';
import type { Clube, Evento, UserProfile } from '../types';

type AbaComunidade = 'clubes' | 'eventos';

// Mantém aba e clube abertos ao voltar de um lugar ou perfil
const SS_ABA = 'vimo_comunidade_aba';
const SS_CLUBE = 'vimo_comunidade_clube';

function lerSessao(chave: string): string | null {
  try {
    return sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarSessao(chave: string, valor: string | null) {
  try {
    if (valor === null) sessionStorage.removeItem(chave);
    else sessionStorage.setItem(chave, valor);
  } catch {}
}

export default function ComunidadeScreen({
  currentUser,
  onAbrirLugar,
  onAbrirPerfil,
}: {
  currentUser: UserProfile;
  onAbrirLugar: (placeId: string) => void;
  onAbrirPerfil: (uid: string) => void;
}) {
  const [aba, setAba] = useState<AbaComunidade>(() => (lerSessao(SS_ABA) === 'eventos' ? 'eventos' : 'clubes'));
  const [clubeAberto, setClubeAberto] = useState<{ clube: Clube; posicao?: number } | null>(() => {
    const id = lerSessao(SS_CLUBE);
    const clube = id ? clubesLocais().find((c) => c.id === id) : undefined;
    return clube ? { clube } : null;
  });
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);

  useEffect(() => gravarSessao(SS_ABA, aba), [aba]);

  const abrirClube = (clube: Clube, posicao?: number) => {
    gravarSessao(SS_CLUBE, clube.id);
    setClubeAberto({ clube, posicao });
    window.scrollTo({ top: 0 });
  };

  if (clubeAberto) {
    return (
      <ClubeScreen
        key={clubeAberto.clube.id}
        clube={clubeAberto.clube}
        posicao={clubeAberto.posicao}
        currentUser={currentUser}
        onVoltar={() => {
          gravarSessao(SS_CLUBE, null);
          setClubeAberto(null);
        }}
        onAtualizado={(c) => setClubeAberto((prev) => (prev ? { ...prev, clube: c } : prev))}
        onAbrirLugar={onAbrirLugar}
        onAbrirPerfil={onAbrirPerfil}
      />
    );
  }

  return (
    <div className="flex-1 w-full bg-bg text-ink min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto grid grid-cols-[40px_1fr_40px] items-center px-4 pt-4 pb-2">
          <span />
          <h1 className="text-center font-display text-[20px] font-bold text-ink">Comunidade</h1>
          <NotificationBell currentUserUid={currentUser.uid} onClick={() => setMostrarNotificacoes(true)} className={btn.icon} />
        </div>
        <div role="tablist" className="max-w-2xl mx-auto flex border-b border-line">
          {(['clubes', 'eventos'] as AbaComunidade[]).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={`flex-1 py-3 text-[15px] font-semibold transition-colors cursor-pointer ${
                aba === a ? 'text-ink border-b-2 border-ink -mb-px' : 'text-muted hover:text-ink-2'
              }`}
            >
              {a === 'clubes' ? 'Clubes' : 'Eventos'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {aba === 'clubes' ? (
          <ClubesTab currentUser={currentUser} onAbrirClube={abrirClube} />
        ) : (
          <EventosTab currentUser={currentUser} onAbrirLugar={onAbrirLugar} onVerClubes={() => setAba('clubes')} />
        )}
      </main>

      {mostrarNotificacoes && (
        <NotificationsModal
          currentUserUid={currentUser.uid}
          onClose={() => setMostrarNotificacoes(false)}
          onAbrirLugar={(id) => onAbrirLugar(id)}
          onAbrirPerfil={onAbrirPerfil}
        />
      )}
    </div>
  );
}

function EventosTab({
  currentUser,
  onAbrirLugar,
  onVerClubes,
}: {
  currentUser: UserProfile;
  onAbrirLugar: (placeId: string) => void;
  onVerClubes: () => void;
}) {
  const [meusClubes, setMeusClubes] = useState<Clube[]>(() => meusClubesLocais(currentUser.uid));
  const [eventos, setEventos] = useState<Evento[]>(() => eventosLocais(meusClubesLocais(currentUser.uid).map((c) => c.id)));
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    let ativo = true;
    carregarClubes()
      .then((todos) => {
        const meus = todos.filter((c) => c.membrosUids.includes(currentUser.uid));
        if (!ativo) return null;
        setMeusClubes(meus);
        return carregarEventos(meus.map((c) => c.id));
      })
      .then((lista) => ativo && lista && setEventos(lista))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [currentUser.uid]);

  const agora = Date.now();
  const { proximos, anteriores } = useMemo(() => {
    const limite = agora - 3 * 3600_000;
    return {
      proximos: eventos.filter((e) => e.data >= limite).sort((a, b) => a.data - b.data),
      anteriores: eventos.filter((e) => e.data < limite).sort((a, b) => b.data - a.data).slice(0, 10),
    };
  }, [eventos, agora]);

  const atualizar = (n: Evento) => setEventos((prev) => prev.map((e) => (e.id === n.id ? n : e)));

  if (meusClubes.length === 0) {
    return carregando ? (
      <Spinner label="Carregando eventos" />
    ) : (
      <MascotMessage
        reaction="pensativo"
        title="Eventos são do clube"
        subtitle="Entre ou crie um clube para marcar idas a restaurantes com o grupo."
        ctaLabel="Ver clubes"
        onCta={onVerClubes}
      />
    );
  }

  return (
    <div className="px-4 pt-4 pb-10">
      <button
        type="button"
        onClick={() => setCriando(true)}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold cursor-pointer"
      >
        <CalendarPlus size={17} strokeWidth={2} />
        Marcar evento
      </button>

      <h2 className="t-section mt-6 mb-3 text-ink">Próximos</h2>
      {proximos.length === 0 ? (
        <div className="flex flex-col items-center py-4 text-center">
          <Mascote reacao="dormindo" tamanho={76} />
          <p className="mt-2 text-sm text-muted">Nenhum evento marcado nos seus clubes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proximos.map((e) => (
            <EventoCard key={e.id} evento={e} currentUser={currentUser} onAtualizado={atualizar} onAbrirLugar={onAbrirLugar} />
          ))}
        </div>
      )}

      {anteriores.length > 0 && (
        <>
          <h2 className="t-section mt-7 mb-3 text-ink">Já aconteceram</h2>
          <div className="space-y-3">
            {anteriores.map((e) => (
              <EventoCard key={e.id} evento={e} currentUser={currentUser} onAtualizado={atualizar} onAbrirLugar={onAbrirLugar} />
            ))}
          </div>
        </>
      )}

      {criando && (
        <CriarEventoModal
          currentUser={currentUser}
          clubes={meusClubes}
          onClose={() => setCriando(false)}
          onCriado={(e) => {
            setCriando(false);
            setEventos((prev) => [e, ...prev]);
          }}
        />
      )}
    </div>
  );
}
