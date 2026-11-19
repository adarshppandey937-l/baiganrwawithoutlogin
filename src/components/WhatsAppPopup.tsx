import { useEffect } from 'react';
import { X } from 'lucide-react';
import { BRAND_LOGO_URL, WHATSAPP_CHANNEL_URL } from '../constants';

interface WhatsAppPopupProps {
  open: boolean;
  onClose: () => void;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.48 0 .12 5.36.12 11.94c0 2.1.55 4.16 1.6 5.97L0 24l6.26-1.64a11.9 11.9 0 0 0 5.8 1.48h.01c6.58 0 11.94-5.36 11.94-11.94 0-3.19-1.24-6.18-3.49-8.42ZM12.06 21.82h-.01a9.89 9.89 0 0 1-5.04-1.38l-.36-.22-3.71.97.99-3.62-.24-.37a9.88 9.88 0 0 1-1.52-5.26c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.13 1.03 7 2.9a9.84 9.84 0 0 1 2.9 7c0 5.46-4.45 9.9-9.91 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

export function WhatsAppPopup({ open, onClose }: WhatsAppPopupProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-popup-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-pink-950/45 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[380px] bg-white/97 backdrop-blur-xl border border-pink-200 shadow-[0_25px_50px_-12px_rgba(190,24,93,0.25)] modal-glass rounded-3xl p-6 sm:p-7 text-center fade-in-pop"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-500 hover:text-themePinkDeep flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border-2 border-pink-200 shadow-[0_8px_24px_rgba(236,72,153,0.18)]">
            <img
              src={BRAND_LOGO_URL}
              alt="PANDEY JI Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center border-2 border-white shadow-md">
            <WhatsAppIcon className="w-4 h-4" />
          </div>
        </div>

        <h2
          id="whatsapp-popup-title"
          className="text-xl font-extrabold text-gray-900 font-edu-syne tracking-wide mb-1"
        >
          PANDEY <span className="text-themePink">JI</span>
        </h2>

        <p className="text-xs font-bold uppercase tracking-widest text-[#128C7E] mb-3">
          Official WhatsApp Channel
        </p>

        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          Join our WhatsApp channel for new batch updates, live class alerts, and free study
          notes.
        </p>

        <div className="flex flex-col gap-2.5">
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full py-3.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all btn-click-effect shadow-[0_6px_18px_rgba(37,211,102,0.35)] no-underline"
          >
            <WhatsAppIcon className="w-4 h-4 shrink-0" />
            Join WhatsApp Channel
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-pink-50/70 hover:bg-pink-100/80 border border-pink-200 text-pink-500 hover:text-themePinkDeep text-xs font-bold cursor-pointer transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
