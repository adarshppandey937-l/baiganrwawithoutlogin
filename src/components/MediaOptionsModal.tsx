import { useEffect, useState } from 'react';
import { BRAND_LOGO_URL } from '../constants';
import type { Batch, ContentItem, QualityOption } from '../types';
import { decryptAppxLink } from '../utils/crypto';

interface MediaOptionsModalProps {
  batch: Batch;
  item: ContentItem;
  mode: 'video' | 'pdf';
  pdfType?: string;
  onClose: () => void;
  onPlayVideo: (url: string, title: string, thumbnail?: string) => void;
  onOpenPdf: (url: string, title: string) => void;
}

export function MediaOptionsModal({
  batch,
  item,
  mode,
  pdfType = '1',
  onClose,
  onPlayVideo,
  onOpenPdf,
}: MediaOptionsModalProps) {
  const fallbackTitle = item.Title || item.title || 'Content';
  const [state, setState] = useState<{
    key: string;
    qualities: QualityOption[];
    pdfUrl: string | null;
    errorMsg: string | null;
    resolvedTitle: string;
  }>({
    key: '',
    qualities: [],
    pdfUrl: null,
    errorMsg: null,
    resolvedTitle: fallbackTitle,
  });

  const courseId = String(batch.id);
  const videoId = String(item.id);
  const requestKey = `${courseId}|${videoId}|${mode}|${pdfType}`;

  const isLoading = state.key !== requestKey;
  const errorMsg = state.key === requestKey ? state.errorMsg : null;
  const qualities = state.key === requestKey ? state.qualities : [];
  const pdfUrl = state.key === requestKey ? state.pdfUrl : null;
  const resolvedTitle = state.key === requestKey ? state.resolvedTitle : fallbackTitle;

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/video-details?course_id=${encodeURIComponent(courseId)}&video_id=${encodeURIComponent(videoId)}`
    )
      .then((res) => res.json())
      .then((res) => {
        if (cancelled) return;
        const detail = (res && res.data) || item;
        const title = detail.Title || detail.title || item.Title || item.title || 'Content';

        if (mode === 'pdf') {
          const rawLink =
            pdfType === '2'
              ? detail.pdf_link2 || item.pdf_link2
              : detail.pdf_link || item.pdf_link;
          const resolvedPdf = rawLink?.startsWith('http') ? rawLink : decryptAppxLink(rawLink);
          setState({
            key: requestKey,
            qualities: [],
            pdfUrl: resolvedPdf || null,
            errorMsg: resolvedPdf ? null : 'PDF link is unavailable for this item.',
            resolvedTitle: title,
          });
          return;
        }

        const rawLinks = detail.download_links || item.download_links || [];
        const options: QualityOption[] = [];
        for (const link of rawLinks) {
          const resolvedUrl =
            link.decryptedUrl ||
            (link.path?.startsWith('http') ? link.path : decryptAppxLink(link.path));
          if (resolvedUrl) {
            options.push({
              label: link.quality || 'HD',
              url: resolvedUrl,
            });
          }
        }

        if (options.length === 0) {
          const rawFile = detail.file_link || item.file_link;
          const resolvedFile = rawFile?.startsWith('http') ? rawFile : decryptAppxLink(rawFile);
          if (resolvedFile) {
            options.push({ label: 'Auto (HLS)', url: resolvedFile });
          }
        }

        setState({
          key: requestKey,
          qualities: options,
          pdfUrl: null,
          errorMsg: options.length === 0 ? 'Video stream unavailable for this lecture.' : null,
          resolvedTitle: title,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            key: requestKey,
            qualities: [],
            pdfUrl: null,
            errorMsg: 'Failed to fetch stream details.',
            resolvedTitle: item.Title || item.title || 'Content',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, videoId, mode, pdfType, item, requestKey]);

  return (
    <div className="fixed inset-0 bg-pink-950/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="w-[90%] max-w-[380px] bg-white/97 backdrop-blur-md p-7 px-6 rounded-3xl border border-pink-200 text-center shadow-[0_20px_50px_rgba(190,24,93,0.25)]">
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-[10px] bg-white border border-pink-200 flex items-center justify-center overflow-hidden">
            <img
              src={BRAND_LOGO_URL}
              alt="PANDEY JI Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-base font-extrabold text-gray-900 font-edu-syne tracking-wider">
            PANDEY <span className="text-themePink">JI</span>
          </span>
        </div>

        {isLoading ? (
          <div>
            <div className="w-10 h-10 mx-auto mb-4 border-[3px] border-pink-100 border-t-themePink rounded-full animate-spin" />
            <h2 className="text-lg font-extrabold text-gray-900 font-edu-syne tracking-wide mb-2">
              Fetching Details
            </h2>
            <p className="text-pink-400 text-[13px] mb-2">Please wait...</p>
          </div>
        ) : errorMsg ? (
          <div>
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-base font-bold text-red-500 font-edu-syne mb-5">{errorMsg}</div>
            <button
              type="button"
              onClick={onClose}
              className="bg-gradient-to-br from-themePink to-themePinkDeep hover:from-pink-500 hover:to-pink-700 text-white py-3 px-7 rounded-full font-bold text-sm cursor-pointer transition-all shadow-[0_4px_14px_rgba(236,72,153,0.35)]"
            >
              Go Back
            </button>
          </div>
        ) : mode === 'pdf' && pdfUrl ? (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 font-edu-syne tracking-wide mb-2">
              PDF Options
            </h2>
            <p className="text-pink-400 text-[13px] mb-5 line-clamp-2">{resolvedTitle}</p>
            <div className="flex flex-col gap-2.5 mt-2.5">
              <button
                type="button"
                onClick={() => onOpenPdf(pdfUrl, resolvedTitle)}
                className="bg-white hover:bg-pink-50 text-gray-900 border border-pink-200 hover:border-themePink py-3.5 px-4 rounded-[14px] text-sm font-semibold cursor-pointer flex justify-between items-center transition-all"
              >
                <span>View Online</span>
                <span className="text-[10px] bg-themePink text-white px-2 py-0.5 rounded font-bold tracking-wider">
                  PDF
                </span>
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-pink-50 text-gray-900 border border-pink-200 hover:border-themePink py-3.5 px-4 rounded-[14px] text-sm font-semibold cursor-pointer flex justify-between items-center transition-all no-underline"
              >
                <span>Download PDF</span>
                <span className="text-[10px] bg-themePink text-white px-2 py-0.5 rounded font-bold tracking-wider">
                  Save
                </span>
              </a>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 bg-transparent border border-pink-200 hover:border-pink-400 text-pink-400 hover:text-themePinkDeep text-[13px] font-semibold cursor-pointer py-2.5 rounded-xl w-full transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 font-edu-syne tracking-wide mb-2">
              Select Quality
            </h2>
            <p className="text-pink-400 text-[13px] mb-5 line-clamp-2">{resolvedTitle}</p>
            <div className="flex flex-col gap-2.5 mt-2.5 max-h-[300px] overflow-y-auto">
              {qualities.map((quality) => (
                <button
                  key={quality.label}
                  type="button"
                  onClick={() => onPlayVideo(quality.url, resolvedTitle, item.thumbnail)}
                  className="bg-white hover:bg-pink-50 text-gray-900 border border-pink-200 hover:border-themePink py-3.5 px-4 rounded-[14px] text-sm font-semibold cursor-pointer flex justify-between items-center transition-all"
                >
                  <span>{quality.label}</span>
                  <span className="text-[10px] bg-themePink text-white px-2 py-0.5 rounded font-bold tracking-wider">
                    MP4
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 bg-transparent border border-pink-200 hover:border-pink-400 text-pink-400 hover:text-themePinkDeep text-[13px] font-semibold cursor-pointer py-2.5 rounded-xl w-full transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
