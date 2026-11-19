import { useState } from 'react';
import { ArrowRight, BookOpen, Check, Plus } from 'lucide-react';
import type { Batch } from '../types';

interface BatchCardProps {
  batch: Batch;
  index: number;
  isEnrolled: boolean;
  onToggleEnroll: (batchId: string) => void;
  onStudyClick: (batch: Batch) => void;
}

export function BatchCard({
  batch,
  index,
  isEnrolled,
  onToggleEnroll,
  onStudyClick,
}: BatchCardProps) {
  const [imgError, setImgError] = useState(false);
  const idStr = String(batch.id);
  const animationDelay = `${(index % 12) * 30}ms`;

  return (
    <div
      className="premium-card rounded-xl overflow-hidden fade-in-pop group flex flex-col relative"
      style={{ animationDelay }}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-pink-50 border-b border-pink-100">
        {!imgError && batch.thumbnail ? (
          <img
            src={batch.thumbnail}
            alt={batch.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-100 via-pink-50 to-white p-4 text-center">
            <BookOpen className="w-8 h-8 text-themePink/70 mb-2" />
            <span className="text-xs font-bold text-pink-600 line-clamp-2 font-edu-syne">
              {batch.title}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md border border-themeGreen/30 px-2 py-1 rounded flex items-center justify-center z-10 shadow-sm">
          <span className="text-themeGreen text-[9px] font-black tracking-widest uppercase">
            FREE
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 relative z-20">
        <h3 className="text-gray-800 font-semibold text-sm leading-relaxed mb-4 line-clamp-2 group-hover:text-themePinkDeep transition-colors">
          {batch.title}
        </h3>

        <div className="mt-auto pt-3 border-t border-pink-100">
          <div className="text-[10px] font-bold tracking-wider uppercase text-themePinkDeep/80 mb-1.5">
            OWNER - PANDEY JI
          </div>
          <div className="flex items-center justify-between">
            <div id={`enroll-container-${idStr}`}>
            {isEnrolled ? (
              <button
                type="button"
                aria-label={`Unenroll ${batch.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnroll(idStr);
                }}
                className="bg-themeGreen/10 text-themeGreen border border-themeGreen/25 px-3 py-1.5 rounded text-[11px] font-bold tracking-wider flex items-center gap-1.5 hover:bg-themeGreen/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Check className="w-3.5 h-3.5" /> ENROLLED
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Enroll ${batch.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEnroll(idStr);
                }}
                className="bg-themeGreen hover:bg-emerald-400 text-white px-3 py-1.5 rounded text-[11px] font-bold tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> ENROLL
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label={`Study ${batch.title}`}
            onClick={(e) => {
              e.preventDefault();
              onStudyClick(batch);
            }}
            className="bg-gradient-to-br from-themePink to-themePinkDeep hover:from-pink-500 hover:to-pink-700 text-white px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-[0_4px_12px_rgba(236,72,153,0.3)] cursor-pointer whitespace-nowrap shrink-0"
          >
            Let&apos;s Study <ArrowRight className="w-3.5 h-3.5" />
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
