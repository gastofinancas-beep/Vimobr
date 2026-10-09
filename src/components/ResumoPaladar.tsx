import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
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
      <MascotMessage
        reaction="analisando"
        title={isMeuPerfil ? 'Seu paladar aparece aqui' : 'Sem dados ainda'}
        subtitle={
          isMeuPerfil
            ? 'Depois das primeiras avaliações, você vê o que mais avalia e como costuma dar nota.'
            : 'Esta pessoa ainda não tem avaliações suficientes.'
        }
      />
    );
  }

  const nota = (n: number) => n.toFixed(1).replace('.', ',');

  const destaques = [
    {
      rotulo: 'Lugares',
      valor: String(stats.lugaresUnicos),
      detalhe: `${stats.totalLugares} ${stats.totalLugares === 1 ? 'visita' : 'visitas'}`,
    },
    { rotulo: 'Nota média', valor: nota(stats.mediaGeral), detalhe: 'de 5' },
    {
      rotulo: 'Mais avaliado',
      valor: stats.categoriaFavorita,
      detalhe: `${stats.categoriaFavoritaCount} ${stats.categoriaFavoritaCount === 1 ? 'avaliação' : 'avaliações'}`,
    },
    { rotulo: 'Ponto forte', valor: stats.criterioDestaque, detalhe: `média ${nota(stats.criterioDestaqueNota)}` },
  ];

  const graficos = [
    { key: 'categorias' as const, label: 'Categorias' },
    { key: 'criterios' as const, label: 'Critérios' },
    { key: 'estrelas' as const, label: 'Notas' },
  ];

  // Série única por gráfico: uma só cor (azul da marca), grade discreta, pontas de 4px
  const eixo = { fill: 'var(--muted)', fontSize: 12, fontFamily: 'Inter' };
  const dica = (texto: (v: number) => string) =>
    ({ active, payload, label }: any) =>
      active && payload?.length ? (
        <div className="rounded-lg bg-s1 px-3 py-2 shadow-lg ring-1 ring-line">
          <p className="text-xs font-semibold text-ink">{label}</p>
          <p className="text-xs text-ink-2 tabular">{texto(Number(payload[0].value))}</p>
        </div>
      ) : null;

  const dados =
    graficoAtivo === 'categorias'
      ? { data: stats.dadosCategorias, x: 'categoria', y: 'total', dominio: undefined, tip: dica((v) => `${v} ${v === 1 ? 'visita' : 'visitas'}`) }
      : graficoAtivo === 'criterios'
      ? { data: stats.dadosCriterios, x: 'criterio', y: 'nota', dominio: [0, 5] as [number, number], tip: dica((v) => `média ${nota(v)}`) }
      : { data: stats.dadosEstrelas, x: 'estrelas', y: 'total', dominio: undefined, tip: dica((v) => `${v} ${v === 1 ? 'avaliação' : 'avaliações'}`) };

  return (
    <div className="space-y-7">
      {/* Destaques em texto, sem caixas */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
        {destaques.map((d) => (
          <div key={d.rotulo} className="min-w-0">
            <dt className="t-meta">{d.rotulo}</dt>
            <dd className="mt-0.5 truncate text-xl font-semibold tracking-tight text-ink tabular">{d.valor}</dd>
            <dd className="text-sm text-muted">{d.detalhe}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="titulo-grafico">
        <div className="flex items-center justify-between gap-3">
          <h3 id="titulo-grafico" className="t-section text-ink">
            {graficoAtivo === 'categorias' ? 'Visitas por categoria' : graficoAtivo === 'criterios' ? 'Média por critério' : 'Como você dá nota'}
          </h3>
        </div>

        <div role="tablist" aria-label="Escolher gráfico" className="mt-3 inline-flex rounded-lg bg-s2 p-0.5">
          {graficos.map((g) => (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={graficoAtivo === g.key}
              onClick={() => setGraficoAtivo(g.key)}
              className={`h-8 rounded-md px-3 text-sm transition-colors cursor-pointer ${
                graficoAtivo === g.key ? 'bg-s1 font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="mt-4 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados.data as Record<string, string | number>[]} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey={dados.x} tick={eixo} axisLine={false} tickLine={false} interval={0} />
              <YAxis
                allowDecimals={false}
                domain={dados.dominio}
                ticks={dados.dominio ? [0, 1, 2, 3, 4, 5] : undefined}
                tick={eixo}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip cursor={{ fill: 'var(--s2)' }} content={dados.tip} />
              <Bar dataKey={dados.y} fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
