import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  MapPin,
  Star,
  Clock,
  Compass,
  Search,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Utensils,
} from 'lucide-react';
import type { TrendingPlace, UserCoordinates } from '../types/placesApi';
import {
  solicitarLocalizacaoAtual,
  obterCoordenadasSalvas,
  geocodificarEnderecoManual,
} from '../services/locationService';
import { buscarLugaresEmAltaPerto } from '../services/googlePlacesService';

interface EmAltaPertoSectionProps {
  onAbrirLugar?: (place: any) => void;
}

export default function EmAltaPertoSection({ onAbrirLugar }: EmAltaPertoSectionProps) {
  const [coords, setCoords] = useState<UserCoordinates | null>(() => obterCoordenadasSalvas());
  const [lugares, setLugares] = useState<TrendingPlace[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [statusErro, setStatusErro] = useState<
    'nenhum' | 'localizacao_negada' | 'api_key_missing' | 'billing_needed' | 'api_error' | 'sem_resultados'
  >('nenhum');
  const [mensagemErro, setMensagemErro] = useState<string>('');
  const [enderecoManual, setEnderecoManual] = useState<string>('');
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);

  // Inicializa a localização do usuário ao montar o componente
  useEffect(() => {
    let ativo = true;

    async function initLocation() {
      setCarregando(true);
      setStatusErro('nenhum');

      try {
        const localCoords = await solicitarLocalizacaoAtual();
        if (ativo) {
          setCoords(localCoords);
        }
      } catch (err: any) {
        if (!ativo) return;
        if (err.code === 'PERMISSION_DENIED') {
          setStatusErro('localizacao_negada');
          setMensagemErro(
            'Acesso à localização negado. Para encontrar estabelecimentos em um raio de até 20 km de você, autorize a localização ou digite seu endereço abaixo.'
          );
        } else {
          // Se tiver coordenadas salvas anteriormente, use como fallback
          const salvas = obterCoordenadasSalvas();
          if (salvas) {
            setCoords(salvas);
          } else {
            setStatusErro('localizacao_negada');
            setMensagemErro(
              'Não foi possível obter sua localização automaticamente. Informe seu bairro ou cidade manualmente para buscar estabelecimentos reais próximos.'
            );
          }
        }
        setCarregando(false);
      }
    }

    initLocation();

    return () => {
      ativo = false;
    };
  }, []);

  // Quando as coordenadas forem obtidas, buscar estabelecimentos reais da Google Places API
  useEffect(() => {
    if (!coords) return;

    let ativo = true;

    async function carregarLugares() {
      setCarregando(true);
      setStatusErro('nenhum');

      const res = await buscarLugaresEmAltaPerto(coords!.lat, coords!.lng, 20000);

      if (!ativo) return;

      setCarregando(false);

      if (res.code === 'API_KEY_MISSING') {
        setStatusErro('api_key_missing');
        setMensagemErro(
          res.error ||
            'Chave da Google Places API necessária para carregar estabelecimentos em tempo real. Configure a variável GOOGLE_MAPS_API_KEY no arquivo .env.'
        );
        setLugares([]);
        return;
      }

      if (res.code === 'BILLING_OR_API_NOT_ENABLED') {
        setStatusErro('billing_needed');
        setMensagemErro(
          res.error ||
            'Sua chave de API do Google Maps foi configurada! Para liberar o retorno dos dados de estabelecimentos reais, o Google Cloud requer a vinculação de uma conta de faturamento (Billing) e a ativação da "Places API (New)".'
        );
        setLugares([]);
        return;
      }

      if (res.code === 'API_ERROR' || res.code === 'NETWORK_ERROR') {
        setStatusErro('api_error');
        setMensagemErro(res.error || 'Erro de comunicação com a API do Google Places.');
        setLugares([]);
        return;
      }

      if (res.code === 'ZERO_RESULTS' || res.places.length === 0) {
        setStatusErro('sem_resultados');
        setLugares([]);
        return;
      }

      setLugares(res.places);
    }

    carregarLugares();

    return () => {
      ativo = false;
    };
  }, [coords]);

  // Recarregar localização via GPS
  const tentarNovamenteGPS = async () => {
    setCarregando(true);
    setStatusErro('nenhum');
    try {
      const novascoords = await solicitarLocalizacaoAtual();
      setCoords(novascoords);
    } catch (err: any) {
      setCarregando(false);
      setStatusErro('localizacao_negada');
      setMensagemErro(
        'Permissão de localização ainda não concedida. Por favor, libere a localização no seu navegador ou informe um endereço abaixo.'
      );
    }
  };

  // Buscar endereço manual informado pelo usuário
  const handleBuscarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enderecoManual.trim()) return;

    setBuscandoEndereco(true);
    try {
      const geo = await geocodificarEnderecoManual(enderecoManual);
      setCoords({
        lat: geo.lat,
        lng: geo.lng,
        source: 'manual',
        displayName: geo.displayName,
      });
      setStatusErro('nenhum');
    } catch (err: any) {
      alert(err.message || 'Endereço não encontrado.');
    } finally {
      setBuscandoEndereco(false);
    }
  };

  return (
    <section className="pt-5 pb-3">
      {/* Título e Subtítulo Conforme Especificação */}
      <div className="flex items-center justify-between px-4 pb-1">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
            <TrendingUp size={16} className="text-amber-500" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-gray-950 dark:text-white leading-none">
              Em alta perto de você
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-0.5">
              Os lugares mais interessantes próximos da sua localização (até 20 km)
            </p>
          </div>
        </div>

        {coords && (
          <button
            type="button"
            onClick={tentarNovamenteGPS}
            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 transition"
            title="Atualizar minha localização"
          >
            <RotateCcw size={11} className={carregando ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        )}
      </div>

      {/* Indicador de Localização Ativa */}
      {coords?.displayName && (
        <div className="px-4 pb-2 text-[11px] text-gray-500 flex items-center gap-1">
          <MapPin size={12} className="text-amber-500 shrink-0" />
          <span className="truncate">Buscando perto de: {coords.displayName}</span>
        </div>
      )}

      {/* ESTADO 1: Carregando (Skeleton Cards) */}
      {carregando && (
        <div className="flex gap-3 overflow-x-auto px-4 py-2 no-scrollbar">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="w-[240px] sm:w-[260px] shrink-0 rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden animate-pulse"
            >
              <div className="h-32 bg-gray-100 dark:bg-neutral-800" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded-md w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-neutral-800 rounded-md w-1/2" />
                <div className="h-3 bg-gray-100 dark:bg-neutral-800 rounded-md w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ESTADO 2: Localização Negada */}
      {!carregando && statusErro === 'localizacao_negada' && (
        <div className="mx-4 my-2 p-4 rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-start gap-2.5">
            <Compass size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-gray-950 dark:text-white">
                Permissão de Localização Necessária
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                {mensagemErro}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={tentarNovamenteGPS}
              className="h-9 px-4 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-xs hover:bg-amber-600 transition flex items-center justify-center gap-1.5"
            >
              <Compass size={13} />
              <span>Autorizar Localização</span>
            </button>

            {/* Input para Endereço Manual */}
            <form onSubmit={handleBuscarManual} className="flex-1 flex gap-1.5">
              <input
                type="text"
                value={enderecoManual}
                onChange={(e) => setEnderecoManual(e.target.value)}
                placeholder="Ex: Pinheiros, São Paulo ou Av. Paulista"
                className="flex-1 h-9 px-3 rounded-xl bg-gray-100 dark:bg-neutral-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={buscandoEndereco || !enderecoManual.trim()}
                className="h-9 px-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-950 text-xs font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center gap-1"
              >
                <Search size={12} />
                <span>{buscandoEndereco ? '...' : 'Buscar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ESTADO 3: Chave da Google Places API Não Configurada */}
      {!carregando && statusErro === 'api_key_missing' && (
        <div className="mx-4 my-2 p-4 rounded-3xl bg-amber-50/60 dark:bg-amber-950/20 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Integração Oficial com Google Places API
              </h4>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                Conforme solicitado, não exibimos dados fictícios ou inventados. Para exibir
                estabelecimentos reais e dinâmicos no raio de 20 km, configure sua chave no arquivo{' '}
                <code className="px-1 py-0.5 rounded bg-amber-200/50 dark:bg-amber-900/50 font-sans text-[12px]">
                  .env
                </code>{' '}
                (variável <code className="font-sans text-[12px]">GOOGLE_MAPS_API_KEY</code>).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO 3.1: Chave Configurada mas requer ativação de Faturamento / API no Google Cloud */}
      {!carregando && statusErro === 'billing_needed' && (
        <div className="mx-4 my-2 p-4.5 rounded-3xl bg-white dark:bg-[#18181B] shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
              <ExternalLink size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-950 dark:text-white">
                Chave Detectada — Quase Pronto!
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Sua chave <code className="text-amber-600 font-sans text-[12px]">AIzaSy...</code> já está configurada com sucesso no sistema.
                Para o Google autorizar requisições aos restaurantes reais, faltam apenas dois passos na sua tela do Google Cloud:
              </p>
              <ul className="text-[11px] text-gray-600 dark:text-gray-300 mt-2 space-y-1 list-disc list-inside">
                <li>Clique no botão azul <b>"Acessar a Plataforma Google Maps"</b>.</li>
                <li>Ative o faturamento (Billing) no projeto. <i>(O Google concede $200 USD de crédito gratuito todo mês para desenvolvimento).</i></li>
                <li>Garanta que a <b>"Places API (New)"</b> esteja ativada.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-neutral-800">
            <a
              href="https://console.cloud.google.com/google/maps-apis/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8.5 px-3.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>Abrir Google Cloud Console</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* ESTADO 4: Erro da API do Google */}
      {!carregando && statusErro === 'api_error' && (
        <div className="mx-4 my-2 p-4 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Erro ao Consultar o Google Places
              </h4>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                {mensagemErro}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={tentarNovamenteGPS}
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            Tentar recarregar
          </button>
        </div>
      )}

      {/* ESTADO 5: Nenhum Estabelecimento Encontrado */}
      {!carregando && statusErro === 'sem_resultados' && (
        <div className="mx-4 my-2 p-5 rounded-3xl bg-[var(--s1)] border border-[var(--line)] text-center">
          <img src="/mascot/vimo_explorando.png" alt="" aria-hidden="true" width={72} height={72} className="mx-auto object-contain mb-2" />
          <p className="text-xs font-bold text-[var(--ink)]">
            Nenhum estabelecimento gastronômico encontrado
          </p>
          <p className="text-[11px] text-[var(--muted)] mt-1">
            Não localizamos restaurantes cadastrados no Google em um raio de 20 km desta localização.
          </p>
        </div>
      )}

      {/* ESTADO 6: Resultados Reais Encontrados (Scroll Horizontal) */}
      {!carregando && statusErro === 'nenhum' && lugares.length > 0 && (
        <div className="flex gap-3.5 overflow-x-auto px-4 py-2 no-scrollbar snap-x snap-mandatory">
          {lugares.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                if (onAbrirLugar) {
                  onAbrirLugar({
                    id: p.id,
                    name: p.name,
                    address: p.formattedAddress || p.shortAddress,
                    photoUrl: p.photoUrl,
                    rating: p.rating,
                    reviewsCount: p.userRatingCount,
                    googleRating: p.rating,
                    googleUserRatingCount: p.userRatingCount,
                    lat: p.location.lat,
                    lng: p.location.lng,
                    tipo: p.primaryType,
                  });
                }
              }}
              className="group relative w-[240px] sm:w-[260px] shrink-0 snap-start rounded-3xl bg-[var(--s1)] border border-[var(--line)] shadow-xs hover:border-[var(--primary)] transition duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
            >
              {/* Foto Real do Google Places */}
              <div className="relative h-36 w-full bg-[var(--s2)] overflow-hidden">
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-[var(--s2)] text-[var(--muted)]">
                    <Utensils size={32} className="opacity-60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                {/* Selo de Nota e Avaliações Reais */}
                <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[12px] font-bold text-[var(--star)] flex items-center gap-1 shadow-xs">
                  <Star size={12} className="fill-[var(--star)]" />
                  <span>{p.rating ? p.rating.toFixed(1).replace('.', ',') : '–'}</span>
                </div>

                {/* Status Aberto Agora / Fechado */}
                {p.openNow !== null && p.openNow !== undefined && (
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[12px] font-semibold text-white flex items-center gap-1 shadow-xs">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        p.openNow ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <span>{p.openNow ? 'Aberto' : 'Fechado'}</span>
                  </div>
                )}

                {/* Nome do Restaurante sobre o gradiente */}
                <div className="absolute bottom-2.5 inset-x-3">
                  <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-[var(--primary)] transition">
                    {p.name}
                  </h3>
                </div>
              </div>

              {/* Informações detalhadas do Card */}
              <div className="p-3.5 space-y-1.5">
                {/* Linha 1: Nota do Google e Quantidade de Avaliações */}
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink)] font-semibold">
                  <span className="flex items-center gap-1 text-[var(--star)] font-bold">
                    <Star size={12} className="fill-[var(--star)]" />
                    <span>{p.rating ? p.rating.toFixed(1).replace('.', ',') : '–'}</span>
                  </span>
                  <span>·</span>
                  <span className="text-[var(--muted)] font-normal">
                    {p.userRatingCount ? `${p.userRatingCount.toLocaleString('pt-BR')} avaliações` : 'Sem avaliações'}
                  </span>
                </div>

                {/* Linha 2: Categoria/Tipo */}
                <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                  <span className="font-medium truncate">{p.categoryLabel}</span>
                  {p.priceFormatted && (
                    <>
                      <span>·</span>
                      <span className="text-[var(--primary)] font-bold">
                        {p.priceFormatted}
                      </span>
                    </>
                  )}
                </div>

                {/* Linha 3: Distância real aproximada do usuário */}
                <div className="flex items-center gap-1 text-[12px] text-[var(--muted)] pt-0.5">
                  <MapPin size={12} className="text-[var(--star)] shrink-0" />
                  <span className="font-medium text-[var(--star)]">
                    {p.distanceFormatted} de você
                  </span>
                  {p.shortAddress && (
                    <>
                      <span>·</span>
                      <span className="truncate">{p.shortAddress}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
