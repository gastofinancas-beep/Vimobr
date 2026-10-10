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

  // Renderiza o card social no Canvas (1080 x 1350 px) na identidade VIMO.
  // Canvas não entende variáveis CSS: as cores da marca ficam em constantes.
  const COR = {
    fundo: '#F8F7F4',
    cartao: '#FFFFFF',
    tinta: '#101116',
    tinta2: '#3A3B41',
    suave: '#6E6F74',
    azul: '#124BFF',
    linha: '#D9D9D9',
    trilho: '#EEEDEA',
  };
  const FONTE = 'Inter, ui-sans-serif, system-ui, sans-serif';

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
    try {
      await document.fonts?.ready;
    } catch {}

    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    const M = 64; // margem

    // 1. Fundo off-white e cartão branco
    ctx.fillStyle = COR.fundo;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.shadowColor = 'rgba(16,17,22,0.08)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = COR.cartao;
    ctx.beginPath();
    ctx.roundRect(M - 24, 150, width - 2 * (M - 24), height - 150 - 60, 44);
    ctx.fill();
    ctx.restore();

    // 2. Logo oficial + legenda
    const logo = await carregarImagem('/brand/vimo-logo-escuro.png');
    if (logo) ctx.drawImage(logo, M, 52, 170, (170 * logo.height) / logo.width);
    ctx.fillStyle = COR.suave;
    ctx.font = `500 24px ${FONTE}`;
    ctx.textAlign = 'right';
    ctx.fillText('Descubra · Coma · Compartilhe', width - M, 98);
    ctx.textAlign = 'left';

    // 3. Foto do lugar com cantos arredondados
    const imgX = M;
    const imgY = 190;
    const imgW = width - 2 * M;
    const imgH = 540;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 32);
    ctx.clip();
    const foto = await carregarImagem(fundoUrl);
    if (foto) {
      const esc = Math.max(imgW / foto.width, imgH / foto.height);
      const nw = foto.width * esc;
      const nh = foto.height * esc;
      ctx.drawImage(foto, imgX + (imgW - nw) / 2, imgY + (imgH - nh) / 2, nw, nh);
    } else {
      desenharFundoAbstrato(ctx, imgX, imgY, imgW, imgH, review.placeName);
    }
    ctx.restore();

    // Selo de nota (branco, estrela azul), como no app
    const notaTxt = review.overall.toFixed(1).replace('.', ',');
    ctx.font = `700 34px ${FONTE}`;
    const bw = ctx.measureText(notaTxt).width + 92;
    const bx = imgX + imgW - bw - 24;
    const by = imgY + 24;
    ctx.save();
    ctx.shadowColor = 'rgba(16,17,22,0.18)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 64, 32);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COR.azul;
    ctx.font = `700 34px ${FONTE}`;
    ctx.fillText('★', bx + 22, by + 44);
    ctx.fillStyle = COR.tinta;
    ctx.fillText(notaTxt, bx + 62, by + 44);

    // 4. Lugar e quem avaliou
    ctx.fillStyle = COR.tinta;
    ctx.font = `700 52px ${FONTE}`;
    wrapText(ctx, review.placeName, M + 8, 812, imgW - 16, 60, 1);
    ctx.fillStyle = COR.suave;
    ctx.font = `500 26px ${FONTE}`;
    ctx.fillText([review.cityName?.replace(/\s*-\s*[A-Z]{2}$/, ''), `por ${review.authorName}`].filter(Boolean).join(' · '), M + 8, 856);

    // 5. Trecho da avaliação
    if (review.text) {
      ctx.fillStyle = COR.tinta2;
      ctx.font = `400 32px ${FONTE}`;
      wrapText(ctx, `“${review.text}”`, M + 8, 924, imgW - 16, 46, 3);
    }

    // 6. Critérios em barras azuis
    const criterios = [
      { label: 'Comida', val: review.ratings?.comida || review.overall },
      { label: 'Ambiente', val: review.ratings?.ambiente || review.overall },
      { label: 'Atendimento', val: review.ratings?.atendimento || review.overall },
      { label: 'Custo-benefício', val: review.ratings?.custoBeneficio || review.overall },
    ];
    const gridY = 1080;
    const colW = (imgW - 16 - 48) / 2;
    criterios.forEach((c, i) => {
      const cx = M + 8 + (i % 2) * (colW + 48);
      const cy = gridY + Math.floor(i / 2) * 78;
      ctx.fillStyle = COR.tinta2;
      ctx.font = `600 24px ${FONTE}`;
      ctx.fillText(c.label, cx, cy);
      ctx.fillStyle = COR.tinta;
      ctx.font = `700 24px ${FONTE}`;
      ctx.textAlign = 'right';
      ctx.fillText(c.val.toFixed(1).replace('.', ','), cx + colW, cy);
      ctx.textAlign = 'left';
      ctx.fillStyle = COR.trilho;
      ctx.beginPath();
      ctx.roundRect(cx, cy + 14, colW, 10, 5);
      ctx.fill();
      ctx.fillStyle = COR.azul;
      ctx.beginPath();
      ctx.roundRect(cx, cy + 14, Math.max(10, (c.val / 5) * colW), 10, 5);
      ctx.fill();
    });

    // 7. Rodapé: autor e o mascote avaliando
    const footY = 1238;
    const avatar = await carregarImagem(review.authorPhoto);
    ctx.save();
    ctx.beginPath();
    ctx.arc(M + 40, footY, 32, 0, Math.PI * 2);
    ctx.clip();
    if (avatar) {
      ctx.drawImage(avatar, M + 8, footY - 32, 64, 64);
    } else {
      ctx.fillStyle = COR.trilho;
      ctx.fill();
      ctx.fillStyle = COR.tinta2;
      ctx.font = `700 28px ${FONTE}`;
      ctx.textAlign = 'center';
      ctx.fillText((review.authorName || '?').charAt(0).toUpperCase(), M + 40, footY + 10);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    ctx.fillStyle = COR.tinta;
    ctx.font = `700 26px ${FONTE}`;
    ctx.fillText(review.authorName, M + 88, footY - 4);
    ctx.fillStyle = COR.suave;
    ctx.font = `500 22px ${FONTE}`;
    ctx.fillText(`${review.authorHandle} no VIMO`, M + 88, footY + 26);

    const mascote = await carregarImagem('/mascote/avaliando.png');
    if (mascote) ctx.drawImage(mascote, width - M - 120, footY - 92, 128, 128);

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

  // Lugar sem foto: bloco na cor da marca com o nome
  function desenharFundoAbstrato(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    nome: string
  ) {
    ctx.fillStyle = '#101116';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#124BFF';
    ctx.beginPath();
    ctx.arc(x + w - 120, y + 110, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F8F7F4';
    ctx.font = `700 48px ${FONTE}`;
    wrapText(ctx, nome, x + 48, y + h - 60, w - 96, 56, 2);
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
        setStatusMsg('Arte gastronômica gerada com sucesso pela IA!');
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
    setStatusMsg('Imagem baixada com sucesso!');
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
            text: `Confira minha avaliação de ${review.placeName}: ${review.overall.toFixed(1)} no VIMO!`,
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
          setStatusMsg('Card copiado para a área de transferência!');
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          await navigator.clipboard.writeText(
            `“${review.text}” — Avaliação de ${review.placeName} no VIMO: ${review.overall.toFixed(1)}!\n${window.location.href}`
          );
          setCopiado(true);
          setStatusMsg('Texto da avaliação copiado!');
          setTimeout(() => setCopiado(false), 2500);
        }
      });
    } catch {
      setStatusMsg('Não foi possível copiar imagem diretamente.');
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
