import { useMemo, useRef, useState } from 'react';
import { X, Camera, Image, Globe, Lock, Users, ChevronDown, MapPin, Search, Shield, Star } from 'lucide-react';
import { criarPost, type Visibilidade } from '../lib/posts';
import { meusClubesLocais } from '../lib/clubes';
import { sugerirLugares, type SugestaoLugar } from '../lib/eventos';
import { reviewsLocaisDoUsuario } from '../lib/reviews';
import type { Clube, Review, UserProfile } from '../types';
import { Avatar, inputClass } from './ui';

const OPCOES_VISIBILIDADE: { value: Exclude<Visibilidade, 'clube'>; label: string; descricao: string; Icon: typeof Globe }[] = [
  { value: 'publico', label: 'Público', descricao: 'Visível para todos', Icon: Globe },
  { value: 'amigos', label: 'Melhores amigos', descricao: 'Só quem você segue de volta', Icon: Users },
  { value: 'privado', label: 'Só eu', descricao: 'Somente você pode ver', Icon: Lock },
];

interface CriarPostModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onPublicado: () => void;
  /** Abre já publicando só para este clube. */
  clubeInicial?: Clube;
}

export default function CriarPostModal({ currentUser, onClose, onPublicado, clubeInicial }: CriarPostModalProps) {
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [visibilidade, setVisibilidade] = useState<Visibilidade>(clubeInicial ? 'clube' : 'publico');
  const [clubeId, setClubeId] = useState<string | null>(clubeInicial?.id ?? null);
  const meusClubes = useMemo(() => {
    const lista = meusClubesLocais(currentUser.uid);
    return clubeInicial && !lista.some((c) => c.id === clubeInicial.id) ? [clubeInicial, ...lista] : lista;
  }, [currentUser.uid, clubeInicial]);
  const clubeSelecionado = meusClubes.find((c) => c.id === clubeId) ?? null;
  const [mostrarVisibilidade, setMostrarVisibilidade] = useState(false);
  const [lugar, setLugar] = useState<(SugestaoLugar & { cidade?: string }) | null>(null);
  const [mostrarLocal, setMostrarLocal] = useState(false);
  const minhasIdas = useMemo(() => reviewsLocaisDoUsuario(currentUser.uid), [currentUser.uid]);
  const temAvaliacao = !!lugar?.placeId && minhasIdas.some((r) => r.placeId === lugar.placeId);
  const [publicando, setPublicando] = useState(false);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputCameraRef = useRef<HTMLInputElement>(null);

  const podePubilcar = texto.trim().length > 0 || fotos.length > 0;
  const MAX_FOTOS = 4;

  const opcaoAtual =
    visibilidade === 'clube' && clubeSelecionado
      ? { label: clubeSelecionado.nome, Icon: Shield }
      : OPCOES_VISIBILIDADE.find((o) => o.value === visibilidade) ?? OPCOES_VISIBILIDADE[0];

  const adicionarFotos = (arquivos: FileList | null) => {
    if (!arquivos) return;
    const novos = Array.from(arquivos).slice(0, MAX_FOTOS - fotos.length);
    if (novos.length === 0) return;
    setFotos((prev) => [...prev, ...novos]);
    setPreviews((prev) => [...prev, ...novos.map((f) => URL.createObjectURL(f))]);
  };

  const removerFoto = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setFotos((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePublicar = async () => {
    if (!podePubilcar || publicando) return;
    setPublicando(true);
    try {
      await criarPost(
        {
          uid: currentUser.uid,
          name: currentUser.displayName,
          handle: currentUser.handle,
          photo: currentUser.photoURL,
        },
        {
          texto: texto.trim(),
          fotos,
          visibilidade,
          clube:
            visibilidade === 'clube' && clubeSelecionado
              ? { id: clubeSelecionado.id, nome: clubeSelecionado.nome }
              : undefined,
          placeId: lugar?.placeId,
          placeName: lugar?.nome,
          cityName: lugar?.cidade,
        },
      );
    } catch {
      // salvo localmente
    } finally {
      setPublicando(false);
      onPublicado();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        {/* inputs ocultos */}
        <input ref={inputGaleriaRef} type="file" accept="image/*" multiple className="sr-only"
          onChange={(e) => adicionarFotos(e.target.files)} />
        <input ref={inputCameraRef} type="file" accept="image/*" capture="environment" className="sr-only"
          onChange={(e) => adicionarFotos(e.target.files)} />

        {/* Cabeçalho */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
          <button type="button" onClick={onClose} className="text-[15px] text-muted font-medium cursor-pointer">
            Cancelar
          </button>
          <span className="font-semibold text-[15px] text-ink">Nova publicação</span>
          <div className="w-16" />
        </header>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto">
          {/* Autor */}
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
            <Avatar src={currentUser.photoURL} name={currentUser.displayName} size={38} />
            <span className="font-semibold text-[14px] text-ink">{currentUser.handle || currentUser.displayName}</span>
          </div>

          {/* Texto */}
          <div className="px-4 pb-3">
            <textarea
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que você comeu hoje?"
              rows={3}
              maxLength={500}
              className="w-full bg-transparent text-[17px] text-ink placeholder:text-muted resize-none focus:outline-none leading-relaxed"
            />
            {texto.length > 400 && (
              <p className={`text-right text-[12px] ${texto.length >= 500 ? 'text-red-500' : 'text-muted'}`}>
                {500 - texto.length}
              </p>
            )}
          </div>

          {/* Local marcado */}
          {lugar && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-s1 px-3 py-2.5 ring-1 ring-line">
                <MapPin size={17} strokeWidth={2} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{lugar.nome}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {temAvaliacao
                      ? 'Sua avaliação deste lugar vai aparecer no post'
                      : lugar.endereco ?? lugar.cidade ?? 'Local do post'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setLugar(null)}
                  aria-label="Remover local"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-s2 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Grid de fotos */}
          {previews.length > 0 && (
            <div className="px-4 pb-4 grid grid-cols-2 gap-1.5">
              {previews.map((src, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden bg-s2 aspect-square">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removerFoto(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center cursor-pointer"
                    aria-label="Remover foto"
                  >
                    <X size={13} strokeWidth={2.5} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toolbar de mídia */}
        <div className="border-t border-line flex items-center px-3 py-2 gap-1 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => inputGaleriaRef.current?.click()}
              disabled={fotos.length >= MAX_FOTOS}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted disabled:opacity-30"
              aria-label="Galeria"
            >
              <Image size={22} strokeWidth={1.8} />
            </button>
            {fotos.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 pointer-events-none">
                {fotos.length}/{MAX_FOTOS}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => inputCameraRef.current?.click()}
            disabled={fotos.length >= MAX_FOTOS}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-s2 transition-colors cursor-pointer text-muted disabled:opacity-30"
            aria-label="Câmera"
          >
            <Camera size={22} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => setMostrarLocal(true)}
            className={`h-10 flex items-center gap-1.5 rounded-full px-2.5 hover:bg-s2 transition-colors cursor-pointer ${lugar ? 'text-primary' : 'text-muted'}`}
            aria-label="Adicionar local"
          >
            <MapPin size={22} strokeWidth={1.8} />
            <span className="text-[13px] font-medium">{lugar ? 'Trocar local' : 'Local'}</span>
          </button>
        </div>

        {/* Rodapé: visibilidade + publicar */}
        <div className="flex items-center gap-2 px-4 pb-safe pb-4 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setMostrarVisibilidade(true)}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-full border border-line text-[14px] font-medium text-ink cursor-pointer hover:bg-s2 transition-colors"
          >
            <opcaoAtual.Icon size={16} strokeWidth={2} />
            <span>{opcaoAtual.label}</span>
            <ChevronDown size={15} strokeWidth={2} className="text-muted" />
          </button>
          <button
            type="button"
            onClick={handlePublicar}
            disabled={!podePubilcar || publicando}
            className="flex-shrink-0 h-11 px-6 bg-primary text-white text-[14px] font-semibold rounded-full disabled:opacity-40 transition-opacity cursor-pointer"
          >
            {publicando ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </div>

      {mostrarLocal && (
        <SeletorLocal
          minhasIdas={minhasIdas}
          onFechar={() => setMostrarLocal(false)}
          onEscolher={(l) => {
            setLugar(l);
            setMostrarLocal(false);
          }}
        />
      )}

      {/* Sheet de visibilidade */}
      {mostrarVisibilidade && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={() => setMostrarVisibilidade(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-bg rounded-t-2xl pb-safe">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-line" />
            </div>
            <h2 className="font-semibold text-[15px] text-ink px-5 pb-3 pt-1">Quem pode ver?</h2>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-line">
              {OPCOES_VISIBILIDADE.map(({ value, label, descricao, Icon }) => (
                <OpcaoVisibilidade
                  key={value}
                  Icon={Icon}
                  label={label}
                  descricao={descricao}
                  destaque={value === 'publico'}
                  ativo={visibilidade === value}
                  onClick={() => { setVisibilidade(value); setClubeId(null); setMostrarVisibilidade(false); }}
                />
              ))}
              {meusClubes.map((c) => (
                <OpcaoVisibilidade
                  key={c.id}
                  Icon={Shield}
                  label={c.nome}
                  descricao="Só membros do clube, no feed do clube"
                  ativo={visibilidade === 'clube' && clubeId === c.id}
                  onClick={() => { setVisibilidade('clube'); setClubeId(c.id); setMostrarVisibilidade(false); }}
                />
              ))}
            </div>
            <div className="h-4" />
          </div>
        </>
      )}
    </>
  );
}

function OpcaoVisibilidade({
  Icon,
  label,
  descricao,
  ativo,
  destaque = false,
  onClick,
}: {
  Icon: typeof Globe;
  label: string;
  descricao: string;
  ativo: boolean;
  destaque?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-s2 transition-colors text-left"
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          destaque ? 'bg-primary/10 text-primary' : 'bg-s2 text-ink'
        }`}
      >
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px] text-ink truncate">{label}</p>
        <p className="text-[12px] text-muted mt-0.5">{descricao}</p>
      </div>
      <span
        className={`w-5 h-5 rounded-full shrink-0 ${ativo ? 'border-[6px] border-primary' : 'border-2 border-line'}`}
        aria-hidden="true"
      />
    </button>
  );
}

/** Escolha do local do post: suas idas primeiro, depois lugares conhecidos pelo app (sem API paga). */
function SeletorLocal({
  minhasIdas,
  onFechar,
  onEscolher,
}: {
  minhasIdas: Review[];
  onFechar: () => void;
  onEscolher: (l: SugestaoLugar & { cidade?: string }) => void;
}) {
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();

  const idas = useMemo(() => {
    const vistos = new Set<string>();
    return minhasIdas
      .filter((r) => !vistos.has(r.placeId) && vistos.add(r.placeId))
      .filter((r) => !termo || r.placeName.toLowerCase().includes(termo))
      .slice(0, 6);
  }, [minhasIdas, termo]);
  const outros = useMemo(() => {
    const avaliados = new Set(minhasIdas.map((r) => r.placeId));
    return sugerirLugares(busca, 12).filter((l) => !l.placeId || !avaliados.has(l.placeId)).slice(0, 8);
  }, [busca, minhasIdas]);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onFechar} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Adicionar local" className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[85vh] flex-col rounded-t-2xl bg-bg pb-safe">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>
        <h2 className="px-5 pt-1 pb-3 text-[15px] font-semibold text-ink shrink-0">Onde foi?</h2>
        <div className="relative px-5 pb-2 shrink-0">
          <Search size={16} className="pointer-events-none absolute left-9 top-[22px] -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Restaurante, café ou bar"
            className={`${inputClass} h-11 pl-10`}
          />
        </div>
        <div className="flex-1 overflow-y-auto pb-4">
          {idas.length > 0 && (
            <>
              <p className="px-5 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Suas idas</p>
              {idas.map((r) => (
                <ItemLocal
                  key={r.placeId}
                  titulo={r.placeName}
                  subtitulo={r.cityName ? `${r.cityName} · com avaliação` : 'Com avaliação'}
                  avaliado
                  onClick={() => onEscolher({ placeId: r.placeId, nome: r.placeName, cidade: r.cityName || undefined })}
                />
              ))}
            </>
          )}
          {outros.length > 0 && (
            <>
              <p className="px-5 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">Lugares</p>
              {outros.map((l) => (
                <ItemLocal key={l.placeId ?? l.nome} titulo={l.nome} subtitulo={l.endereco} onClick={() => onEscolher(l)} />
              ))}
            </>
          )}
          {termo.length >= 2 && (
            <ItemLocal titulo={`Usar "${busca.trim()}"`} subtitulo="Sem ligação com um lugar do app" onClick={() => onEscolher({ nome: busca.trim() })} />
          )}
          {idas.length === 0 && outros.length === 0 && termo.length < 2 && (
            <p className="px-5 py-4 text-sm text-muted">Digite o nome do lugar.</p>
          )}
        </div>
      </div>
    </>
  );
}

function ItemLocal({ titulo, subtitulo, avaliado = false, onClick }: { titulo: string; subtitulo?: string; avaliado?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-s2 transition-colors cursor-pointer">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${avaliado ? 'bg-primary/10 text-primary' : 'bg-s2 text-ink-2'}`}>
        {avaliado ? <Star size={16} strokeWidth={2} /> : <MapPin size={16} strokeWidth={2} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{titulo}</span>
        {subtitulo && <span className="block truncate text-[12px] text-muted">{subtitulo}</span>}
      </span>
    </button>
  );
}
