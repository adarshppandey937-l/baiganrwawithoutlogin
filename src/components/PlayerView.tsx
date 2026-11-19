import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { BRAND_LOGO_URL } from '../constants';
import type { PlayerMode } from '../types';

interface PlayerViewProps {
  url: string;
  title: string;
  mode: PlayerMode;
  onBack: () => void;
}

export function PlayerView({ url, title, mode, onBack }: PlayerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [needsUnmute, setNeedsUnmute] = useState(false);

  const attemptPlay = (videoEl: HTMLVideoElement) => {
    videoEl.play().catch((err: unknown) => {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'NotAllowedError') {
        videoEl.muted = true;
        videoEl
          .play()
          .then(() => setNeedsUnmute(true))
          .catch(() => {});
      }
    });
  };

  useEffect(() => {
    if (mode !== 'video') {
      setIsLoading(false);
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl || !url) return;

    setIsLoading(true);
    setErrorMsg(null);

    let hlsInstance: { destroy: () => void } | null = null;
    let destroyed = false;
    let errorHandler: (() => void) | null = null;

    (async () => {
      const isHls = url.toLowerCase().includes('m3u8');
      const localProxy = `/video?url=${encodeURIComponent(url)}`;
      const fallbackProxy = `https://studybeepro.site/api/proxy?url=${encodeURIComponent(url)}`;
      const candidates = isHls ? [localProxy, fallbackProxy, url] : [url, localProxy, fallbackProxy];
      let attemptIdx = 0;

      const loadWithHls = async (src: string): Promise<string> => {
        const Hls = (await import('hls.js')).default;
        if (destroyed) return 'destroyed';
        if (!Hls.isSupported()) return 'unsupported';

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingMaxRetry: 3,
        });
        hlsInstance = hls;
        hls.loadSource(src);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          attemptPlay(videoEl);
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data?.fatal) {
            if (attemptIdx < candidates.length - 1) {
              attemptIdx += 1;
              try {
                hls.destroy();
              } catch {
                // ignore
              }
              hlsInstance = null;
              loadWithHls(candidates[attemptIdx]);
              return;
            }
            setIsLoading(false);
            setErrorMsg('Stream playback encountered an error.');
          }
        });
        return 'attached';
      };

      if (isHls) {
        if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
          errorHandler = () => {
            if (attemptIdx < candidates.length - 1) {
              attemptIdx += 1;
              videoEl.src = candidates[attemptIdx];
              videoEl.play().catch(() => {});
              return;
            }
            setIsLoading(false);
            setErrorMsg('Unable to load the video stream.');
          };
          videoEl.addEventListener('error', errorHandler);
          videoEl.addEventListener(
            'loadeddata',
            () => {
              setIsLoading(false);
              attemptPlay(videoEl);
            },
            { once: true }
          );
          videoEl.src = candidates[attemptIdx];
          return;
        }
        await loadWithHls(candidates[attemptIdx]);
        return;
      }

      errorHandler = () => {
        if (attemptIdx < candidates.length - 1) {
          attemptIdx += 1;
          videoEl.src = candidates[attemptIdx];
          videoEl.play().catch(() => {});
          return;
        }
        setIsLoading(false);
        setErrorMsg('Unable to load the video stream.');
      };
      videoEl.addEventListener('error', errorHandler);
      videoEl.addEventListener(
        'loadeddata',
        () => {
          setIsLoading(false);
          attemptPlay(videoEl);
        },
        { once: true }
      );
      videoEl.src = candidates[attemptIdx];
    })();

    return () => {
      destroyed = true;
      if (errorHandler) {
        videoEl.removeEventListener('error', errorHandler);
        errorHandler = null;
      }
      if (hlsInstance) {
        try {
          hlsInstance.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, [url, mode]);

  useEffect(() => {
    setNeedsUnmute(false);
  }, [url, mode]);

  const pdfViewerUrl = `/pdf?url=${encodeURIComponent(url)}`;

  return (
    <div className="w-full min-h-screen pandeyji-root flex flex-col items-center justify-center relative">
      <div className="fixed top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-white/95 via-white/80 to-transparent flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-9 h-9 rounded-[10px] border border-pink-200 bg-white hover:bg-pink-50 hover:border-themePink/40 text-gray-800 flex items-center justify-center cursor-pointer transition-all backdrop-blur-md"
        >
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>

        <div className="w-8 h-8 rounded-lg bg-white border border-pink-200 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src={BRAND_LOGO_URL}
            alt="PANDEY JI Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="text-base font-extrabold text-gray-900 tracking-wider font-edu-syne">
          PANDEY <span className="text-themePink">JI</span>
        </div>

        <div className="text-xs text-pink-400 truncate ml-2 flex-1">{title}</div>

        {mode === 'video' && (
          <div className="flex items-center gap-1 bg-white border border-pink-200 rounded-lg p-1 shadow-sm">
            {[1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => {
                  setPlaybackRate(speed);
                  if (videoRef.current) {
                    videoRef.current.playbackRate = speed;
                  }
                }}
                className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                  playbackRate === speed
                    ? 'bg-themePink text-white'
                    : 'text-pink-400 hover:text-themePinkDeep'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'youtube' ? (
        <div className="w-full h-screen pt-14 flex flex-col">
          <iframe
            src={url}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full flex-1 border-0 bg-black"
          />
          <div className="p-3 bg-white border-t border-pink-100 flex items-center justify-between px-6">
            <span className="text-xs text-pink-400 truncate">{title}</span>
            <a
              href={url.replace('/embed/', '/watch?v=')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-themePink to-themePinkDeep text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 no-underline shadow-[0_3px_10px_rgba(236,72,153,0.3)]"
            >
              Watch on YouTube <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : mode === 'pdf' ? (
        <div className="w-full h-screen pt-14 flex flex-col">
          <iframe src={pdfViewerUrl} title={title} className="w-full flex-1 border-0 bg-pink-50" />
          <div className="p-3 bg-white border-t border-pink-100 flex items-center justify-between px-6">
            <span className="text-xs text-pink-400 truncate">{title}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-themePink to-themePinkDeep text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 no-underline shadow-[0_3px_10px_rgba(236,72,153,0.3)]"
            >
              Open Direct PDF <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-6xl aspect-[16/9] bg-gray-900 flex items-center justify-center shadow-2xl rounded-xl overflow-hidden">
          {isLoading && !errorMsg && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
              <div className="w-11 h-11 border-[3px] border-pink-200/40 border-t-themePink rounded-full animate-spin" />
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-10 p-6 text-center">
              <div className="text-4xl opacity-70">⚠️</div>
              <div className="text-pink-200 text-sm max-w-xs font-medium">{errorMsg}</div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-6 py-2.5 bg-gradient-to-br from-themePink to-themePinkDeep text-white rounded-full text-xs font-bold cursor-pointer shadow-[0_4px_14px_rgba(236,72,153,0.4)]"
                >
                  Back to Lectures
                </button>
              </div>
            </div>
          )}

          {needsUnmute && !isLoading && !errorMsg && (
            <button
              type="button"
              onClick={() => {
                const videoEl = videoRef.current;
                if (videoEl) {
                  videoEl.muted = false;
                  videoEl.play().catch(() => {});
                  setNeedsUnmute(false);
                }
              }}
              aria-label="Unmute video"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 border border-pink-200 text-gray-900 text-xs font-bold cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:bg-white transition-colors"
            >
              <svg
                className="w-4 h-4 text-themePink"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5 6 9H2v6h4l5 4V5Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"
                />
              </svg>
              Tap to Unmute
            </button>
          )}

          <video
            ref={videoRef}
            controls
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-contain bg-black"
          />
        </div>
      )}
    </div>
  );
}
