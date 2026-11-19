import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { BRAND_LOGO_URL } from '../constants';
import type { Batch, Subject, Topic } from '../types';
import { useAutoRetryCountdown } from '../utils/crypto';

interface TopicViewProps {
  batch: Batch;
  subject: Subject;
  brandTitle: string;
  onBack: () => void;
  onSelectTopic: (topic: Topic) => void;
}

export function TopicView({
  batch,
  subject,
  brandTitle,
  onBack,
  onSelectTopic,
}: TopicViewProps) {
  const [topicsState, setTopicsState] = useState<{ key: string; topics: Topic[] }>({
    key: '',
    topics: [],
  });
  const [retryCount, setRetryCount] = useState(0);

  const courseId = String(batch.id);
  const subjectId = String(subject.subjectid);
  const compositeKey = `${courseId}|${subjectId}`;

  const isLoading = topicsState.key !== compositeKey;
  const topics = topicsState.key === compositeKey ? topicsState.topics : [];

  useEffect(() => {
    let cancelled = false;
    const setResult = (list: Topic[]) => {
      if (!cancelled) {
        setTopicsState({ key: compositeKey, topics: list });
      }
    };

    fetch(
      `/api/rwa?path=topics&examId=${encodeURIComponent(courseId)}&subjectId=${encodeURIComponent(subjectId)}`
    )
      .then((res) => res.json())
      .then((res) => {
        if (cancelled) return;
        const rwaTopics = res && res.success && Array.isArray(res.data) ? res.data : [];
        if (rwaTopics.length > 0) {
          setResult(
            rwaTopics
              .map((item: Record<string, unknown>, idx: number) => ({
                topicid: String(item.topicid),
                topic_name: String(item.topicname || item.topic_name || 'Topic'),
                topic_logo: String(item.topiclogo || ''),
                sortingparam: Number(item.sortingparam ?? idx),
              }))
              .sort((a: Topic, b: Topic) => Number(a.sortingparam || 0) - Number(b.sortingparam || 0))
          );
          return;
        }
        return fetch(
          `/api/teachx/topics?courseid=${encodeURIComponent(courseId)}&subjectid=${encodeURIComponent(subjectId)}`
        )
          .then((r) => r.json())
          .then((r) => {
            if (cancelled) return;
            if (r && Array.isArray(r.data)) {
              setResult(
                [...r.data].sort(
                  (a: Topic, b: Topic) => Number(a.sortingparam || 0) - Number(b.sortingparam || 0)
                )
              );
            } else {
              setResult([]);
            }
          })
          .catch(() => {
            if (!cancelled) setResult([]);
          });
      })
      .catch(() => {
        if (!cancelled) {
          setTopicsState({ key: compositeKey, topics: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [compositeKey, courseId, subjectId, retryCount]);

  const handleRetry = () => {
    setTopicsState({ key: '', topics: [] });
    setRetryCount((n) => n + 1);
  };

  const autoRetryCountdown = useAutoRetryCountdown(!isLoading && topics.length === 0, handleRetry);

  return (
    <div className="min-h-screen pandeyji-root pb-12">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-pink-100 px-4 py-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Subjects"
          className="bg-pink-50 border border-pink-200 text-gray-800 w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer shrink-0 hover:bg-pink-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-white border border-pink-200 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src={BRAND_LOGO_URL}
            alt="PANDEY JI Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-lg font-extrabold text-gray-900 font-edu-syne tracking-wider truncate flex-1">
          PANDEY <span className="text-themePink">JI</span> —{' '}
          {subject.subject_name || brandTitle || 'RWA'}
        </div>
        <div className="w-9 shrink-0" />
      </header>

      <div className="p-5 max-w-[800px] mx-auto">
        <div className="text-[13px] font-bold text-pink-400 uppercase tracking-[1.5px] mb-4 font-edu-syne">
          Select Topic — {subject.subject_name}
        </div>

        {isLoading ? (
          <div>
            {[0, 1, 2].map((skeleton) => (
              <div
                key={skeleton}
                className="bg-white rounded-2xl p-3 flex gap-4 mb-3 border border-pink-100"
              >
                <div className="w-[55px] h-[55px] rounded-[10px] bg-pink-50" />
                <div className="flex-1 flex flex-col gap-2 justify-center">
                  <div className="h-2.5 bg-pink-50 rounded w-4/5" />
                  <div className="h-2.5 bg-pink-50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-10 px-5 text-pink-400 border border-dashed border-pink-200 rounded-[20px] mt-5 bg-white/60 max-w-[600px] mx-auto">
            <div className="text-3xl mb-3">📭</div>
            <div className="text-sm font-semibold text-gray-800 mb-1">
              Couldn&apos;t load topics right now
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
        ) : (
          <div>
            {topics.map((topic) => (
              <div
                key={topic.topicid}
                onClick={() => onSelectTopic(topic)}
                className="flex items-center gap-4 bg-white hover:bg-pink-50/60 border border-pink-100 hover:border-themePink/35 p-3 rounded-2xl mb-3 cursor-pointer transition-all active:scale-[0.98] shadow-[0_2px_10px_rgba(236,72,153,0.06)]"
              >
                <div className="w-[55px] h-[55px] rounded-[10px] bg-pink-50 shrink-0 shadow-md border border-pink-100 flex items-center justify-center overflow-hidden">
                  {topic.topic_logo && topic.topic_logo.trim() ? (
                    <img
                      src={topic.topic_logo}
                      alt={topic.topic_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FolderOpen className="w-6 h-6 text-themePink/80" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-gray-900 leading-snug">
                    {topic.topic_name}
                  </div>
                  <div className="text-xs text-pink-400 mt-0.5">Tap to open</div>
                </div>
                <div className="text-pink-300 opacity-80 shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
