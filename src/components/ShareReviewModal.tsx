import { useState, useRef, useEffect } from 'react';
import { X, Download, Share2, Copy, Sparkles, Check, RefreshCw, Wand2, Image as ImageIcon } from 'lucide-react';
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

  // Renderiza o card social no Canvas de alta resolução (1080 x 1350 px)
  const renderizarCard = async (fundoUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // 1. Fundo Escuro com Gradiente Nobre
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#14110E');
    bgGrad.addColorStop(0.5, '#0F0D0B');
    bgGrad.addColorStop(1, '#080706');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Efeito de iluminação âmbar sutil no topo
    const glow = ctx.createRadialGradient(width / 2, 0, 10, width / 2, 0, 600);
    glow.addColorStop(0, 'rgba(245, 165, 36, 0.18)');
    glow.addColorStop(1, 'rgba(245, 165, 36, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // 2. Header do Card: Logo "Vimo" + "DIÁRIO GASTRONÔMICO"
    ctx.fillStyle = 'var(--star)';
    ctx.font = 'bold 44px Fraunces, serif';
    ctx.fillText('Vimo', 70, 95);

    ctx.fillStyle = '#A39A8B';
    ctx.font = 'bold 15px "DM Sans", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('DIÁRIO GASTRONÔMICO', 205, 90);
    ctx.letterSpacing = '0px';

    // Linha divisória superior
    ctx.strokeStyle = '#2E2821';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, 125);
    ctx.lineTo(width - 70, 125);
    ctx.stroke();

    // 3. Imagem do Estabelecimento / Arte da IA (Pôster 940 x 520 px)
    const imgX = 70;
    const imgY = 160;
    const imgW = 940;
    const imgH = 500;
    const radius = 32;

    // Desenhar container arredondado
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, radius);
    ctx.clip();

    // Carregar e desenhar a imagem
    if (fundoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => {
            // Em caso de falha de CORS da imagem original, usamos fallback gráfico
            resolve(null);
          };
          img.src = fundoUrl;
        });

        if (img.width > 0) {
          // Cover crop
          const scale = Math.max(imgW / img.width, imgH / img.height);
          const nw = img.width * scale;
          const nh = img.height * scale;
          const nx = imgX + (imgW - nw) / 2;
          const ny = imgY + (imgH - nh) / 2;
          ctx.drawImage(img, nx, ny, nw, nh);
        } else {
          desenharFundoAbstrato(ctx, imgX, imgY, imgW, imgH, review.placeName);
        }
      } catch {
        desenharFundoAbstrato(ctx, imgX, imgY, imgW, imgH, review.placeName);
      }
    } else {
      desenharFundoAbstrato(ctx, imgX, imgY, imgW, imgH, review.placeName);
    }

    // Gradiente escuro sobreposto para legibilidade do texto
    const overlayGrad = ctx.createLinearGradient(0, imgY + imgH * 0.4, 0, imgY + imgH);
    overlayGrad.addColorStop(0, 'rgba(0,0,0,0)');
    overlayGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(imgX, imgY, imgW, imgH);

    ctx.restore();

    // Selo de Nota Geral sobreposto à foto (topo direito)
    const badgeW = 150;
    const badgeH = 56;
    const badgeX = imgX + imgW - badgeW - 20;
    const badgeY = imgY + 20;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 13, 11, 0.88)';
    ctx.strokeStyle = 'var(--star)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'var(--star)';
    ctx.font = 'bold 30px Fraunces, serif';
    ctx.fillText(`★ ${review.overall.toFixed(1).replace('.', ',')}`, badgeX + 22, badgeY + 40);
    ctx.restore();

    // 4. Seção do Estabelecimento
    ctx.fillStyle = '#F5EFE6';
    ctx.font = 'bold 46px Fraunces, serif';
    ctx.fillText(review.placeName, 70, 720);

    ctx.fillStyle = '#A39A8B';
    ctx.font = '500 22px "DM Sans", sans-serif';
    ctx.fillText(`${review.cityName} · Visitado por ${review.authorName}`, 70, 760);

    // 5. Citação da Review (Itálico Fraunces)
    ctx.fillStyle = '#DDD3C4';
    ctx.font = 'italic 30px Fraunces, serif';
    const quote = `“${review.text}”`;
    wrapText(ctx, quote, 70, 825, 940, 44, 3);

    // 6. Barras dos 4 Critérios (Ambiente, Comida, Atendimento, Custo-benefício)
    const criterios = [
      { label: 'Ambiente', val: review.ratings?.ambiente || review.overall },
      { label: 'Comida', val: review.ratings?.comida || review.overall },
      { label: 'Atendimento', val: review.ratings?.atendimento || review.overall },
      { label: 'Custo-benefício', val: review.ratings?.custoBeneficio || review.overall },
    ];

    const gridY = 980;
    const colW = 445;
    criterios.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 70 + col * (colW + 50);
      const cy = gridY + row * 80;

      ctx.fillStyle = '#F5EFE6';
      ctx.font = '600 20px "DM Sans", sans-serif';
      ctx.fillText(c.label, cx, cy);

      ctx.fillStyle = 'var(--star)';
      ctx.font = 'bold 20px "DM Sans", sans-serif';
      ctx.fillText(c.val.toFixed(1).replace('.', ','), cx + colW - 40, cy);

      // Barra de progresso de fundo
      ctx.fillStyle = '#231F1A';
      ctx.beginPath();
      ctx.roundRect(cx, cy + 12, colW, 10, 5);
      ctx.fill();

      // Barra de progresso preenchida em âmbar
      const pct = (c.val / 5) * colW;
      ctx.fillStyle = 'var(--star)';
      ctx.beginPath();
      ctx.roundRect(cx, cy + 12, pct, 10, 5);
      ctx.fill();
    });

    // 7. Footer: Autor + Selo de autenticidade Garfo
    const footY = 1240;
    ctx.strokeStyle = '#2E2821';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, footY - 35);
    ctx.lineTo(width - 70, footY - 35);
    ctx.stroke();

    // Avatar do Autor (redondo)
    ctx.save();
    ctx.beginPath();
    ctx.arc(105, footY + 5, 32, 0, Math.PI * 2);
    ctx.clip();
    try {
      const avatarImg = new Image();
      avatarImg.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        avatarImg.onload = resolve;
        avatarImg.onerror = resolve;
        avatarImg.src = review.authorPhoto;
      });
      if (avatarImg.width > 0) {
        ctx.drawImage(avatarImg, 73, footY - 27, 64, 64);
      } else {
        ctx.fillStyle = 'var(--star)';
        ctx.fill();
      }
    } catch {
      ctx.fillStyle = 'var(--star)';
      ctx.fill();
    }
    ctx.restore();

    // Anel âmbar no avatar
    ctx.strokeStyle = 'var(--star)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(105, footY + 5, 33, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#F5EFE6';
    ctx.font = 'bold 22px "DM Sans", sans-serif';
    ctx.fillText(review.authorName, 155, footY - 2);

    ctx.fillStyle = '#A39A8B';
    ctx.font = '500 18px "DM Sans", sans-serif';
    ctx.fillText(`${review.authorHandle} no Vimo`, 155, footY + 24);

    // Selo "vimo.app"
    ctx.fillStyle = '#A39A8B';
    ctx.font = '600 18px "DM Sans", sans-serif';
    ctx.fillText('vimo.app', width - 165, footY + 12);

    // Salvar dataURL para download
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

  // Fallback artístico com CSS/Canvas para quando não há foto
  function desenharFundoAbstrato(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    nome: string
  ) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#2D1B11');
    grad.addColorStop(0.5, '#422415');
    grad.addColorStop(1, '#1A120B');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Prato artístico estilizado
    ctx.strokeStyle = 'rgba(245, 165, 36, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 140, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 165, 36, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 90, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'var(--star)';
    ctx.font = 'bold 36px Fraunces, serif';
    ctx.textAlign = 'center';
    ctx.fillText(nome, x + w / 2, y + h / 2 + 12);
    ctx.textAlign = 'left';
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-line bg-s1 p-5 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              Compartilhar Avaliação
            </h3>
            <p className="text-xs text-muted">
              Card social personalizado no estilo Letterboxd
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-s2 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notificação Flutuante de Status */}
        {statusMsg && (
          <div className="rounded-2xl bg-accent/20 border border-accent/40 p-2.5 text-xs text-accent font-medium flex items-center gap-2">
            <Sparkles size={15} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Pré-visualização do Card Social */}
        <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden border border-line bg-black shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="h-full w-full object-contain"
          />

          {gerandoIA && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="font-display text-sm text-accent">
                Gerando arte com IA...
              </p>
            </div>
          )}
        </div>

        {/* Personalização com API de Imagens Gemini */}
        <div className="rounded-2xl border border-line bg-s2/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Wand2 size={14} className="text-accent" />
              Estilo da Arte com IA (Gemini)
            </span>
            <span className="text-[12px] uppercase font-bold text-accent px-1.5 py-0.5 rounded bg-accent/15">
              Social Card
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
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
                className={`py-1.5 px-2 rounded-xl font-medium transition ${
                  estiloIA === st.id
                    ? 'bg-accent text-bg font-bold shadow'
                    : 'bg-s1 text-muted hover:text-ink border border-line'
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
            className="w-full py-2.5 rounded-xl border border-accent/40 bg-accent/15 text-accent text-xs font-bold flex items-center justify-center gap-2 hover:bg-accent hover:text-bg transition disabled:opacity-50"
          >
            {gerandoIA ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            <span>Gerar Fundo Personalizado com IA</span>
          </button>
        </div>

        {/* Botões de Ação Principal: Baixar, Compartilhar, Copiar */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="py-3 rounded-2xl bg-accent text-bg text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-accent/20 hover:brightness-110 active:scale-95 transition"
          >
            <Download size={16} />
            <span>Salvar</span>
          </button>

          <button
            type="button"
            onClick={handleCompartilhar}
            className="py-3 rounded-2xl border border-line bg-s2 text-ink text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-accent transition active:scale-95"
          >
            {compartilhado ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
            <span>Postar</span>
          </button>

          <button
            type="button"
            onClick={handleCopiarImagem}
            className="py-3 rounded-2xl border border-line bg-s2 text-ink text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-accent transition active:scale-95"
          >
            {copiado ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            <span>Copiar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
