import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, ChevronRight, FileText, FolderOpen, Play } from 'lucide-react';
import { BRAND_LOGO_URL } from '../constants';
import type { Batch, ContentItem, Subject, Topic } from '../types';
import { formatDuration, formatTimestamp, useAutoRetryCountdown } from '../utils/crypto';

interface ContentBuckets {
  lectures: ContentItem[];
  classpdf: ContentItem[];
  notes: ContentItem[];
}

interface ContentViewProps {
  batch: Batch;
  subject: Subject;
  topic: Topic;
  brandTitle: string;
  onBack: () => void;
  onSelectVideo: (item: ContentItem) => void;
  onSelectPdf: (item: ContentItem, pdfType: string) => void;
}

const EMPTY_BUCKETS: ContentBuckets = { lectures: [], classpdf: [], notes: [] };

function organizeContent(items: ContentItem[]): ContentBuckets {
  const sorted = [...items].sort(
    (a, b) => Number(a.sortingparam || 0) - Number(b.sortingparam || 0)
  );
  const buckets: ContentBuckets = { lectures: [], classpdf: [], notes: [] };
  for (const item of sorted) {
    const type = (item.material_type || '').toUpperCase();
    const label = item.Title || item.title || 'Untitled';
    if (type === 'VIDEO') {
      buckets.lectures.push(item);
      if (item.pdf_link) {
        buckets.classpdf.push({ ...item, title: `${label} (PDF 1)`, isPdf1: true });
      }
      if (item.pdf_link2) {
        buckets.classpdf.push({ ...item, title: `${label} (PDF 2)`, isPdf1: false });
      }
    } else if (type === 'PDF') {
      buckets.notes.push(item);
    }
  }
  return buckets;
}

export function ContentView({
  batch,
  subject,
  topic,
  brandTitle,
  onBack,
  onSelectVideo,
  onSelectPdf,
}: ContentViewProps) {
  const [activeTab, setActiveTab] = useState<'lectures' | 'classpdf' | 'notes'>('lectures');
  const [contentState, setContentState] = useState<{ key: string; buckets: ContentBuckets }>({
    key: '',
    buckets: EMPTY_BUCKETS,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);

  const courseId = String(batch.id);
  const subjectId = String(subject.subjectid);
  const topicId = String(topic.topicid);
  const compositeKey = `${courseId}|${subjectId}|${topicId}`;

  const isLoading = contentState.key !== compositeKey;
  const buckets = contentState.key === compositeKey ? contentState.buckets : EMPTY_BUCKETS;

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/teachx/content?courseid=${encodeURIComponent(courseId)}&subjectid=${encodeURIComponent(subjectId)}&topicid=${encodeURIComponent(topicId)}`
    )
      .then((res) => res.json())
      .then((res) => {
        if (cancelled) return;
        const ok = Boolean(res && Array.isArray(res.data));
        const nextBuckets = ok ? organizeContent(res.data) : { ...EMPTY_BUCKETS };
        setHasError(!ok);
        setContentState({ key: compositeKey, buckets: nextBuckets });
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
          setContentState({ key: compositeKey, buckets: { ...EMPTY_BUCKETS } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [compositeKey, courseId, subjectId, topicId, retryCount]);

  const handleRetry = () => {
    setContentState({ key: '', buckets: { ...EMPTY_BUCKETS } });
    setHasError(false);
    setRetryCount((n) => n + 1);
  };

  const currentItems = buckets[activeTab] || [];
  const autoRetryCountdown = useAutoRetryCountdown(!isLoading && hasError, handleRetry);

  return (
    <div className="min-h-screen pandeyji-root pb-16">
      <div className="sticky top-0 z-50 bg-white/85 backdrop-blur-2xl border-b border-pink-100 px-4 pt-3 shadow-[0_6px_24px_rgba(236,72,153,0.08)]">
        <div className="flex items-center mb-4 gap-3 max-w-[800px] mx-auto">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Topics"
            className="flex items-center justify-center w-9 h-9 bg-pink-50 border border-pink-200 rounded-[10px] cursor-pointer hover:bg-pink-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-white border border-pink-200 flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src={BRAND_LOGO_URL}
              alt="PANDEY JI Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-lg font-extrabold flex-1 truncate font-edu-syne tracking-wide text-gray-900">
            PANDEY <span className="text-themePink">JI</span> — {topic.topic_name || brandTitle}
          </div>
        </div>

        <div className="max-w-[800px] mx-auto">
          <nav className="flex gap-2 pb-3.5 overflow-x-auto hide-scroll">
            <button
              type="button"
              onClick={() => setActiveTab('lectures')}
              className={`flex-1 text-center py-2.5 px-4 min-w-[100px] rounded-xl text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-all border ${
                activeTab === 'lectures'
                  ? 'bg-pink-50 text-themePinkDeep border-themePink/50 shadow-[0_4px_15px_rgba(236,72,153,0.18)]'
                  : 'bg-white border-pink-100 text-pink-400 hover:bg-pink-50/70 hover:text-themePinkDeep'
              }`}
            >
              Lectures
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('classpdf')}
              className={`flex-1 text-center py-2.5 px-4 min-w-[100px] rounded-xl text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-all border ${
                activeTab === 'classpdf'
                  ? 'bg-pink-50 text-themePinkDeep border-themePink/50 shadow-[0_4px_15px_rgba(236,72,153,0.18)]'
                  : 'bg-white border-pink-100 text-pink-400 hover:bg-pink-50/70 hover:text-themePinkDeep'
              }`}
            >
              Class PDF
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 text-center py-2.5 px-4 min-w-[100px] rounded-xl text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-all border ${
                activeTab === 'notes'
                  ? 'bg-pink-50 text-themePinkDeep border-themePink/50 shadow-[0_4px_15px_rgba(236,72,153,0.18)]'
                  : 'bg-white border-pink-100 text-pink-400 hover:bg-pink-50/70 hover:text-themePinkDeep'
              }`}
            >
              Notes
            </button>
          </nav>
        </div>
      </div>

      <div className="p-5 px-4 flex flex-col gap-3.5 max-w-[800px] mx-auto">
        {isLoading ? (
          <div className="text-center mt-14 text-pink-400 text-sm font-medium">
            <div className="w-6 h-6 border-2 border-pink-100 border-t-themePink rounded-full animate-spin mx-auto mb-2.5" />
            Loading content...
          </div>
        ) : currentItems.length === 0 && hasError ? (
          <div className="text-center py-12 px-5 text-pink-400 text-sm bg-white/70 border border-dashed border-pink-200 rounded-2xl mt-5">
            <FolderOpen className="w-12 h-12 opacity-40 mx-auto mb-3 text-themePink/50" />
            <div className="text-sm font-semibold text-gray-800 mb-1">
              Couldn&apos;t load this section right now
            </div>
            <div className="text-xs mb-5">
              The source site is busy or briefly unreachable. Tap retry.
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="bg-gradient-to-br from-themePink to-themePinkDeep text-white border-0 py-2.5 px-6 rounded-xl text-[13px] font-bold cursor-pointer shadow-[0_4px_12px_rgba(236,72,153,0.3)]"
            >
              Retry
            </button>
            {autoRetryCountdown !== null && (
              <div className="text-[11px] text-pink-300 mt-4">
                Auto-retrying in {autoRetryCountdown}s…
              </div>
            )}
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-12 px-5 text-pink-400 text-sm bg-white/70 border border-dashed border-pink-200 rounded-2xl mt-5">
            <FolderOpen className="w-12 h-12 opacity-40 mx-auto mb-3 text-themePink/50" />
            <div className="text-sm font-semibold text-gray-800 mb-1">Nothing here yet</div>
            <div className="text-xs">
              {activeTab === 'notes'
                ? 'No notes have been uploaded for this topic.'
                : activeTab === 'classpdf'
                  ? 'No class PDFs have been uploaded for this topic.'
                  : 'No lectures have been uploaded for this topic.'}
            </div>
          </div>
        ) : (
          currentItems.map((item, idx) => {
            if (activeTab === 'lectures') {
              const durationStr = formatDuration(item.duration);
              const dateStr = formatTimestamp(item.strtotime);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => onSelectVideo(item)}
                  className="group flex gap-3.5 bg-white/90 hover:bg-white backdrop-blur-md border border-pink-100 hover:border-themePink/40 p-3 rounded-2xl cursor-pointer relative transition-all items-center shadow-[0_3px_14px_rgba(236,72,153,0.08)] hover:-translate-y-1"
                >
                  <div className="w-[120px] h-[68px] rounded-[10px] overflow-hidden bg-pink-50 relative shrink-0 border border-pink-100 shadow-md flex items-center justify-center">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.Title || item.title || 'Lecture'}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-50" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <div className="w-8 h-8 rounded-full bg-white/90 group-hover:bg-themePink backdrop-blur-xs flex items-center justify-center border border-pink-200 group-hover:border-transparent transition-all shadow">
                        <Play className="w-3.5 h-3.5 text-themePinkDeep group-hover:text-white fill-current ml-0.5" />
                      </div>
                    </div>
                    {durationStr && (
                      <div className="absolute right-1.5 bottom-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        {durationStr}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
                    <div className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                      {item.Title || item.title}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-[11px] text-themePink font-semibold uppercase tracking-wider">
                        Video Lecture
                      </div>
                      {dateStr && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-pink-500 bg-pink-50 px-2 py-1 rounded-lg w-fit border border-pink-100 font-medium">
                          <Calendar className="w-2.5 h-2.5" />
                          {dateStr}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const title = item.title || item.Title;
            const dateStr = formatTimestamp(item.strtotime);
            const isClassPdf = activeTab === 'classpdf';
            const pdfType = isClassPdf && item.isPdf1 === false ? '2' : '1';

            return (
              <div
                key={`${item.id}-${pdfType}-${idx}`}
                onClick={() => onSelectPdf(item, pdfType)}
                className="group flex gap-3.5 bg-white/90 hover:bg-white backdrop-blur-md border border-pink-100 hover:border-themePink/40 p-3 rounded-2xl cursor-pointer relative transition-all items-center shadow-[0_3px_14px_rgba(236,72,153,0.08)] hover:-translate-y-1"
              >
                <div className="w-[60px] h-[68px] rounded-[10px] bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center shrink-0 text-themePink border border-pink-200 group-hover:scale-105 transition-all">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
                  <div className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                    {title}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[11px] text-themePinkDeep font-semibold uppercase tracking-wider">
                      {isClassPdf ? 'Class Note' : 'Study Material'}
                    </div>
                    {dateStr && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-pink-500 bg-pink-50 px-2 py-1 rounded-lg w-fit border border-pink-100 font-medium">
                        <Calendar className="w-2.5 h-2.5" />
                        {dateStr}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-pink-300 group-hover:text-themePink transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
