import React, { useState } from 'react';
import { X, Send, Share2, Copy, Check, Calendar, MessageSquare, User, Sparkles, MapPin, Star, UtensilsCrossed } from 'lucide-react';
import type { Place, UserProfile } from '../types';
import PlacePlaceholder from './PlacePlaceholder';

const SUGESTOES_MENSAGEM = [
  'Bora conhecer esse lugar juntos?',
  'Bora jantar?',
  'Café e papo furado, topo?',
  'Happy hour pra comemorar',
  'Dizem que a comida aqui é surreal. Vamos?',
];

export default function ConviteModal({
  place,
  currentUser,
  onClose,
}: {
  place: Place;
  currentUser: UserProfile;
  onClose: () => void;
}) {
  const [dataHora, setDataHora] = useState(() => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dia = amanha.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return `${dia} às 20:00`;
  });

  const [mensagemCustom, setMensagemCustom] = useState(SUGESTOES_MENSAGEM[0]);
  const [nomeConvidado, setNomeConvidado] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [compartilhado, setCompartilhado] = useState(false);

  const foto = place.photoUrl || (place.photoName ? `https://places.googleapis.com/v1/${place.photoName}/media?maxWidthPx=600&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_KEY}` : undefined);

  const textoMensagem = `*Convite Gastronômico de ${currentUser.displayName}* ${nomeConvidado ? `para ${nomeConvidado}` : ''}!

Bora no *${place.name}*?
• Data & Horário: ${dataHora}
• Endereço: ${place.address}
• Mensagem: "${mensagemCustom}"

Avaliação no VIMO: ${place.rating ? place.rating.toFixed(1).replace('.', ',') : '4.8'} / 5,0

Bora? Confirma comigo!`;

  const handleCompartilharNativo = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Convite Gastronômico: ${place.name}`,
          text: textoMensagem,
          url: window.location.href,
        });
        setCompartilhado(true);
        setTimeout(() => setCompartilhado(false), 3000);
      } catch (err) {
        console.log('Compartilhamento cancelado:', err);
      }
    } else {
      handleCopiarTexto();
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(textoMensagem)}`;
    window.open(url, '_blank');
  };

  const handleCopiarTexto = () => {
    navigator.clipboard.writeText(textoMensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-s1 border border-line rounded-3xl p-5 shadow-2xl space-y-5 no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center text-accent">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-ink leading-tight">
                Convite Gastronômico
              </h3>
              <p className="text-xs text-muted">Crie um card personalizado e convide amigos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted hover:text-ink hover:bg-s2 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form de Ajustes */}
        <div className="space-y-3">
          {/* Para quem */}
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
              Nome do Convidado (Opcional)
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-3 text-muted" />
              <input
                type="text"
                value={nomeConvidado}
                onChange={(e) => setNomeConvidado(e.target.value)}
                placeholder="Ex: Carol, Galera da firma, Pessoal..."
                className="w-full h-10 rounded-xl border border-line bg-s2/80 pl-10 pr-3 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Data e Horário */}
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
              Data & Horário do Encontro
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3.5 top-3 text-muted" />
              <input
                type="text"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                placeholder="Ex: Sexta-feira às 20:00"
                className="w-full h-10 rounded-xl border border-line bg-s2/80 pl-10 pr-3 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Mensagem Personalizada */}
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
              Mensagem ou Recado
            </label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
              {SUGESTOES_MENSAGEM.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setMensagemCustom(sug)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium shrink-0 transition ${
                    mensagemCustom === sug
                      ? 'bg-accent text-bg font-bold shadow-md shadow-accent/20'
                      : 'bg-s2 border border-line/60 text-muted hover:text-ink'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
            <textarea
              value={mensagemCustom}
              onChange={(e) => setMensagemCustom(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-line bg-s2/80 p-3 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* PREVIEW DO CARD VISUAL */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            Pré-visualização do Card
          </span>

          <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-[#1C1814] via-[#141210] to-[#0D0B0A] p-4 text-ink shadow-2xl space-y-3.5">
            {/* Top Bar do Card */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-accent/60"
                />
                <div>
                  <span className="text-[11px] font-bold text-ink block leading-tight">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[12px] text-accent font-semibold uppercase tracking-wider">
                    {nomeConvidado ? `Convida ${nomeConvidado}` : 'Te convidou'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-accent/20 border border-accent/40 px-2 py-0.5 rounded-full text-[12px] font-bold text-accent">
                <UtensilsCrossed size={11} />
                <span>Vimo Convite</span>
              </div>
            </div>

            {/* Imagem do Lugar com Overlay */}
            <div className="relative h-36 w-full rounded-xl overflow-hidden border border-line/60 group">
              {foto ? (
                <img src={foto} alt={place.name} className="h-full w-full object-cover" />
              ) : (
                <PlacePlaceholder name={place.name} className="h-full w-full" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="rounded-md bg-accent px-1.5 py-0.5 text-[12px] font-extrabold text-bg flex items-center gap-0.5">
                    <Star size={10} className="fill-bg" />
                    {place.rating ? place.rating.toFixed(1).replace('.', ',') : '4.8'}
                  </span>
                  <span className="text-[12px] text-white/90 font-medium capitalize">
                    {place.tipo || 'Restaurante'}
                  </span>
                </div>
                <h4 className="font-display text-lg font-bold text-white leading-tight">
                  {place.name}
                </h4>
                <p className="text-[11px] text-white/80 truncate flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-accent shrink-0" />
                  <span>{place.address}</span>
                </p>
              </div>
            </div>

            {/* Balão de Mensagem & Data */}
            <div className="bg-s2/90 border border-line/80 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-accent font-bold text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  <span>{dataHora}</span>
                </span>
              </div>
              <p className="text-ink italic text-xs border-l-2 border-accent pl-2.5 my-1">
                "{mensagemCustom}"
              </p>
            </div>

            {/* Footer do Card */}
            <div className="text-center text-[12px] text-muted/70 pt-1 font-sans tracking-widest uppercase">
              • Vimo Experiências Gastronômicas •
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO & COMPARTILHAMENTO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-line">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
          >
            <Send size={16} />
            <span>Enviar no Whats</span>
          </button>

          {/* Compartilhar Nativo */}
          <button
            type="button"
            onClick={handleCompartilharNativo}
            className="h-11 rounded-xl bg-accent text-bg font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition active:scale-95"
          >
            <Share2 size={16} />
            <span>{compartilhado ? 'Compartilhado' : 'Compartilhar'}</span>
          </button>

          {/* Copiar Texto */}
          <button
            type="button"
            onClick={handleCopiarTexto}
            className="h-11 rounded-xl bg-s2 border border-line hover:bg-line/40 text-ink font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
          >
            {copiado ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copiado ? 'Copiado' : 'Copiar texto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
