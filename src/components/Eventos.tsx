import { useMemo, useState } from 'react';
import { Check, MapPin, X } from 'lucide-react';
import { alternarPresenca, criarEvento, sugerirLugares, vaiNoEvento, type SugestaoLugar } from '../lib/eventos';
import type { Clube, Evento, EventoParticipante, UserProfile } from '../types';
import { Avatar, inputClass } from './ui';

export const participanteDe = (u: UserProfile): EventoParticipante => ({
  uid: u.uid,
  name: u.displayName,
  handle: u.handle,
  photo: u.photoURL ?? '',
});

function formatarQuando(data: number): string {
  const d = new Date(data);
  const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${hora}`;
}

export function EventoCard({
  evento,
  currentUser,
  mostrarClube = true,
  onAtualizado,
  onAbrirLugar,
}: {
  evento: Evento;
  currentUser: UserProfile;
  mostrarClube?: boolean;
  onAtualizado: (e: Evento) => void;
  onAbrirLugar: (placeId: string) => void;
}) {
  const vai = vaiNoEvento(evento, currentUser.uid);
  const passou = evento.data < Date.now() - 3 * 3600_000;
  const d = new Date(evento.data);
  const pessoas = Object.values(evento.confirmados);
  const total = evento.confirmadosUids.length;

  return (
    <article className="rounded-2xl bg-s1 p-4 ring-1 ring-line">
      <div className="flex gap-3.5">
        <div
          className={`flex w-12 shrink-0 flex-col items-center justify-center rounded-xl py-1.5 ${
            passou ? 'bg-s2 text-muted' : 'bg-primary text-white'
          }`}
        >
          <span className="font-display text-[20px] font-extrabold leading-none tabular">{d.getDate()}</span>
          <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide">
            {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-ink">{evento.titulo}</h3>
          <button
            type="button"
            disabled={!evento.placeId}
            onClick={() => evento.placeId && onAbrirLugar(evento.placeId)}
            className="mt-0.5 flex max-w-full items-center gap-1 text-left text-[13px] text-ink-2 enabled:cursor-pointer enabled:hover:text-primary"
          >
            <MapPin size={13} strokeWidth={2} className="shrink-0 text-primary" />
            <span className="truncate">{evento.placeName}</span>
          </button>
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {formatarQuando(evento.data)}
            {mostrarClube ? ` · ${evento.clubeNome}` : ''}
          </p>
        </div>
      </div>

      {evento.observacao && <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{evento.observacao}</p>}

      <div className="mt-3.5 flex items-center gap-3">
        <div className="flex -space-x-2">
          {pessoas.slice(0, 4).map((p) => (
            <Avatar key={p.uid} src={p.photo} name={p.name} size={26} className="ring-2 ring-s1" />
          ))}
        </div>
        <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
          {total === 0 ? 'Ninguém confirmou ainda' : `${total} ${total === 1 ? 'vai' : 'vão'}${passou ? ' (já aconteceu)' : ''}`}
        </span>
        {!passou && (
          <button
            type="button"
            onClick={async () => onAtualizado(await alternarPresenca(evento, participanteDe(currentUser)))}
            aria-pressed={vai}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors cursor-pointer ${
              vai ? 'bg-s2 text-ink ring-1 ring-inset ring-line' : 'bg-primary text-white'
            }`}
          >
            {vai && <Check size={15} strokeWidth={2.4} />}
            {vai ? 'Confirmado' : 'Vou'}
          </button>
        )}
      </div>
    </article>
  );
}

function paraInputData(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function CriarEventoModal({
  currentUser,
  clubes,
  clubeInicial,
  onClose,
  onCriado,
}: {
  currentUser: UserProfile;
  clubes: Clube[];
  clubeInicial?: Clube;
  onClose: () => void;
  onCriado: (evento: Evento) => void;
}) {
  const amanha = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, []);
  const [clubeId, setClubeId] = useState(clubeInicial?.id ?? clubes[0]?.id ?? '');
  const [busca, setBusca] = useState('');
  const [lugar, setLugar] = useState<SugestaoLugar | null>(null);
  const [dia, setDia] = useState(paraInputData(amanha));
  const [hora, setHora] = useState('20:00');
  const [titulo, setTitulo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const sugestoes = useMemo(() => sugerirLugares(busca), [busca]);
  const clube = clubes.find((c) => c.id === clubeId) ?? clubeInicial;
  const quando = new Date(`${dia}T${hora || '00:00'}`).getTime();
  const nomeLugar = lugar?.nome ?? busca.trim();
  const dataValida = Number.isFinite(quando) && quando > Date.now();
  const podeCriar = !!clube && nomeLugar.length >= 2 && dataValida && !salvando;

  const handleCriar = async () => {
    if (!podeCriar || !clube) return;
    setSalvando(true);
    const evento = await criarEvento(participanteDe(currentUser), clube, {
      titulo,
      placeId: lugar?.placeId,
      placeName: nomeLugar,
      placeEndereco: lugar?.endereco,
      data: quando,
      observacao,
    });
    onCriado(evento);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
        <button type="button" onClick={onClose} className="text-[15px] text-muted font-medium cursor-pointer">
          Cancelar
        </button>
        <span className="font-semibold text-[15px] text-ink">Novo evento</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 space-y-5">
        {!clubeInicial && clubes.length > 1 && (
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">Clube</span>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {clubes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClubeId(c.id)}
                  className={`h-9 shrink-0 rounded-full px-4 text-sm whitespace-nowrap transition-colors cursor-pointer ${
                    c.id === clubeId ? 'bg-primary font-semibold text-white' : 'bg-s2 text-ink-2'
                  }`}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </div>
        )}
        {(clubeInicial || clubes.length === 1) && clube && (
          <p className="text-sm text-muted">
            Evento para os membros de <span className="font-semibold text-ink">{clube.nome}</span>
          </p>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Lugar</span>
          {lugar ? (
            <div className="flex items-center gap-3 rounded-xl bg-s1 p-3 ring-1 ring-line">
              <MapPin size={18} strokeWidth={2} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">{lugar.nome}</span>
                {lugar.endereco && <span className="block truncate text-[12px] text-muted">{lugar.endereco}</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  setLugar(null);
                  setBusca('');
                }}
                aria-label="Trocar lugar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-s2 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome do restaurante, café ou bar"
                className={inputClass}
              />
              {sugestoes.length > 0 && (
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-s1 ring-1 ring-line">
                  {sugestoes.map((s) => (
                    <li key={s.placeId ?? s.nome}>
                      <button
                        type="button"
                        onClick={() => setLugar(s)}
                        className="w-full px-3 py-2.5 text-left hover:bg-s2 cursor-pointer"
                      >
                        <span className="block truncate text-[14px] text-ink">{s.nome}</span>
                        {s.endereco && <span className="block truncate text-[12px] text-muted">{s.endereco}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {busca.trim().length >= 2 && (
                <p className="mt-1.5 text-[12px] text-muted">Se não estiver na lista, o nome digitado é usado.</p>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Dia</span>
            <input type="date" value={dia} min={paraInputData(new Date())} onChange={(e) => setDia(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Horário</span>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputClass} />
          </label>
        </div>
        {!dataValida && dia && <p className="-mt-3 text-[12px] text-danger">Escolha um dia e horário a partir de agora.</p>}

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Título</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={60}
            placeholder="Ida em grupo"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Observação</span>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Ex.: reserva no nome da Ana"
            className={`${inputClass} h-auto py-3 resize-none`}
          />
        </label>
      </div>

      <div className="px-4 pt-2 pb-4 pb-safe shrink-0">
        <button
          type="button"
          onClick={handleCriar}
          disabled={!podeCriar}
          className="w-full h-12 bg-primary text-white text-[15px] font-semibold rounded-full disabled:opacity-40 transition-opacity cursor-pointer"
        >
          {salvando ? 'Marcando…' : 'Marcar evento'}
        </button>
      </div>
    </div>
  );
}
