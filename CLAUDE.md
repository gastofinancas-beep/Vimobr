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
- `recharts` (gráfico de Paladar), `motion` (animações). Sem mapa e sem Google Places: a busca
  de lugares usa dados locais e OpenStreetMap (`sugerirLugares`); `getApiKey` em places.ts
  devolve vazio de propósito para nunca gerar cobrança
- Server leve em `server.ts` (Express): serve o build e faz a ponte com a **Yelp Places API**
  (`/api/lugares/perto` e `/api/lugares/yelp/:id`). A chave `YELP_API_KEY` fica só no servidor;
  respostas guardadas 24 h e teto diário `YELP_LIMITE_DIARIO` (padrão 250). Sem chave, ou quando o
  teto acaba, o Descobrir cai no OpenStreetMap. No app empacotado, `VITE_API_BASE` aponta para o
  servidor. A Yelp exige o link "Dados e fotos do Yelp" no detalhe do lugar

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
- `ExplorarScreen` — tela inicial: feed social estilo Fitfolio (abas Explorar / Seguindo), posts
  com carrossel de fotos, curtidas, comentários e "Veja a avaliação". Carrega 20 por página e busca
  mais ao rolar (`carregarPaginaPosts` em posts.ts).
- `DescobrirScreen` — catálogo de lugares da cidade. Na primeira visita pede a localização do
  celular (`navigator.geolocation`), acha a cidade pelo Nominatim e lista restaurantes, cafés,
  padarias e bares num raio de 5 km pelo Overpass (OpenStreetMap, grátis), do mais perto ao mais
  longe ("Perto de você"). Sem GPS: aviso com "Escolher cidade" e busca de cidades. Lógica em
  `src/lib/localizacao.ts`; cidade em `vimo_cidade_v1`, lugares guardados por 24 h. O detalhe do lugar mostra o bloco Informações (serviços, endereço, horário com aberto/fechado, telefone, site, Instagram) com o que o OSM tiver, e usa a foto mais recente das avaliações como capa quando o lugar não tem foto. Google Places foi avaliado em 2026-10-23: a cota grátis com nota e fotos é ~1.000 consultas/mês, não aguenta o app; fica para quando houver receita. Lugares do OSM
  não têm nota, preço nem foto inventados. **Nenhuma nota aparece na listagem** — só ao abrir o lugar.
  Ao gerar os projetos nativos (Capacitor), incluir `NSLocationWhenInUseUsageDescription` no iOS e
  `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` no Android, senão o pedido de GPS não aparece.
- `ComunidadeScreen` — aba Comunidade: Clubes (meus clubes, destaque do mês, populares, ranking do
  mês, públicos, privados com código de convite) e Eventos (idas marcadas com o clube). Detalhe do
  clube em `ClubeScreen` no formato Fitfolio: foto, "Você é membro", atalhos Membros / Ranking /
  Eventos / Regras, mini pódio, Host, Membros, Sobre e botão flutuante Convidar. Criar/editar
  clube (`CriarClubeModal`, engrenagem só para o criador): foto, local, descrição, privacidade,
  sistema de pontuação e tags; na edição o criador também pode excluir o clube, e na lista de
  Membros pode remover pessoas. Pontuação do ranking interno: Mais idas, Lugares diferentes ou Dias
  ativos (`PONTUACOES` em clubes.ts). Ranking em `RankingClubeScreen` (Mensal/Geral, pódio com o
  mascote, demais posições). O ranking entre clubes continua por idas no mês. Clube **não tem feed
  próprio**: post para o clube aparece no feed principal só para membros, com a tag do clube.
  Dados em `src/lib/clubes.ts` e `src/lib/eventos.ts`.
- `PerfilScreen` — capa + foto, números (idas, seguidores, seguindo), bio, favoritos, abas
  Diário / Paladar / Conquistas; medalhas em destaque só para PRO (ver abaixo)
- `PlaceDetailScreen` — tela única de detalhe do lugar (ações, como chegar, fotos, notas
  Vimo + Google com histograma, amigos que já foram, avaliações)
- `AvaliarModal` — fluxo de avaliar em passo a passo (um critério por tela): Lugar → Data →
  Café & Espresso → Doces & Sobremesas → Comidinhas & Salgados → Ambiente & Conforto →
  Atendimento & Barista → Voltaria & Preço → Prato destaque → Comentário → Fotos → Amigos → Resumo.
  Nota geral é a média dos critérios, arredondada para meia estrela, e só aparece no resumo final.

## Notificações (src/lib/notifications.ts)

Quem age grava em `users/{destinatario}/notificacoes/{id}`; o sino (`NotificationBell`) busca do
servidor ao abrir, a cada minuto e ao voltar para o app (`sincronizarNotificacoes`), e dispara o
aviso do sistema no aparelho de quem recebe. Tipos de clube: `clube_entrou` (avisa o criador),
`clube_evento` (avisa os membros), `clube_removido`, `clube_ultrapassou` (alguém passou você no
ranking do mês, calculado por `avisarUltrapassagens` depois de salvar uma ida). Tocar numa
notificação de clube abre o clube (`abrirClube` → evento `vimo:abrir_clube`).

## Denunciar e bloquear (exigência da Apple e do Google)

`src/lib/moderacao.ts` + `MenuModeracao` (`src/components/Moderacao.tsx`), no "…" de posts,
avaliações e perfis. Denúncia vai para a coleção `denuncias` (só leitura pelo console do Firebase;
os Termos prometem análise em até 24 horas) e esconde o conteúdo para quem denunciou. Bloquear
esconde posts, idas e comentários da pessoa e desfaz o seguir; desbloqueia em Editar perfil.

Barra inferior fixa: Explorar, Descobrir, **+** central (nova avaliação), Comunidade, Perfil.

## Plano PRO

- `src/lib/plano.ts`: `ehPro(user)` → `true` quando `user.plano === 'pro'` no Firestore, ou em
  dev quando `localStorage.vimo_pro_teste === '1'` (query `?pro=1` liga, `?pro=0` desliga, só
  em `import.meta.env.DEV`).
- Ativar PRO de verdade = gravar `plano: 'pro'` no documento `users/{uid}` no Firestore. **Não
  existe cobrança/checkout ainda.**
- Benefícios implementados: vitrine de medalhas em destaque no perfil, selo "PRO" ao lado do nome e
  **mascote PRO** (gralha toda preta, 27 reações em `public/mascote/pro/`). O `App` chama
  `definirMascotePro(ehPro(user))` e todo `<Mascote>` troca de arquivo sozinho (mapa `ARQUIVO_PRO`
  em `Mascote.tsx`); `pro={true}` força a versão PRO (usado na `ProSheet` como vitrine).
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
- Teste com duas contas: `firebase emulators:start --only firestore,auth` (Firestore 8089,
  Auth 9099, com o `firestore.rules` do repo) e `VITE_FIREBASE_EMULADOR=1 npx vite`; o app passa a
  usar os emuladores (só em dev). Dá para abrir dois contextos do Playwright, criar contas por
  e-mail e testar clube, notificações, feed e bloqueio entre as duas.
- Imagens externas (Unsplash) e fontes do Google são bloqueadas na rede de alguns ambientes de
  teste — nesses casos, servir localmente ao rodar testes automatizados (não é um problema do
  app em produção).
- `navigator.clipboard` e `navigator.share` podem falhar silenciosamente (permissão negada) —
  sempre envolver em try/catch com um aviso (`showToast`) de erro, nunca deixar a Promise rejeitar
  sem tratamento.

## Arquivos sem uso

Limpos em 2026-10-23 (40 arquivos, inclusive mapa, Foursquare, `ShareReviewModal` e
`AmigosScreen`). Para conferir de novo, listar o que não é alcançável a partir de `src/main.tsx`
seguindo os imports relativos.

## Decisões já fechadas (não reabrir sem pedir)

- Tema claro é o padrão; escuro é a alternativa.
- Sem notas visíveis nas listagens — só dentro do lugar.
- Login: Google + e-mail/senha; modo convidado existe para teste.
- Nota geral = média dos critérios, meia estrela, sem tela própria — calculada no resumo.
- Barra inferior com 5 posições fixas (Explorar, Descobrir, +, Comunidade, Perfil) — não adicionar
  aba nova sem conversar antes. "Amigos" virou "Comunidade" em 2026-10-22, a pedido do Pedro.
- Clube privado: o código fica em `clubeConvites/{id}` (só membros leem); quem entra grava
  `clubeConvites/{id}/usos/{uid}` no mesmo lote, e a regra confere o código.
- Regras de segurança do Firestore: o `firestore.rules` do repositório está à frente do que foi
  publicado no console. Pedro pediu para não publicar ainda (2026-10-23) porque as regras vão mudar.
  Pendentes: clubes/eventos/posts, `notificacoes`, `bloqueados`, `denuncias`, exclusão de convite.
  Curtidas, comentários e contadores usam só regras (+1/-1), sem Cloud Functions.
- Nenhuma API paga, com uma exceção pedida pelo Pedro em 2026-10-23: Yelp no Descobrir, com teto
  diário no servidor. Google Places, Maps e Mapbox continuam fora. Mapa removido em 2026-10-20.
- PRO ainda não cobra; meio de pagamento depende de decisão do Pedro (lojas exigem compra no app).

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencher as chaves abaixo
npm run dev             # tsx server.ts — serve o app com Vite
npm run lint             # tsc --noEmit — rodar depois de qualquer mudança
npm run build            # vite build — confirmar que builda limpo antes de commitar
```

Variáveis de ambiente usadas pelo projeto (`.env`, nunca commitar):
- `YELP_API_KEY`, `YELP_LIMITE_DIARIO`, `VITE_API_BASE` (ver `.env.example`)
- Chaves do Google Maps/Places, Foursquare e Gemini não são mais usadas pelo app
- Firebase: configurado no client (ver `src/lib/firebase.ts` ou equivalente) — confirmar projeto
  do Firebase correto antes de qualquer mudança em regras do Firestore/Storage

Sem essas chaves o app ainda roda (cai em dados de exemplo / mapa vazio), então não é bloqueante
para começar a mexer no visual ou nos fluxos.
