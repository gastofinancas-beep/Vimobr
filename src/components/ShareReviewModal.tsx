import { useState, useRef, useEffect } from 'react';
import { X, Download, Share2, Copy, Check, RefreshCw, Wand2, Image as ImageIcon } from 'lucide-react';
import { useEscape } from '../hooks/useEscape';
import type { Review } from '../types';
import { photoUrl } from '../lib/places';

export default function ShareReviewModal({
  review,
  onClose,
}: {
  review: Review;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagemGeradaUrl, setImagemGeradaUrl] = useState<string | null>(null);
  const [estiloIA, setEstiloIA] = useState<'editorial' | 'watercolor' | 'vintage' | 'neon_night'>('editorial');
  const [gerandoIA, setGerandoIA] = useState(false);
  const [fotoFundoUrl, setFotoFundoUrl] = useState<string>(
    review.photos?.[0] || review.placePhotoUrl || photoUrl(review.placePhotoName, 800) || ''
  );
  const [copiado, setCopiado] = useState(false);
  const [compartilhado, setCompartilhado] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  useEscape(onClose);

  // Renderiza o card social no Canvas (1080 x 1350 px) — estilo poster cinemático.
  // Canvas não entende variáveis CSS: cores ficam em constantes.
  const COR = {
    fundo: '#101116',
    branco: '#FFFFFF',
    creme: '#F8F7F4',
    tinta: '#101116',
    suave: 'rgba(248,247,244,0.55)',
    azul: '#124BFF',
    azulClaro: 'rgba(18,75,255,0.18)',
  };
  const FONTE = 'Inter, ui-sans-serif, system-ui, sans-serif';
  const FONTE_BOLD = `Plus Jakarta Sans, ${FONTE}`;

  const carregarImagem = (src: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const renderizarCard = async (fundoUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try { await document.fonts?.ready; } catch {}

    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;
    const M = 72;

    // 1. Fundo escuro base
    ctx.fillStyle = COR.fundo;
    ctx.fillRect(0, 0, W, H);

    // 2. Foto full-bleed com gradient overlay — ou fundo abstrato
    const foto = await carregarImagem(fundoUrl);
    if (foto) {
      const esc = Math.max(W / foto.width, H / foto.height);
      const nw = foto.width * esc;
      const nh = foto.height * esc;
      ctx.drawImage(foto, (W - nw) / 2, (H - nh) / 2, nw, nh);
    } else {
      desenharFundoAbstrato(ctx, 0, 0, W, H, review.placeName);
    }

    // 3. Gradiente escuro sobre a foto (do topo e forte embaixo)
    const gradTop = ctx.createLinearGradient(0, 0, 0, 420);
    gradTop.addColorStop(0, 'rgba(16,17,22,0.72)');
    gradTop.addColorStop(1, 'rgba(16,17,22,0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, W, 420);

    const gradBot = ctx.createLinearGradient(0, H - 660, 0, H);
    gradBot.addColorStop(0, 'rgba(16,17,22,0)');
    gradBot.addColorStop(0.28, 'rgba(16,17,22,0.82)');
    gradBot.addColorStop(1, 'rgba(16,17,22,0.98)');
    ctx.fillStyle = gradBot;
    ctx.fillRect(0, H - 660, W, 660);

    // 4. Logo VIMO (versão clara) no canto superior esquerdo
    const logo = await carregarImagem('/brand/vimo-logo-claro.png');
    if (logo) {
      const logoH = 38;
      const logoW = Math.round(logoH * logo.width / logo.height);
      ctx.drawImage(logo, M, 64, logoW, logoH);
    } else {
      ctx.fillStyle = COR.branco;
      ctx.font = `800 36px ${FONTE_BOLD}`;
      ctx.fillText('VIMO', M, 96);
    }

    // 5. Data no canto superior direito
    const dataAvaliacao = review.visitedAt
      ? new Date(review.visitedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';
    if (dataAvaliacao) {
      ctx.fillStyle = COR.suave;
      ctx.font = `500 26px ${FONTE}`;
      ctx.textAlign = 'right';
      ctx.fillText(dataAvaliacao, W - M, 96);
      ctx.textAlign = 'left';
    }

    // 6. Grande nota hero — círculo branco no centro-alto
    const notaTxt = review.overall.toFixed(1).replace('.', ',');
    const heroX = W / 2;
    const heroY = 210;
    const heroR = 96;
    ctx.save();
    ctx.shadowColor = 'rgba(18,75,255,0.4)';
    ctx.shadowBlur = 48;
    ctx.fillStyle = COR.branco;
    ctx.beginPath();
    ctx.arc(heroX, heroY, heroR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Estrela acima
    ctx.fillStyle = COR.azul;
    ctx.font = `700 34px ${FONTE}`;
    ctx.textAlign = 'center';
    ctx.fillText('★', heroX, heroY - 16);
    // Nota grande
    ctx.fillStyle = COR.tinta;
    ctx.font = `800 56px ${FONTE_BOLD}`;
    ctx.fillText(notaTxt, heroX, heroY + 38);
    ctx.textAlign = 'left';

    // 7. Nome do lugar — grande, branco, baixo
    ctx.fillStyle = COR.branco;
    ctx.font = `800 76px ${FONTE_BOLD}`;
    wrapText(ctx, review.placeName, M, 788, W - 2 * M, 86, 2);

    // Cidade
    const cidade = review.cityName?.replace(/\s*-\s*[A-Z]{2}$/, '') || '';
    if (cidade) {
      ctx.fillStyle = COR.suave;
      ctx.font = `500 30px ${FONTE}`;
      ctx.fillText(cidade.toUpperCase(), M, 856);
    }

    // 8. Critérios como pills horizontais compactos
    const criterios = [
      { label: 'Comida', val: review.ratings?.comida ?? review.overall },
      { label: 'Ambiente', val: review.ratings?.ambiente ?? review.overall },
      { label: 'Serviço', val: review.ratings?.atendimento ?? review.overall },
      { label: 'Custo', val: review.ratings?.custoBeneficio ?? review.overall },
    ];
    let pillX = M;
    const pillY = 904;
    const pillH = 52;
    const pillGap = 16;
    for (const c of criterios) {
      const label = `${c.label}  ${c.val.toFixed(1).replace('.', ',')}`;
      ctx.font = `600 26px ${FONTE}`;
      const tw = ctx.measureText(label).width;
      const pw = tw + 36;
      // Pill glass
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pw, pillH, pillH / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COR.branco;
      ctx.fillText(label, pillX + 18, pillY + 34);
      pillX += pw + pillGap;
    }

    // 9. Trecho da avaliação
    if (review.text) {
      ctx.fillStyle = 'rgba(248,247,244,0.75)';
      ctx.font = `400 italic 32px ${FONTE}`;
      wrapText(ctx, `”${review.text}”`, M, 1020, W - 2 * M, 46, 3);
    }

    // 10. Rodapé: linha divisória + avatar + nome
    const footY = 1260;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(M, footY - 30);
    ctx.lineTo(W - M, footY - 30);
    ctx.stroke();

    // Avatar circular
    const avatarR = 34;
    const avatarCX = M + avatarR;
    const avatarCY = footY + 6;
    const avatar = await carregarImagem(review.authorPhoto);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    if (avatar) {
      ctx.drawImage(avatar, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    } else {
      ctx.fillStyle = COR.azul;
      ctx.fill();
      ctx.fillStyle = COR.branco;
      ctx.font = `700 28px ${FONTE_BOLD}`;
      ctx.textAlign = 'center';
      ctx.fillText((review.authorName || '?').charAt(0).toUpperCase(), avatarCX, avatarCY + 10);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Borda no avatar
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarR + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Nome e handle
    ctx.fillStyle = COR.branco;
    ctx.font = `700 28px ${FONTE_BOLD}`;
    ctx.fillText(review.authorName, M + avatarR * 2 + 20, footY - 2);
    ctx.fillStyle = COR.suave;
    ctx.font = `500 24px ${FONTE}`;
    ctx.fillText(`${review.authorHandle} · vimo.app`, M + avatarR * 2 + 20, footY + 28);

    // Mascote pequeno no canto inferior direito
    const mascote = await carregarImagem('/mascote/confiante.png');
    if (mascote) {
      const mH = 100;
      const mW = Math.round(mH * mascote.width / mascote.height);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(mascote, W - M - mW, footY - mH / 2 + 8, mW, mH);
      ctx.globalAlpha = 1;
    }

    setImagemGeradaUrl(canvas.toDataURL('image/png'));
  };

  useEffect(() => {
    renderizarCard(fotoFundoUrl);
  }, [fotoFundoUrl]);

  // Função auxiliar para quebrar texto em múltiplas linhas
  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
  ) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        if (linesDrawn === maxLines - 1) {
          ctx.fillText(line.trim() + '...', x, currentY);
          return;
        }
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
        linesDrawn++;
      } else {
        line = testLine;
      }
    }
    if (linesDrawn < maxLines) {
      ctx.fillText(line, x, currentY);
    }
  }

  // Fundo abstrato cinemático quando não há foto
  function desenharFundoAbstrato(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    _nome: string
  ) {
    // Base escura
    ctx.fillStyle = '#0A0B10';
    ctx.fillRect(x, y, w, h);

    // Blob azul grande, difuso — topo direito
    const grad1 = ctx.createRadialGradient(x + w * 0.78, y + h * 0.22, 0, x + w * 0.78, y + h * 0.22, w * 0.55);
    grad1.addColorStop(0, 'rgba(18,75,255,0.55)');
    grad1.addColorStop(1, 'rgba(18,75,255,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(x, y, w, h);

    // Segundo blob menor, esverdeado — esquerdo baixo (complementar)
    const grad2 = ctx.createRadialGradient(x + w * 0.15, y + h * 0.72, 0, x + w * 0.15, y + h * 0.72, w * 0.4);
    grad2.addColorStop(0, 'rgba(0,180,120,0.22)');
    grad2.addColorStop(1, 'rgba(0,180,120,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(x, y, w, h);

    // Grade sutil de linhas
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const step = 80;
    for (let gx = x; gx <= x + w; gx += step) {
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    }
    for (let gy = y; gy <= y + h; gy += step) {
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
    }
  }


  // Gera imagem personalizada usando a API Gemini
  const handleGerarComIA = async () => {
    setGerandoIA(true);
    setStatusMsg('Gerando arte personalizada com a API Gemini...');

    try {
      const res = await fetch('/api/generate-social-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName: review.placeName,
          authorName: review.authorName,
          text: review.text,
          rating: review.overall,
          style: estiloIA,
          tipo: 'gastronomia',
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setFotoFundoUrl(data.imageUrl);
        setStatusMsg('Imagem pronta');
      } else {
        setStatusMsg(data.message || 'Personalizando com estilo gráfico...');
        renderizarCard(fotoFundoUrl);
      }
    } catch (err: any) {
      console.warn('Erro ao chamar API de imagem:', err);
      setStatusMsg('Modo gráfico otimizado aplicado.');
      renderizarCard(fotoFundoUrl);
    } finally {
      setGerandoIA(false);
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  // 1. Download do Arquivo PNG
  const handleDownload = () => {
    if (!imagemGeradaUrl) return;
    const link = document.createElement('a');
    link.download = `garfo-review-${review.placeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
    link.href = imagemGeradaUrl;
    link.click();
    setStatusMsg('Imagem baixada');
    setTimeout(() => setStatusMsg(null), 2500);
  };

  // 2. Compartilhar nativo (Web Share API)
  const handleCompartilhar = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `vimo-avaliacao.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Avaliação de ${review.placeName} no VIMO`,
            text: `Confira minha avaliação de ${review.placeName}: ${review.overall.toFixed(1)} no VIMO`,
            files: [file],
          });
          setCompartilhado(true);
        } else if (navigator.share) {
          await navigator.share({
            title: `Avaliação de ${review.placeName} no VIMO`,
            text: `“${review.text}” — ${review.overall.toFixed(1)} no VIMO!\n${window.location.origin}`,
          });
          setCompartilhado(true);
        } else {
          // Fallback para download
          handleDownload();
        }
      }, 'image/png');
    } catch (err) {
      console.warn('Compartilhamento cancelado ou não suportado:', err);
    }
  };

  // 3. Copiar para a área de transferência
  const handleCopiarImagem = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopiado(true);
          setStatusMsg('Imagem copiada');
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          try {
            await navigator.clipboard.writeText(
              `“${review.text}” — Avaliação de ${review.placeName} no VIMO: ${review.overall.toFixed(1)}\n${window.location.href}`
            );
            setCopiado(true);
            setStatusMsg('Texto copiado');
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            setStatusMsg('Não foi possível copiar');
          }
        }
      });
    } catch {
      setStatusMsg('Não foi possível copiar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-compartilhar"
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-s1 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-2xl flex flex-col gap-4 max-h-[94dvh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-9 shrink-0 rounded-full bg-s3 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="titulo-compartilhar" className="t-title text-ink">Compartilhar avaliação</h3>
            <p className="text-sm text-muted">Um cartão pronto para os stories e as conversas.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-s2 hover:text-ink transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {statusMsg && (
          <div role="status" className="rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary">
            {statusMsg}
          </div>
        )}

        {/* Pré-visualização do cartão */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-s2 ring-1 ring-line">
          <canvas ref={canvasRef} className="h-full w-full object-contain" />
          {gerandoIA && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-s1/85">
              <RefreshCw size={22} className="animate-spin text-primary" />
              <p className="text-sm font-medium text-ink">Gerando o fundo…</p>
            </div>
          )}
        </div>

        {/* Fundo gerado com IA (opcional) */}
        <div className="space-y-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Wand2 size={15} className="text-primary" />
            Fundo com IA
          </span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'editorial', label: 'Editorial' },
              { id: 'watercolor', label: 'Aquarela' },
              { id: 'vintage', label: 'Retrô 35mm' },
              { id: 'neon_night', label: 'Noturno' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setEstiloIA(st.id as any)}
                aria-pressed={estiloIA === st.id}
                className={`h-9 shrink-0 rounded-full px-4 text-sm transition-colors cursor-pointer ${
                  estiloIA === st.id ? 'bg-primary text-on-primary font-semibold' : 'bg-s2 text-ink-2 hover:text-ink'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={gerandoIA}
            onClick={handleGerarComIA}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-s2 text-sm font-semibold text-ink hover:bg-s3 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {gerandoIA ? <RefreshCw size={15} className="animate-spin" /> : <ImageIcon size={15} />}
            Gerar fundo
          </button>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-cta text-sm font-semibold text-on-cta transition active:scale-95 hover:opacity-90 cursor-pointer"
          >
            <Download size={17} />
            Salvar
          </button>
          <button
            type="button"
            onClick={handleCompartilhar}
            className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-s1 text-sm font-semibold text-ink ring-1 ring-inset ring-line transition active:scale-95 hover:bg-s2 cursor-pointer"
          >
            {compartilhado ? <Check size={17} className="text-success" /> : <Share2 size={17} />}
            Postar
          </button>
          <button
            type="button"
            onClick={handleCopiarImagem}
            className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-s1 text-sm font-semibold text-ink ring-1 ring-inset ring-line transition active:scale-95 hover:bg-s2 cursor-pointer"
          >
            {copiado ? <Check size={17} className="text-success" /> : <Copy size={17} />}
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
}
