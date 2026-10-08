import React, { useMemo, useState } from 'react';
import {
  X,
  ArrowLeft,
  Search,
  Camera,
  Trash2,
  MapPin,
  Check,
  Calendar,
  Sparkles,
  Users,
  Utensils,
  AlertCircle,
} from 'lucide-react';
import StarRating from '../components/StarRating';
import { autocomplete, getPlace, photoUrl, SAMPLE_PLACES } from '../lib/places';
import { salvarAvaliacao } from '../lib/reviews';
import { buscarUsuariosParaMarcar } from '../lib/companions';
import { obterCriteriosParaLugar } from '../lib/criteriosEstabelecimento';
import type {
  Place,
  PrecoPercepcao,
  Ratings,
  UserProfile,
  VoltariaOpcao,
} from '../types';

interface AvaliarModalProps {
  lugarInicial?: Place | null;
  currentUser: UserProfile;
  onClose: () => void;
  onSucesso: (reviewId: string) => void;
}

type Foto = { file: File; url: string };

const hojeISO = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
};

function FotoPicker({
  titulo,
  dica,
  max,
  fotos,
  onChange,
}: {
  titulo: string;
  dica: string;
  max: number;
  fotos: Foto[];
  onChange: (f: Foto[]) => void;
}) {
  const adicionar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novas = Array.from(e.target.files ?? [])
      .slice(0, max - fotos.length)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    onChange([...fotos, ...novas]);
    e.target.value = '';
  };

  const remover = (i: number) => {
    URL.revokeObjectURL(fotos[i].url);
    onChange(fotos.filter((_, idx) => idx !== i));
  };

  return (
    <div className="bg-[var(--s2)] rounded-2xl p-4 space-y-3 border border-[var(--line)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--ink)]">{titulo}</div>
          <div className="text-xs text-[var(--muted)]">{dica} (até {max})</div>
        </div>
        <span className="text-xs font-bold text-[var(--muted)]">
          {fotos.length}/{max}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {fotos.map((f, i) => (
          <div
            key={i}
            className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-[var(--line)] group"
          >
            <img src={f.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remover(i)}
              aria-label="Remover foto"
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-rose-400 cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {fotos.length < max && (
          <label className="w-16 h-16 rounded-xl border border-dashed border-[var(--line)] hover:border-[var(--primary)] flex flex-col items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] cursor-pointer transition">
            <Camera size={18} />
            <span className="text-[11px] mt-1 font-semibold">+ foto</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={adicionar}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default function AvaliarModal({
  lugarInicial = null,
  currentUser,
  onClose,
  onSucesso,
}: AvaliarModalProps) {
  // Estado dos dados da avaliação
  const [lugar, setLugar] = useState<Place | null>(lugarInicial);
  const [buscaLugar, setBuscaLugar] = useState('');
  const [sugestoesLugar, setSugestoesLugar] = useState<Place[]>([]);
  const [buscandoLugar, setBuscandoLugar] = useState(false);

  const [dataVisita, setDataVisita] = useState(hojeISO());
  const [notasCriterios, setNotasCriterios] = useState<Record<string, number>>({});
  const [voltaria, setVoltaria] = useState<VoltariaOpcao | ''>('');
  const [preco, setPreco] = useState<PrecoPercepcao | ''>('');
  const [pratoDestaque, setPratoDestaque] = useState('');
  const [comentario, setComentario] = useState('');

  const [fotosPratos, setFotosPratos] = useState<Foto[]>([]);
  const [fotosMomento, setFotosMomento] = useState<Foto[]>([]);
  const [fotosCardapio, setFotosCardapio] = useState<Foto[]>([]);

  const [buscaAmigo, setBuscaAmigo] = useState('');
  const [amigos, setAmigos] = useState<
    Array<{ uid: string; name: string; handle: string; photo: string }>
  >([]);

  const [salvando, setSalvando] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Critérios específicos do estabelecimento
  const criteriosObj = useMemo(() => obterCriteriosParaLugar(lugar), [lugar]);
  const criterios = criteriosObj.criterios;

  // Definição dinâmica de passos
  type PassoDef =
    | { tipo: 'lugar'; titulo: string; opcional: false }
    | { tipo: 'data'; titulo: string; opcional: false }
    | { tipo: 'criterio'; criterioIndex: number; titulo: string; opcional: true }
    | { tipo: 'voltaria_preco'; titulo: string; opcional: true }
    | { tipo: 'destaque'; titulo: string; opcional: true }
    | { tipo: 'comentario'; titulo: string; opcional: true }
    | { tipo: 'fotos'; titulo: string; opcional: true }
    | { tipo: 'amigos'; titulo: string; opcional: true }
    | { tipo: 'resumo'; titulo: string; opcional: false };

  const passos = useMemo<PassoDef[]>(() => {
    const list: PassoDef[] = [
      { tipo: 'lugar', titulo: 'Lugar', opcional: false },
      { tipo: 'data', titulo: 'Data', opcional: false },
    ];

    criterios.forEach((c, idx) => {
      list.push({
        tipo: 'criterio',
        criterioIndex: idx,
        titulo: c.label,
        opcional: true,
      });
    });

    list.push(
      { tipo: 'voltaria_preco', titulo: 'Voltaria & Preço', opcional: true },
      { tipo: 'destaque', titulo: 'Prato destaque', opcional: true },
      { tipo: 'comentario', titulo: 'Comentário', opcional: true },
      { tipo: 'fotos', titulo: 'Fotos', opcional: true },
      { tipo: 'amigos', titulo: 'Amigos', opcional: true },
      { tipo: 'resumo', titulo: 'Resumo', opcional: false }
    );

    return list;
  }, [criterios]);

  const [passoIndex, setPassoIndex] = useState(0);
  const passoAtual = passos[passoIndex] || passos[0];
  const totalPassos = passos.length;

  // Cálculo da nota geral: média aritmética das notas dadas (> 0), arredondada à meia estrela
  const notasDadas = useMemo(() => {
    return Object.entries(notasCriterios).filter(([_, v]) => typeof v === 'number' && v > 0);
  }, [notasCriterios]);

  const notaGeralCalculada = useMemo(() => {
    if (notasDadas.length === 0) return 0;
    const soma = notasDadas.reduce((acc, [_, v]) => acc + v, 0);
    const media = soma / notasDadas.length;
    return Math.round(media * 2) / 2;
  }, [notasDadas]);

  // Autocomplete de lugar
  const lidarBuscaLugar = async (q: string) => {
    setBuscaLugar(q);
    if (q.trim().length < 2) {
      setSugestoesLugar([]);
      return;
    }
    setBuscandoLugar(true);
    try {
      const res = await autocomplete(q);
      setSugestoesLugar(res);
    } catch {
      const filtrados = SAMPLE_PLACES.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase())
      );
      setSugestoesLugar(filtrados);
    } finally {
      setBuscandoLugar(false);
    }
  };

  const selecionarLugar = async (p: Place) => {
    try {
      const full = await getPlace(p.id);
      setLugar(full || p);
    } catch {
      setLugar(p);
    }
    setBuscaLugar('');
    setSugestoesLugar([]);
    setErroValidacao(null);
  };

  // Autocomplete de amigos
  const amigosSugeridos = useMemo(() => {
    if (buscaAmigo.trim().length === 0) return [];
    return buscarUsuariosParaMarcar(buscaAmigo, currentUser.uid).filter(
      (u) => !amigos.some((a) => a.uid === u.uid)
    );
  }, [buscaAmigo, currentUser.uid, amigos]);

  // Validação ao avançar de passo
  const handleAvancar = () => {
    setErroValidacao(null);

    // 1. Passo Lugar
    if (passoAtual.tipo === 'lugar') {
      if (!lugar) {
        setErroValidacao('Selecione um restaurante ou estabelecimento para continuar.');
        return;
      }
    }

    // 2. Passo Data
    if (passoAtual.tipo === 'data') {
      if (!dataVisita) {
        setErroValidacao('Informe a data da sua visita.');
        return;
      }
    }

    // 3. Critérios: ao sair do último critério, exigir pelo menos uma nota > 0
    if (passoAtual.tipo === 'criterio') {
      const isUltimoCriterio = passoAtual.criterioIndex === criterios.length - 1;
      if (isUltimoCriterio) {
        const temPeloMenosUma = Object.values(notasCriterios).some((v) => v > 0);
        if (!temPeloMenosUma) {
          setErroValidacao('Dê nota a pelo menos um item para continuar.');
          return;
        }
      }
    }

    if (passoIndex < totalPassos - 1) {
      setPassoIndex((p) => p + 1);
    }
  };

  const handlePular = () => {
    setErroValidacao(null);

    // Se estiver no último critério, também exige pelo menos uma nota dada no total
    if (passoAtual.tipo === 'criterio') {
      const isUltimoCriterio = passoAtual.criterioIndex === criterios.length - 1;
      if (isUltimoCriterio) {
        const temPeloMenosUma = Object.values(notasCriterios).some((v) => v > 0);
        if (!temPeloMenosUma) {
          setErroValidacao('Dê nota a pelo menos um item para continuar.');
          return;
        }
      }
    }

    if (passoIndex < totalPassos - 1) {
      setPassoIndex((p) => p + 1);
    }
  };

  const handleVoltar = () => {
    setErroValidacao(null);
    if (passoIndex > 0) {
      setPassoIndex((p) => p - 1);
    }
  };

  // Finalizar e publicar ida
  const handlePublicar = async () => {
    if (!lugar) return;
    setSalvando(true);
    setErroValidacao(null);

    try {
      const revId = await salvarAvaliacao({
        autor: {
          uid: currentUser.uid,
          name: currentUser.displayName,
          handle: currentUser.handle,
          photo:
            currentUser.photoURL ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        },
        place: lugar,
        ratings: notasCriterios as Ratings,
        precoPercepcao: preco || undefined,
        voltaria: voltaria || undefined,
        pratoDestaque: pratoDestaque.trim() || undefined,
        text: comentario.trim(),
        visitedAt: new Date(dataVisita).getTime(),
        fotos: fotosPratos.map((f) => f.file),
        fotosPessoas: fotosMomento.map((f) => f.file),
        cardapio: fotosCardapio.map((f) => f.file),
        companions: amigos.map((a) => ({
          uid: a.uid,
          name: a.name,
          handle: a.handle,
          photo: a.photo,
          status: 'aprovado_presenca',
        })),
      });

      onSucesso(revId);
    } catch (err: any) {
      console.warn('Erro ao salvar avaliação:', err);
      setErroValidacao('Ocorreu um erro ao publicar sua ida. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Barra de progresso: ((passoAtual + 1) / total) * 100%, altura 3px, cor var(--star)
  const progressoPct = Math.round(((passoIndex + 1) / totalPassos) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--s1)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
        {/* Barra de progresso no topo */}
        <div className="w-full h-[3px] bg-[var(--s2)] relative">
          <div
            className="h-full bg-[var(--star)] transition-all duration-300"
            style={{ width: `${progressoPct}%` }}
          />
        </div>

        {/* Cabeçalho */}
        <header className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {passoIndex > 0 && (
              <button
                type="button"
                onClick={handleVoltar}
                aria-label="Voltar para o passo anterior"
                className="p-1 -ml-1 text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <span className="text-xs font-semibold text-[var(--muted)] truncate">
              Passo {passoIndex + 1} de {totalPassos} · {passoAtual.titulo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {passoAtual.opcional && (
              <button
                type="button"
                onClick={handlePular}
                className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] px-2 py-1 rounded-lg transition cursor-pointer min-h-11 flex items-center"
              >
                Pular
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal de avaliação"
              className="p-1 text-[var(--muted)] hover:text-[var(--ink)] transition cursor-pointer min-h-11 min-w-11 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Mensagem de Erro de Validação */}
        {erroValidacao && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium flex items-center gap-2 shrink-0">
            <AlertCircle size={15} className="shrink-0" />
            <span>{erroValidacao}</span>
          </div>
        )}

        {/* Conteúdo Dinâmico por Passo */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* =========================================================================
              PASSO 1: LUGAR
             ========================================================================= */}
          {passoAtual.tipo === 'lugar' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Onde você comeu?</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Escolha o restaurante, cafeteria, padaria ou bar visitado.
                </p>
              </div>

              {lugar ? (
                <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--s1)] shrink-0 border border-[var(--line)]">
                      {lugar.photoUrl || (lugar.photoName ? photoUrl(lugar.photoName) : undefined) ? (
                        <img
                          src={lugar.photoUrl || (lugar.photoName ? photoUrl(lugar.photoName) : '')}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
                          <MapPin size={20} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-[var(--ink)] truncate">
                        {lugar.name}
                      </h3>
                      <p className="text-xs text-[var(--muted)] truncate">
                        {lugar.address || lugar.bairro || 'São Paulo'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLugar(null)}
                    className="text-xs font-bold text-[var(--primary)] hover:underline shrink-0 px-2 py-1 cursor-pointer min-h-11 flex items-center"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-11 rounded-xl bg-[var(--s2)] border border-[var(--line)] px-3.5 flex items-center gap-2.5 focus-within:border-[var(--primary)] transition">
                    <Search size={16} className="text-[var(--muted)] shrink-0" />
                    <input
                      type="text"
                      value={buscaLugar}
                      onChange={(e) => lidarBuscaLugar(e.target.value)}
                      placeholder="Buscar por nome do restaurante..."
                      aria-label="Buscar lugar"
                      className="w-full bg-transparent text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none"
                    />
                  </div>

                  {buscandoLugar && (
                    <div className="text-xs text-[var(--muted)] text-center py-2">
                      Buscando estabelecimentos...
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {(sugestoesLugar.length > 0 ? sugestoesLugar : SAMPLE_PLACES.slice(0, 5)).map(
                      (p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selecionarLugar(p)}
                          className="w-full text-left p-2.5 rounded-xl bg-[var(--s2)] hover:bg-[var(--line)] transition flex items-center gap-3 cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-[var(--s1)] shrink-0">
                            {p.photoUrl || (p.photoName ? photoUrl(p.photoName) : undefined) ? (
                              <img
                                src={p.photoUrl || (p.photoName ? photoUrl(p.photoName) : '')}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
                                <Utensils size={14} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-[var(--ink)] truncate">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[var(--muted)] truncate">
                              {p.address || p.bairro}
                            </div>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              PASSO 2: DATA
             ========================================================================= */}
          {passoAtual.tipo === 'data' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Quando você foi?</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Informe o dia da sua visita gastronômica.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-3">
                <label className="block text-xs font-semibold text-[var(--muted)]">
                  Data da visita:
                </label>
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-[var(--star)] shrink-0" />
                  <input
                    type="date"
                    max={hojeISO()}
                    value={dataVisita}
                    onChange={(e) => setDataVisita(e.target.value)}
                    aria-label="Data da visita"
                    className="flex-1 h-11 px-3 rounded-xl bg-[var(--s1)] border border-[var(--line)] text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASSO 3: CADA CRITÉRIO (UMA TELA POR ITEM)
             ========================================================================= */}
          {passoAtual.tipo === 'criterio' && (
            <div className="space-y-5 text-center py-2">
              {/* Badge do tipoNome apenas no primeiro critério */}
              {passoAtual.criterioIndex === 0 && (
                <div className="flex justify-center">
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-xs">
                    {criteriosObj.tipoNome}
                  </span>
                </div>
              )}

              {/* Título e Dica do Critério */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-[var(--ink)]">
                  {criterios[passoAtual.criterioIndex]?.label}
                </h2>
                {criterios[passoAtual.criterioIndex]?.dica && (
                  <p className="text-xs sm:text-sm text-[var(--muted)] max-w-sm mx-auto">
                    {criterios[passoAtual.criterioIndex].dica}
                  </p>
                )}
              </div>

              {/* Meia-estrela grande em var(--star) */}
              <div className="py-4 flex flex-col items-center justify-center gap-3">
                <StarRating
                  value={notasCriterios[criterios[passoAtual.criterioIndex]?.key] || 0}
                  onChange={(v) => {
                    const key = criterios[passoAtual.criterioIndex]?.key;
                    if (key) {
                      setNotasCriterios((prev) => ({ ...prev, [key]: v }));
                      setErroValidacao(null);
                    }
                  }}
                  size={36}
                />

                <span className="text-lg font-black text-[var(--star)]">
                  {(
                    notasCriterios[criterios[passoAtual.criterioIndex]?.key] || 0
                  ) > 0
                    ? (
                        notasCriterios[criterios[passoAtual.criterioIndex]?.key]
                      ).toFixed(1).replace('.', ',')
                    : 'Toque para avaliar'}
                </span>
              </div>

              {/* Texto explicativo obrigatório */}
              <p className="text-xs text-[var(--muted)] italic">
                Sua nota geral será a média destas notas.
              </p>
            </div>
          )}

          {/* =========================================================================
              PASSO 4: VOLTARIA E PREÇO (MESMA TELA)
             ========================================================================= */}
          {passoAtual.tipo === 'voltaria_preco' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Voltaria e Preço</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Compartilhe sua percepção sobre retorno e custo-benefício.
                </p>
              </div>

              {/* Grupo 1: Voltaria */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--ink)]">
                  Você voltaria?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'com_certeza', label: 'Com certeza' },
                    { val: 'talvez', label: 'Talvez' },
                    { val: 'nao', label: 'Não' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setVoltaria(item.val as VoltariaOpcao)}
                      className={`min-h-11 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        voltaria === item.val
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--on-primary)] shadow-xs'
                          : 'bg-[var(--s2)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grupo 2: Preço */}
              <div className="space-y-2 pt-2 border-t border-[var(--line)]">
                <label className="block text-xs font-bold text-[var(--ink)]">
                  Como achou o preço?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'caro', label: 'Caro' },
                    { val: 'justo', label: 'Justo' },
                    { val: 'economico', label: 'Econômico' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setPreco(item.val as PrecoPercepcao)}
                      className={`min-h-11 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        preco === item.val
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--on-primary)] shadow-xs'
                          : 'bg-[var(--s2)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASSO 5: PRATO DESTAQUE
             ========================================================================= */}
          {passoAtual.tipo === 'destaque' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Prato destaque</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Qual prato, doce ou bebida foi o ponto alto da sua ida?
                </p>
              </div>

              <div className="space-y-1.5">
                <input
                  type="text"
                  maxLength={100}
                  value={pratoDestaque}
                  onChange={(e) => setPratoDestaque(e.target.value)}
                  placeholder="Ex: Pirarucu com emulsão de castanhas, Croissant clássico..."
                  aria-label="Prato destaque"
                  className="w-full h-12 px-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
                />
                <div className="text-right text-xs text-[var(--muted)]">
                  {pratoDestaque.length}/100
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASSO 6: COMENTÁRIO
             ========================================================================= */}
          {passoAtual.tipo === 'comentario' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Seu comentário</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Conte sobre a experiência, pratos marcantes, atendimento e atmosfera.
                </p>
              </div>

              <div className="space-y-1.5">
                <textarea
                  maxLength={2000}
                  rows={6}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Descreva detalhes da sua visita..."
                  aria-label="Comentário sobre o restaurante"
                  className="w-full p-4 rounded-xl bg-[var(--s2)] border border-[var(--line)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)] resize-none"
                />
                <div className="text-right text-xs text-[var(--muted)]">
                  {comentario.length}/2000
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              PASSO 7: FOTOS (3 FOTOPICKERS)
             ========================================================================= */}
          {passoAtual.tipo === 'fotos' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Fotos da visita</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Adicione fotos para registrar sua memória gastronômica.
                </p>
              </div>

              <FotoPicker
                titulo="Fotos dos Pratos & Bebidas"
                dica="Fotografe a comida"
                max={6}
                fotos={fotosPratos}
                onChange={setFotosPratos}
              />

              <FotoPicker
                titulo="Momento & Ambiente"
                dica="O salão, a mesa e o clima"
                max={6}
                fotos={fotosMomento}
                onChange={setFotosMomento}
              />

              <FotoPicker
                titulo="Cardápio ou Conta"
                dica="Preços e menu"
                max={3}
                fotos={fotosCardapio}
                onChange={setFotosCardapio}
              />
            </div>
          )}

          {/* =========================================================================
              PASSO 8: AMIGOS
             ========================================================================= */}
          {passoAtual.tipo === 'amigos' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Quem estava com você?</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Marque amigos que dividiram esta mesa com você (até 5).
                </p>
              </div>

              <div className="space-y-3">
                {/* Campo de busca */}
                <div className="h-11 rounded-xl bg-[var(--s2)] border border-[var(--line)] px-3.5 flex items-center gap-2.5 focus-within:border-[var(--primary)] transition">
                  <Search size={16} className="text-[var(--muted)] shrink-0" />
                  <input
                    type="text"
                    value={buscaAmigo}
                    onChange={(e) => setBuscaAmigo(e.target.value)}
                    placeholder="Buscar amigo por nome ou @..."
                    aria-label="Buscar amigos"
                    disabled={amigos.length >= 5}
                    className="w-full bg-transparent text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none"
                  />
                </div>

                {/* Chips dos amigos selecionados */}
                {amigos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {amigos.map((a) => (
                      <span
                        key={a.uid}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold"
                      >
                        <img
                          src={a.photo}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span>{a.name}</span>
                        <button
                          type="button"
                          onClick={() => setAmigos(amigos.filter((x) => x.uid !== a.uid))}
                          aria-label={`Remover ${a.name}`}
                          className="p-0.5 hover:opacity-70 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Sugestões de amigos */}
                {amigosSugeridos.length > 0 && amigos.length < 5 && (
                  <div className="space-y-1 pt-1">
                    {amigosSugeridos.slice(0, 4).map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => {
                          setAmigos([...amigos, u]);
                          setBuscaAmigo('');
                        }}
                        className="w-full text-left p-2 rounded-xl bg-[var(--s2)] hover:bg-[var(--line)] transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <img
                          src={u.photo}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[var(--ink)] truncate">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] truncate">
                            {u.handle}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              PASSO 9: RESUMO
             ========================================================================= */}
          {passoAtual.tipo === 'resumo' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[var(--ink)]">Resumo da sua ida</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Revise os detalhes antes de registrar no seu diário Vimo.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--s2)] border border-[var(--line)] space-y-3.5">
                {/* Nome do lugar */}
                <div>
                  <h3 className="text-lg font-black text-[var(--ink)]">{lugar?.name}</h3>
                  <p className="text-xs text-[var(--muted)]">
                    {lugar?.address || lugar?.bairro}
                  </p>
                </div>

                {/* Nota geral calculada em meia estrela com valor em var(--star) */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--s1)] border border-[var(--line)]">
                  <div className="text-3xl font-black text-[var(--star)]">
                    {notaGeralCalculada.toFixed(1).replace('.', ',')}
                  </div>
                  <div>
                    <StarRating value={notaGeralCalculada} size={20} />
                    <span className="text-xs text-[var(--muted)] block mt-0.5">
                      Nota geral (calculada pela média)
                    </span>
                  </div>
                </div>

                {/* Chips com cada nota de critério dada */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-[var(--muted)]">Critérios avaliados:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {notasDadas.map(([k, val]) => {
                      const crit = criterios.find((c) => c.key === k);
                      return (
                        <span
                          key={k}
                          className="px-2.5 py-1 rounded-lg bg-[var(--s1)] border border-[var(--line)] text-xs text-[var(--ink)] font-medium flex items-center gap-1"
                        >
                          <span>{crit?.label || k}:</span>
                          <strong className="text-[var(--star)]">
                            {val.toFixed(1).replace('.', ',')} ★
                          </strong>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Data + Amigos + Voltaria + Preço */}
                <div className="space-y-1 text-xs text-[var(--muted)] pt-2 border-t border-[var(--line)]">
                  <div>
                    Data:{' '}
                    <strong className="text-[var(--ink)]">
                      {new Date(dataVisita + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </strong>
                    {amigos.length > 0 && (
                      <span>
                        {' '}com{' '}
                        <strong className="text-[var(--ink)]">
                          {amigos.map((a) => a.name).join(', ')}
                        </strong>
                      </span>
                    )}
                  </div>

                  {voltaria && (
                    <div>
                      Voltaria:{' '}
                      <strong className="text-[var(--ink)]">
                        {voltaria === 'com_certeza'
                          ? 'Com certeza'
                          : voltaria === 'talvez'
                          ? 'Talvez'
                          : 'Não'}
                      </strong>
                    </div>
                  )}

                  {preco && (
                    <div>
                      Preço:{' '}
                      <strong className="text-[var(--ink)]">
                        {preco === 'caro' ? 'Caro' : preco === 'justo' ? 'Justo' : 'Econômico'}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Destaque & Comentário se houver */}
                {pratoDestaque && (
                  <div className="text-xs text-[var(--muted)]">
                    Prato destaque: <strong className="text-[var(--ink)]">{pratoDestaque}</strong>
                  </div>
                )}
                {comentario && (
                  <p className="text-xs text-[var(--ink)] italic bg-[var(--s1)] p-2.5 rounded-lg border border-[var(--line)]">
                    "{comentario}"
                  </p>
                )}

                {/* Contagem de fotos */}
                {(fotosPratos.length > 0 ||
                  fotosMomento.length > 0 ||
                  fotosCardapio.length > 0) && (
                  <div className="text-xs text-[var(--muted)]">
                    Fotos anexadas:{' '}
                    <strong className="text-[var(--ink)]">
                      {fotosPratos.length + fotosMomento.length + fotosCardapio.length} fotos
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botão de ação principal */}
        <footer className="p-4 border-t border-[var(--line)] shrink-0 bg-[var(--s1)]">
          {passoAtual.tipo === 'resumo' ? (
            <button
              type="button"
              disabled={salvando}
              onClick={handlePublicar}
              className="w-full min-h-11 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] font-bold text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {salvando ? (
                <span>Publicando ida...</span>
              ) : (
                <>
                  <Check size={18} strokeWidth={2.4} />
                  <span>Publicar ida</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAvancar}
              className="w-full min-h-11 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] font-bold text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-xs cursor-pointer"
            >
              <span>Continuar</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
