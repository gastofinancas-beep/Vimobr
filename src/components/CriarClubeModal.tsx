import { useRef, useState, type ReactNode } from 'react';
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  ImagePlus,
  Lock,
  MapPin,
  Store,
  Tag,
  Trophy,
} from 'lucide-react';
import { PONTUACOES, comprimirFotoClube, criarClube, editarClube, infoPontuacao } from '../lib/clubes';
import type { Clube, PontuacaoClube, UserProfile } from '../types';
import { Mascote } from './Mascote';
import { inputClass } from './ui';

export const TAGS_CLUBE = [
  'Cafés',
  'Padarias',
  'Bares',
  'Restaurantes',
  'Pizza',
  'Hambúrguer',
  'Japonês',
  'Doces',
  'Brunch',
  'Vinhos',
  'Vegano',
  'Happy hour',
];
const MAX_TAGS = 3;

const ICONE_PONTUACAO: Record<PontuacaoClube, typeof Trophy> = {
  idas: Trophy,
  lugares: Store,
  dias: CalendarCheck,
};

type Folha = 'local' | 'privacidade' | 'pontuacao' | 'tags' | null;

/** Criar ou editar (quando recebe `clube`) um clube, no formato de ajustes em lista. */
export default function CriarClubeModal({
  currentUser,
  clube,
  onClose,
  onCriado,
}: {
  currentUser: UserProfile;
  clube?: Clube;
  onClose: () => void;
  onCriado: (clube: Clube) => void;
}) {
  const editando = !!clube;
  const [nome, setNome] = useState(clube?.nome ?? '');
  const [descricao, setDescricao] = useState(clube?.descricao ?? '');
  const [cidade, setCidade] = useState(clube ? clube.cidade ?? '' : currentUser.homeCityName ?? '');
  const [privado, setPrivado] = useState(!!clube?.privado);
  const [pontuacao, setPontuacao] = useState<PontuacaoClube>(clube?.pontuacao ?? 'idas');
  const [tags, setTags] = useState<string[]>(clube?.tags ?? []);
  const [foto, setFoto] = useState<string | undefined>(clube?.foto);
  const [erroFoto, setErroFoto] = useState('');
  const [folha, setFolha] = useState<Folha>(null);
  const [salvando, setSalvando] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const podeSalvar = nome.trim().length >= 3 && !salvando;

  const escolherFoto = async (arquivo?: File) => {
    if (!arquivo) return;
    setErroFoto('');
    try {
      setFoto(await comprimirFotoClube(arquivo));
    } catch {
      setErroFoto('Não foi possível usar essa imagem. Tente outra.');
    }
  };

  const handleSalvar = async () => {
    if (!podeSalvar) return;
    setSalvando(true);
    const dados = { nome, descricao, cidade, privado, foto, pontuacao, tags };
    const salvo = clube
      ? await editarClube(clube, dados)
      : await criarClube(
          {
            uid: currentUser.uid,
            name: currentUser.displayName,
            handle: currentUser.handle,
            photo: currentUser.photoURL ?? '',
          },
          dados,
        );
    onCriado(salvo);
  };

  const pont = infoPontuacao(pontuacao);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <input
        ref={inputFotoRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          escolherFoto(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <header className="grid grid-cols-[44px_1fr_44px] items-center px-4 pt-4 pb-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink ring-1 ring-line hover:bg-s2 cursor-pointer"
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="text-center font-display text-[18px] font-bold text-ink">{editando ? 'Editar clube' : 'Criar clube'}</h1>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={!podeSalvar}
          aria-label={editando ? 'Salvar clube' : 'Criar clube'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white transition-colors disabled:bg-transparent disabled:text-muted disabled:ring-1 disabled:ring-line cursor-pointer"
        >
          <Check size={20} strokeWidth={2.4} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto mt-4 mb-6 w-fit">
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            aria-label={foto ? 'Trocar foto do clube' : 'Adicionar foto do clube'}
            className="relative flex h-40 w-40 items-center justify-center rounded-[28px] bg-s1 ring-1 ring-line cursor-pointer"
          >
            {foto ? (
              <img src={foto} alt="" className="h-full w-full rounded-[28px] object-cover" />
            ) : (
              <Mascote reacao="confiante" tamanho={96} />
            )}
            <span className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-bg ring-4 ring-bg">
              <ImagePlus size={18} strokeWidth={2} />
            </span>
          </button>
          {erroFoto && <p className="mt-3 text-center text-[12px] text-danger">{erroFoto}</p>}
        </div>

        <input
          autoFocus={!editando}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={40}
          aria-label="Nome do clube"
          placeholder="Ex.: Cafés do Centro"
          className="h-14 w-full rounded-2xl bg-s1 px-4 text-[17px] font-semibold text-ink ring-1 ring-line placeholder:font-medium placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <Grupo className="mt-3">
          <Linha Icon={MapPin} titulo={cidade.trim() || 'Adicionar localização'} onClick={() => setFolha('local')} />
          <label className="flex items-start gap-3.5 px-4 py-3.5">
            <FileText size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 text-ink-2" />
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Adicionar descrição"
              className="min-h-[44px] w-full resize-none bg-transparent text-[15px] text-ink placeholder:text-muted focus:outline-none"
            />
          </label>
        </Grupo>

        <h2 className="mt-7 mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Opções</h2>
        <Grupo>
          <Linha
            Icon={privado ? Lock : Globe}
            titulo="Privacidade"
            valor={privado ? 'Privado' : 'Público'}
            onClick={() => setFolha('privacidade')}
          />
          <Linha Icon={Trophy} titulo="Sistema de pontuação" valor={pont.titulo} onClick={() => setFolha('pontuacao')} />
          <Linha
            Icon={Tag}
            titulo="Tags do clube"
            valor={tags.length ? tags.join(', ') : 'Opcional'}
            onClick={() => setFolha('tags')}
          />
        </Grupo>
      </div>

      {folha === 'local' && (
        <FolhaOpcoes titulo="Localização" onFechar={() => setFolha(null)}>
          <input
            autoFocus
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setFolha(null)}
            maxLength={40}
            placeholder="Cidade ou bairro do clube"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setFolha(null)}
            className="mt-4 h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-bg cursor-pointer"
          >
            Pronto
          </button>
        </FolhaOpcoes>
      )}

      {folha === 'privacidade' && (
        <FolhaOpcoes titulo="Privacidade" onFechar={() => setFolha(null)}>
          <div className="space-y-3">
            {[
              { v: false, Icon: Globe, titulo: 'Público', texto: 'Qualquer pessoa encontra o clube e entra' },
              { v: true, Icon: Lock, titulo: 'Privado', texto: 'Só entra quem recebe o código de convite' },
            ].map((o) => (
              <CartaoOpcao
                key={o.titulo}
                Icon={o.Icon}
                titulo={o.titulo}
                texto={o.texto}
                ativo={privado === o.v}
                onClick={() => {
                  setPrivado(o.v);
                  setFolha(null);
                }}
              />
            ))}
          </div>
        </FolhaOpcoes>
      )}

      {folha === 'pontuacao' && (
        <FolhaOpcoes titulo="Sistema de pontuação" onFechar={() => setFolha(null)}>
          <div className="space-y-3">
            {PONTUACOES.map((o) => (
              <CartaoOpcao
                key={o.valor}
                Icon={ICONE_PONTUACAO[o.valor]}
                titulo={o.titulo}
                texto={o.descricao}
                ativo={pontuacao === o.valor}
                onClick={() => {
                  setPontuacao(o.valor);
                  setFolha(null);
                }}
              />
            ))}
          </div>
        </FolhaOpcoes>
      )}

      {folha === 'tags' && (
        <FolhaOpcoes titulo="Tags do clube" onFechar={() => setFolha(null)}>
          <p className="-mt-2 mb-4 text-[13px] text-muted">Escolha até {MAX_TAGS}. Ajudam a achar o clube na busca.</p>
          <div className="flex flex-wrap gap-2">
            {TAGS_CLUBE.map((t) => {
              const ativa = tags.includes(t);
              const bloqueada = !ativa && tags.length >= MAX_TAGS;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={bloqueada}
                  aria-pressed={ativa}
                  onClick={() => setTags((prev) => (ativa ? prev.filter((x) => x !== t) : [...prev, t]))}
                  className={`h-9 rounded-full px-4 text-[14px] transition-colors cursor-pointer disabled:opacity-40 ${
                    ativa ? 'bg-ink font-semibold text-bg' : 'bg-s1 text-ink-2 ring-1 ring-line'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setFolha(null)}
            className="mt-5 h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-bg cursor-pointer"
          >
            Pronto
          </button>
        </FolhaOpcoes>
      )}
    </div>
  );
}

function Grupo({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-line overflow-hidden rounded-2xl bg-s1 ring-1 ring-line ${className}`}>{children}</div>;
}

function Linha({
  Icon,
  titulo,
  valor,
  onClick,
}: {
  Icon: typeof Trophy;
  titulo: string;
  valor?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-s2 transition-colors cursor-pointer">
      <Icon size={20} strokeWidth={1.8} className="shrink-0 text-ink-2" />
      <span className={`text-[15px] text-ink ${valor ? 'shrink-0' : 'min-w-0 flex-1 truncate'}`}>{titulo}</span>
      {valor && <span className="min-w-0 flex-1 truncate text-right text-[14px] text-muted">{valor}</span>}
      <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-muted" />
    </button>
  );
}

function CartaoOpcao({
  Icon,
  titulo,
  texto,
  ativo,
  onClick,
}: {
  Icon: typeof Trophy;
  titulo: string;
  texto: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex w-full items-center gap-4 rounded-2xl bg-bg p-4 text-left transition-shadow cursor-pointer ${
        ativo ? 'ring-2 ring-ink' : 'ring-1 ring-line'
      }`}
    >
      <Icon size={22} strokeWidth={1.8} className="shrink-0 text-ink" />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-ink">{titulo}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{texto}</span>
      </span>
      {ativo && <CheckCircle2 size={22} strokeWidth={1.8} className="shrink-0 text-ink" />}
    </button>
  );
}

function FolhaOpcoes({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onFechar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="fixed bottom-0 left-0 right-0 z-[70] mx-auto max-w-2xl rounded-t-[28px] bg-bg px-4 pt-3 pb-8 pb-safe"
      >
        <div className="mb-4 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>
        <h2 className="mb-4 px-1 font-display text-[20px] font-bold text-ink">{titulo}</h2>
        {children}
      </div>
    </>
  );
}

/** Escudo do clube: a foto escolhida ou as iniciais do nome sobre o azul da marca. */
export function EscudoClube({
  nome,
  foto,
  tamanho = 48,
  className = '',
}: {
  nome: string;
  foto?: string;
  tamanho?: number;
  className?: string;
}) {
  const raio = Math.round(tamanho * 0.24);
  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        aria-hidden="true"
        className={`shrink-0 object-cover ring-1 ring-line ${className}`}
        style={{ width: tamanho, height: tamanho, borderRadius: raio }}
      />
    );
  }
  const iniciais =
    nome
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') ||
    nome.trim().charAt(0).toUpperCase() ||
    'C';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-primary font-display font-extrabold text-white ${className}`}
      style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.36), borderRadius: raio }}
      aria-hidden="true"
    >
      {iniciais}
    </span>
  );
}
