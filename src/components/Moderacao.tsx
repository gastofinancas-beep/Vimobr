import { useState } from 'react';
import { Ban, ChevronRight, Flag } from 'lucide-react';
import { MOTIVOS_DENUNCIA, bloquear, denunciar, type MotivoDenuncia, type TipoDenuncia } from '../lib/moderacao';
import { mostrarAviso } from './Aviso';

const ROTULO: Record<TipoDenuncia, string> = {
  post: 'post',
  usuario: 'perfil',
  avaliacao: 'avaliação',
  comentario: 'comentário',
};

export interface AlvoModeracao {
  tipo: TipoDenuncia;
  /** id do conteúdo (ou o uid, quando o alvo é o perfil) */
  id: string;
  uid: string;
  nome: string;
  foto?: string;
}

/** Folha com Denunciar e Bloquear para conteúdo de outra pessoa. */
export function MenuModeracao({
  alvo,
  meuUid,
  onFechar,
  onFeito,
  inicio = 'menu',
}: {
  alvo: AlvoModeracao;
  meuUid: string;
  onFechar: () => void;
  onFeito?: (acao: 'denunciado' | 'bloqueado') => void;
  inicio?: 'menu' | 'denunciar' | 'bloquear';
}) {
  const [passo, setPasso] = useState<'menu' | 'denunciar' | 'bloquear'>(inicio);
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [detalhe, setDetalhe] = useState('');
  const primeiroNome = alvo.nome.split(' ')[0] || 'esta pessoa';

  const enviarDenuncia = () => {
    if (!motivo) return;
    denunciar(meuUid, { tipo: alvo.tipo, alvoId: alvo.id, alvoUid: alvo.uid, motivo, detalhe });
    mostrarAviso(
      alvo.tipo === 'usuario' ? 'Denúncia enviada. Vamos analisar o perfil.' : 'Denúncia enviada. Ocultamos o conteúdo para você.',
    );
    onFeito?.('denunciado');
    onFechar();
  };

  const confirmarBloqueio = () => {
    bloquear(meuUid, { uid: alvo.uid, name: alvo.nome, photo: alvo.foto ?? '' });
    mostrarAviso(`Você bloqueou ${primeiroNome}`);
    onFeito?.('bloqueado');
    onFechar();
  };

  const item = 'flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-s2 transition-colors cursor-pointer';

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onFechar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={passo === 'denunciar' ? `Denunciar ${ROTULO[alvo.tipo]}` : passo === 'bloquear' ? `Bloquear ${alvo.nome}` : 'Opções'}
        className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[88vh] max-w-2xl flex-col rounded-t-2xl bg-bg pb-safe"
      >
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-line" />
        </div>

        {passo === 'menu' && (
          <div className="divide-y divide-line pb-4">
            <button type="button" onClick={() => setPasso('denunciar')} className={item}>
              <Flag size={20} strokeWidth={1.8} className="text-ink" />
              <span className="flex-1 text-[15px] font-semibold text-ink">Denunciar {ROTULO[alvo.tipo]}</span>
              <ChevronRight size={18} className="text-muted" />
            </button>
            <button type="button" onClick={() => setPasso('bloquear')} className={item}>
              <Ban size={20} strokeWidth={1.8} className="text-danger" />
              <span className="flex-1 text-[15px] font-semibold text-danger">Bloquear {alvo.nome}</span>
            </button>
          </div>
        )}

        {passo === 'denunciar' && (
          <>
            <div className="shrink-0 px-5 pt-2 pb-3">
              <h2 className="font-display text-[18px] font-bold text-ink">Denunciar {ROTULO[alvo.tipo]}</h2>
              <p className="mt-1 text-[13px] text-muted">
                A denúncia é anônima. A equipe do Vimo analisa e remove o que viola as regras.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div role="radiogroup" aria-label="Motivo" className="divide-y divide-line">
                {MOTIVOS_DENUNCIA.map((m) => (
                  <button
                    key={m.valor}
                    type="button"
                    role="radio"
                    aria-checked={motivo === m.valor}
                    onClick={() => setMotivo(m.valor)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-s2 cursor-pointer"
                  >
                    <span className="flex-1 text-[15px] text-ink">{m.titulo}</span>
                    <span
                      className={`h-5 w-5 shrink-0 rounded-full ${motivo === m.valor ? 'border-[6px] border-primary' : 'border-2 border-line'}`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              {motivo && (
                <div className="px-5 pt-3">
                  <textarea
                    value={detalhe}
                    onChange={(e) => setDetalhe(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Quer contar mais? (opcional)"
                    className="w-full resize-none rounded-xl bg-s1 px-3.5 py-3 text-[14px] text-ink ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
            <div className="shrink-0 px-5 pt-3 pb-5">
              <button
                type="button"
                onClick={enviarDenuncia}
                disabled={!motivo}
                className="h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-bg disabled:opacity-40 cursor-pointer"
              >
                Enviar denúncia
              </button>
            </div>
          </>
        )}

        {passo === 'bloquear' && (
          <div className="px-5 pt-2 pb-6">
            <h2 className="font-display text-[18px] font-bold text-ink">Bloquear {alvo.nome}?</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Você deixa de ver os posts, as avaliações e os comentários de {primeiroNome}, e deixa de seguir essa
              pessoa. Ela não é avisada. Dá para desbloquear em Editar perfil.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={onFechar} className="h-12 rounded-full bg-s2 text-[15px] font-semibold text-ink cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={confirmarBloqueio} className="h-12 rounded-full bg-danger text-[15px] font-semibold text-white cursor-pointer">
                Bloquear
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
