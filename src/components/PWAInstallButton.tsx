import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/40 px-3 py-1.5 text-xs font-bold text-accent shadow-sm hover:bg-accent hover:text-bg transition"
      >
        <Download size={14} />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full border border-line bg-s1 px-3 py-1.5 text-xs font-medium text-ink hover:bg-s2 transition"
        >
          <Download size={14} className="text-accent" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-line bg-s1 p-6 shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent mb-3">
                <Share2 size={24} />
              </div>
              <h3 className="text-lg font-display text-ink">Instalar Vimo no iPhone / iPad</h3>
              <p className="mt-3 text-xs text-muted leading-relaxed text-left space-y-2">
                1. Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior do Safari.<br />
                2. Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.<br />
                3. Toque em <strong>"Adicionar"</strong> no canto superior direito.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-full bg-accent py-2.5 text-xs font-bold text-bg hover:brightness-110 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
