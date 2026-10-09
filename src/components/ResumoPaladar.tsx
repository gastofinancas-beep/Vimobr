import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Utensils, Star, Award, BarChart3, TrendingUp, Sparkles } from 'lucide-react';
import MascotMessage from './MascotMessage';
import type { Review } from '../types';
import { SAMPLE_PLACES } from '../lib/places';

interface ResumoPaladarProps {
  reviews: Review[];
  userName?: string;
  isMeuPerfil?: boolean;
}

export default function ResumoPaladar({ reviews, userName, isMeuPerfil }: ResumoPaladarProps) {
  const [graficoAtivo, setGraficoAtivo] = useState<'categorias' | 'criterios' | 'estrelas'>('categorias');

  // Inferir categoria gastronômica
  const inferirCategoria = (r: Review): string => {
    const match = SAMPLE_PLACES.find((p) => p.id === r.placeId);
    if (match?.tipo) {
      if (match.tipo === 'cafe') return 'Café';
      if (match.tipo === 'bakery') return 'Padaria';
      if (match.tipo === 'bar') return 'Bar';
      return 'Restaurante';
    }
    const nome = (r.placeName || '').toLowerCase();
    if (nome.includes('café') || nome.includes('coffee') || nome.includes('espresso')) return 'Café';
    if (nome.includes('padaria') || nome.includes('panificadora') || nome.includes('bakery') || nome.includes('pão')) return 'Padaria';
    if (nome.includes('bar') || nome.includes('boteco') || nome.includes('pub') || nome.includes('choperia')) return 'Bar';
    if (nome.includes('pizza')) return 'Pizzaria';
    if (nome.includes('bistrô') || nome.includes('bistro')) return 'Bistrô';
    if (nome.includes('sushi') || nome.includes('ramen')) return 'Japonês';
    return 'Restaurante';
  };

  // Cálculo de todas as estatísticas do Paladar
  const stats = useMemo(() => {
    if (!reviews.length) {
      return {
        totalLugares: 0,
        lugaresUnicos: 0,
        mediaGeral: 0,
        categoriaFavorita: 'Nenhuma',
        categoriaFavoritaCount: 0,
        criterioDestaque: 'Comida',
        criterioDestaqueNota: 0,
        dadosCategorias: [],
        dadosCriterios: [],
        dadosEstrelas: [],
      };
    }

    const uniquePlaces = new Set(reviews.map((r) => r.placeId)).size;
    const mediaGeral = reviews.reduce((acc, r) => acc + (r.overall || 0), 0) / reviews.length;

    // 1. Contagem por Categoria
    const categoriasMap: Record<string, number> = {};
    reviews.forEach((r) => {
      const cat = inferirCategoria(r);
      categoriasMap[cat] = (categoriasMap[cat] || 0) + 1;
    });

    const dadosCategorias = Object.entries(categoriasMap)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);

    const categoriaFavorita = dadosCategorias[0]?.categoria || 'Diversos';
    const categoriaFavoritaCount = dadosCategorias[0]?.total || 0;

    // 2. Médias por Critério
    let somaComida = 0;
    let somaAmbiente = 0;
    let somaAtendimento = 0;
    let somaCusto = 0;

    reviews.forEach((r) => {
      somaComida += r.ratings?.comida ?? r.overall;
      somaAmbiente += r.ratings?.ambiente ?? r.overall;
      somaAtendimento += r.ratings?.atendimento ?? r.overall;
      somaCusto += r.ratings?.custoBeneficio ?? r.overall;
    });

    const dadosCriterios = [
      { criterio: 'Comida', nota: Number((somaComida / reviews.length).toFixed(1)) },
      { criterio: 'Ambiente', nota: Number((somaAmbiente / reviews.length).toFixed(1)) },
      { criterio: 'Atendimento', nota: Number((somaAtendimento / reviews.length).toFixed(1)) },
      { criterio: 'Custo-benefício', nota: Number((somaCusto / reviews.length).toFixed(1)) },
    ];

    const sortedCriterios = [...dadosCriterios].sort((a, b) => b.nota - a.nota);
    const criterioDestaque = sortedCriterios[0]?.criterio || 'Comida';
    const criterioDestaqueNota = sortedCriterios[0]?.nota || 0;

    // 3. Distribuição de Estrelas (Estilo Letterboxd)
    const estrelasMap = { '★ 1': 0, '★ 2': 0, '★ 3': 0, '★ 4': 0, '★ 5': 0 };
    reviews.forEach((r) => {
      const nota = Math.round(r.overall);
      if (nota <= 1) estrelasMap['★ 1']++;
      else if (nota === 2) estrelasMap['★ 2']++;
      else if (nota === 3) estrelasMap['★ 3']++;
      else if (nota === 4) estrelasMap['★ 4']++;
      else estrelasMap['★ 5']++;
    });

    const dadosEstrelas = Object.entries(estrelasMap).map(([estrelas, total]) => ({
      estrelas,
      total,
    }));

    return {
      totalLugares: reviews.length,
      lugaresUnicos: uniquePlaces,
      mediaGeral: Number(mediaGeral.toFixed(1)),
      categoriaFavorita,
      categoriaFavoritaCount,
      criterioDestaque,
      criterioDestaqueNota,
      dadosCategorias,
      dadosCriterios,
      dadosEstrelas,
    };
  }, [reviews]);

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--s1)] p-6">
        <MascotMessage
          reaction="analisando"
          title="Resumo do Paladar"
          subtitle={
            isMeuPerfil
              ? 'Avalie seus primeiros restaurantes, cafés e padarias para desbloquear suas estatísticas gastronômicas e gráficos de paladar!'
              : 'Este usuário ainda não tem avaliações suficientes para gerar o resumo do paladar.'
          }
          size={80}
        />
      </div>
    );
  }

  // Cores da identidade VIMO
  const CORES_CATEGORIAS = ['var(--primary)', 'var(--star)', '#5F94E6', '#F19E75', '#9CA0B3'];

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--s1)] p-4 space-y-5">
      {/* Título & Badge */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2">
          <Utensils size={18} className="text-[var(--primary)]" />
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">
            Resumo do Paladar
          </h2>
        </div>
        <span className="text-[12px] font-medium text-[var(--primary)] bg-[var(--s2)] px-2.5 py-1 rounded-xl border border-[var(--line)] flex items-center gap-1">
          <Sparkles size={12} />
          Estatísticas
        </span>
      </div>

      {/* Grid de 4 Cards de Destaque / Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Lugares Visitados */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-3 flex flex-col justify-between">
          <span className="text-[12px] text-[var(--muted)]">Lugares Visitados</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[20px] font-bold text-[var(--ink)]">
              {stats.lugaresUnicos}
            </span>
            <span className="text-[12px] text-[var(--muted)]">
              ({stats.totalLugares} {stats.totalLugares === 1 ? 'visita' : 'visitas'})
            </span>
          </div>
        </div>

        {/* 2. Média Geral de Notas */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-3 flex flex-col justify-between">
          <span className="text-[12px] text-[var(--muted)]">Média Geral</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[20px] font-bold text-[var(--star)]">
              ★ {stats.mediaGeral.toFixed(1).replace('.', ',')}
            </span>
            <span className="text-[12px] text-[var(--muted)]">/ 5,0</span>
          </div>
        </div>

        {/* 3. Categoria Favorita */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-3 flex flex-col justify-between">
          <span className="text-[12px] text-[var(--muted)]">Categoria Favorita</span>
          <div className="mt-1">
            <p className="text-[14px] font-semibold text-[var(--ink)] truncate">
              {stats.categoriaFavorita}
            </p>
            <span className="text-[12px] text-[var(--primary)] font-medium">
              {stats.categoriaFavoritaCount} {stats.categoriaFavoritaCount === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </div>
        </div>

        {/* 4. Critério Mais Elogiado */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-3 flex flex-col justify-between">
          <span className="text-[12px] text-[var(--muted)]">Ponto Forte</span>
          <div className="mt-1">
            <p className="text-[14px] font-semibold text-[var(--ink)] truncate">
              {stats.criterioDestaque}
            </p>
            <span className="text-[12px] text-[var(--star)] font-medium">
              ★ {stats.criterioDestaqueNota.toFixed(1).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      {/* Seletor do Gráfico */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <BarChart3 size={15} className="text-[var(--primary)]" />
            Análise Visual
          </h3>

          <div className="flex items-center bg-[var(--s2)] p-0.5 rounded-xl border border-[var(--line)] text-[12px]">
            <button
              type="button"
              onClick={() => setGraficoAtivo('categorias')}
              className={`min-h-9 px-3 rounded-lg font-medium transition cursor-pointer ${
                graficoAtivo === 'categorias'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Categorias
            </button>
            <button
              type="button"
              onClick={() => setGraficoAtivo('criterios')}
              className={`min-h-9 px-3 rounded-lg font-medium transition cursor-pointer ${
                graficoAtivo === 'criterios'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Critérios
            </button>
            <button
              type="button"
              onClick={() => setGraficoAtivo('estrelas')}
              className={`min-h-9 px-3 rounded-lg font-medium transition cursor-pointer ${
                graficoAtivo === 'estrelas'
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Notas ★
            </button>
          </div>
        </div>

        {/* Container do Gráfico com Recharts */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)]/40 p-4 pt-6 h-[260px] w-full">
          {graficoAtivo === 'categorias' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dadosCategorias} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="categoria"
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'Inter' }}
                  axisLine={{ stroke: 'var(--line)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'Inter' }}
                  axisLine={{ stroke: 'var(--line)' }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] px-3 py-2 shadow-lg">
                          <p className="text-[12px] font-semibold text-[var(--ink)]">{label}</p>
                          <p className="text-[12px] font-medium text-[var(--primary)]">
                            {payload[0].value} {payload[0].value === 1 ? 'lugar visitado' : 'lugares visitados'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {stats.dadosCategorias.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CORES_CATEGORIAS[index % CORES_CATEGORIAS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {graficoAtivo === 'criterios' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dadosCriterios} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="criterio"
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'Inter' }}
                  axisLine={{ stroke: 'var(--line)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'Inter' }}
                  axisLine={{ stroke: 'var(--line)' }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] px-3 py-2 shadow-lg">
                          <p className="text-[12px] font-semibold text-[var(--ink)]">{label}</p>
                          <p className="text-[12px] font-medium text-[var(--star)]">
                            ★ {Number(payload[0].value).toFixed(1).replace('.', ',')} de média
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="nota" fill="var(--star)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {graficoAtivo === 'estrelas' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dadosEstrelas} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="estrelas"
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'Inter' }}
                  axisLine={{ stroke: 'var(--line)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'Inter' }}
                  axisLine={{ stroke: 'var(--line)' }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] px-3 py-2 shadow-lg">
                          <p className="text-[12px] font-semibold text-[var(--ink)]">{label}</p>
                          <p className="text-[12px] font-medium text-[var(--primary)]">
                            {payload[0].value} {payload[0].value === 1 ? 'avaliação' : 'avaliações'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" fill="var(--star)" radius={[6, 6, 0, 0]}>
                  {stats.dadosEstrelas.map((_, index) => (
                    <Cell
                      key={`star-${index}`}
                      fill="var(--star)"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
