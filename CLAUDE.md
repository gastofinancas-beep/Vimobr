# VIMO — contexto do projeto

VIMO é um app social de reviews de restaurantes. A pessoa registra onde comeu, dá nota,
segue amigos e descobre lugares pelas avaliações deles — pensado como "Letterboxd de
restaurantes", com Albo e Vivino como referências de visual.

- **Dono:** Pedro (pedrootavio10k@gmail.com)
- **Repositório:** github.com/gastofinancas-beep/Vimobr — ligado ao Google AI Studio
- **Regra de trabalho:** lançar direto na branch `main` ("código fixo"), sem PR nem branch
  separada esperando aprovação. Commitar com autor `Pedro <pedrootavio10k@gmail.com>`.
- **Idioma:** toda a UI, os commits e os comentários de produto são em português do Brasil.
  Código (nomes de função, tipos) pode ficar em português também — o projeto já segue esse padrão
  (`AvaliarModal`, `PerfilScreen`, `obterResumoConquistas` etc.), então mantenha consistência.

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind v4 (configuração via `@theme inline` em `src/index.css`, não `tailwind.config`)
- Firebase (Auth + Firestore) — dados gravam local-primeiro (localStorage) e sincronizam em
  segundo plano; a tela nunca espera a rede para atualizar
- `react-router-dom`, `recharts` (gráfico de Paladar), `@vis.gl/react-google-maps` (mapa),
  `@google/genai` (card compartilhável gerado por IA), `motion` (animações)
- Server leve em `server.ts` (Express) só para servir o build / variáveis de ambiente

## Identidade visual

**Mascote:** uma gralha-de-crista-negra preta com crista azul. É a identidade oficial do app
(não é genérico). PNGs em `public/mascote/`. Tem variações de reação (`tranquilo`, `confiante`,
`impressionado`, `decepcionado`, `animado` etc.) usadas em estados vazios, sucesso e conquistas —
não só no login. Algumas têm piscada animada (pálpebra mascarada pelo próprio PNG). Classes de
animação: `mascote-entrar`, `flutuar`, `respirar`, `pular`, `inclinar`, `orgulho`,
`mascote-palpebra` — todas respeitam `prefers-reduced-motion`.

**Paleta oficial (fixa, não inventar outras cores):**
| Token CSS | Hex | Uso |
|---|---|---|
| `--bg` | `#F8F7F4` | fundo (off-white) — tema claro é o padrão |
| `--ink` | `#101116` | texto e botões (preto azulado) |
| `--primary` / `--cta` | `#124BFF` | azul elétrico — destaque da marca, CTAs, selo PRO |
| `--line` | `#D9D9D9` | divisórias e elementos secundários |

Tema escuro existe (`html.dark`) mas o claro é o padrão (chave `vimo_tema_v3`).

**Fontes:** Inter no texto corrido; Plus Jakarta Sans (peso 600–800) em `--font-display`, usada em
todos os títulos e cabeçalhos via as classes utilitárias `t-display`, `t-title`, `t-section` (ou
`font-display` direto). Carregadas via Google Fonts em `index.html`.

**Tom de escrita:** direto, sem exclamação, sem emoji, sem "Sucesso!", sem textos inflados tipo
IA genérica. Frases curtas, como um app de startup profissional — nunca "Incrível!", "Uau",
ícones de `Sparkles` decorativos etc. Esse pente fino já foi feito uma vez; manter o padrão em
qualquer coisa nova.

## Estrutura de telas (src/screens)

- `LoginScreen` — entrada (Google, e-mail/senha, ou convidado)
- `ExplorarScreen` — tela inicial. "Populares da semana" (cards grandes estilo pôster
  Letterboxd, 2 colunas), fileiras por tipo (Restaurantes / Cafés e padarias / Bares, só
  aparecem com 3+ lugares) e grade "Todos os lugares". **Nenhuma nota aparece na listagem** —
  só ao abrir o lugar. Com busca ou filtro ativo vira grade única de 2 colunas.
- `DescobrirPertoDeMimScreen` — aba Mapa, pinos por proximidade, filtros por categoria
- `AmigosScreen` — feed social (quem os amigos avaliaram)
- `PerfilScreen` — capa + foto, números (idas, seguidores, seguindo), bio, favoritos, abas
  Diário / Paladar / Conquistas; medalhas em destaque só para PRO (ver abaixo)
- `PlaceDetailScreen` — tela única de detalhe do lugar (ações, como chegar, fotos, notas
  Vimo + Google com histograma, amigos que já foram, avaliações)
- `AvaliarModal` — fluxo de avaliar em passo a passo (um critério por tela): Lugar → Data →
  Café & Espresso → Doces & Sobremesas → Comidinhas & Salgados → Ambiente & Conforto →
  Atendimento & Barista → Voltaria & Preço → Prato destaque → Comentário → Fotos → Amigos → Resumo.
  Nota geral é a média dos critérios, arredondada para meia estrela, e só aparece no resumo final.
- `ComunidadeScreen`, `ColecaoScreen` — hoje sem uso real na navegação (ver "arquivos órfãos")

Barra inferior fixa: Explorar, Mapa, **+** central (nova avaliação), Amigos, Perfil.

## Plano PRO

- `src/lib/plano.ts`: `ehPro(user)` → `true` quando `user.plano === 'pro'` no Firestore, ou em
  dev quando `localStorage.vimo_pro_teste === '1'` (query `?pro=1` liga, `?pro=0` desliga, só
  em `import.meta.env.DEV`).
- Ativar PRO de verdade = gravar `plano: 'pro'` no documento `users/{uid}` no Firestore. **Não
  existe cobrança/checkout ainda.**
- Benefício implementado: vitrine de medalhas em destaque no perfil + selo "PRO" ao lado do nome.
  Quem não é PRO vê um card de oferta que abre `ProSheet` (folha com mascote, benefícios e botão
  "Quero ser PRO" que só registra interesse via `registrarInteressePro`, não cobra nada).
  Outros benefícios do PRO **ainda não foram decididos** — perguntar ao Pedro antes de supor.

## Medalhas (src/lib/badges.ts, src/components/Medalha.tsx)

12 medalhas com títulos diretos (não floreados): "5 idas", "15 idas", "30 idas", "Rota do café",
"Rota da padaria", "Rota dos bares", "Rota da pizza", "Fotógrafo", "Detalhista", "Boa
companhia", "Referência", "Primeira ida". Níveis: bronze, prata, ouro, diamante — cores vêm da
paleta oficial (bronze = off-white com contorno, prata = preto, ouro = azul, diamante = azul
com anel preto), nunca dourado/prata genéricos de ícone.

## Convenções de desenvolvimento

- **Dados locais primeiro:** gravar em localStorage e atualizar a tela otimisticamente antes de
  qualquer chamada ao Firestore; a sincronização remota acontece em segundo plano.
- Sempre rodar `npx tsc --noEmit -p .` depois de qualquer mudança — o projeto deve ficar com o
  `tsc` limpo antes de commitar.
- Build de produção: `npx vite build` (gera PWA via plugin, confirmar que não há erro).
- Testes: há um e2e em Playwright (fora do repo, no scratchpad de sessões anteriores) com 22
  passos cobrindo login, explorar, avaliar, perfil, amigos, notificações, mapa, logout. Ao mexer
  em qualquer fluxo coberto por ele, validar manualmente os mesmos passos. Vale também um
  "crawler" que clica em cada botão visível de uma tela, um de cada vez, e verifica se algo
  muda — útil para pegar botões mudos (aconteceu com os filtros do Mapa e com "voltar para minha
  localização", que nunca chamava `navigator.geolocation`).
- Imagens externas (Unsplash) e fontes do Google são bloqueadas na rede de alguns ambientes de
  teste — nesses casos, servir localmente ao rodar testes automatizados (não é um problema do
  app em produção).
- `navigator.clipboard` e `navigator.share` podem falhar silenciosamente (permissão negada) —
  sempre envolver em try/catch com um aviso (`showToast`) de erro, nunca deixar a Promise rejeitar
  sem tratamento.

## Arquivos órfãos conhecidos (dívida técnica)

Uma varredura encontrou ~20 arquivos em `src/components` e `src/lib` que não são importados em
lugar nenhum (sobras de versões anteriores do app): `AddDishModal`, `CommunityTrendsGrid`,
`ConviteModal`, `DestaqueSemanaSection`, `DishHighlightCard`, `EmAltaPertoSection`,
`ExplorarHeader`, `FiltrosExplorar`, `MapaView`, `ModernFeaturedCard`, `PWAInstallButton`,
`PrivacidadeModal`, `ReservaModal`, `RestaurantCard`, `ReviewCard`, `RoteiroDetailModal`,
`RoteiroModal`, `TopListsSection`, `WishlistTab`, `foursquare/FsqEmAltaSection`,
`foursquare/FsqPlaceCard`, `communityPosts.ts`, `itineraries.ts`, `rankings.ts`, `dishes.ts`,
`usePWAInstall.ts`, `ColecaoScreen.tsx`. Não quebram nada hoje, mas podem ser removidos numa
limpeza futura (confirmar de novo com um grep de imports antes de apagar, caso algo tenha
mudado).

## Decisões já fechadas (não reabrir sem pedir)

- Tema claro é o padrão; escuro é a alternativa.
- Sem notas visíveis nas listagens — só dentro do lugar.
- Login: Google + e-mail/senha; modo convidado existe para teste.
- Nota geral = média dos critérios, meia estrela, sem tela própria — calculada no resumo.
- Barra inferior com 5 posições fixas (Explorar, Mapa, +, Amigos, Perfil) — não adicionar aba
  nova sem conversar antes.
- Regras de segurança do Firestore já publicadas (bloco de segurança); curtidas, comentários e
  contadores de seguidores usam só regras (+1/-1), sem Cloud Functions.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencher as chaves abaixo
npm run dev             # tsx server.ts — serve o app com Vite
npm run lint             # tsc --noEmit — rodar depois de qualquer mudança
npm run build            # vite build — confirmar que builda limpo antes de commitar
```

Variáveis de ambiente usadas pelo projeto (`.env`, nunca commitar):
- `VITE_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_API_KEY` — mapa (aba Mapa)
- `VITE_GOOGLE_PLACES_KEY` / `GOOGLE_PLACES_KEY` — busca de lugares reais
- `VITE_FOURSQUARE_API_KEY` / `FOURSQUARE_API_KEY` — fonte alternativa de lugares
- `GEMINI_API_KEY` — geração do card compartilhável de avaliação (`ShareReviewModal`)
- Firebase: configurado no client (ver `src/lib/firebase.ts` ou equivalente) — confirmar projeto
  do Firebase correto antes de qualquer mudança em regras do Firestore/Storage

Sem essas chaves o app ainda roda (cai em dados de exemplo / mapa vazio), então não é bloqueante
para começar a mexer no visual ou nos fluxos.
