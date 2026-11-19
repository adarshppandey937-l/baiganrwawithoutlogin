import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { BRAND_LOGO_URL } from '../constants';
import type { Batch, LiveClassItem, Subject, TestSeriesItem } from '../types';
import { useAutoRetryCountdown } from '../utils/crypto';

interface SubjectViewProps {
  batch: Batch;
  brandTitle: string;
  onBack: () => void;
  onSelectSubject: (subject: Subject) => void;
  onOpenLive: (item: LiveClassItem) => void;
}

export function SubjectView({
  batch,
  brandTitle,
  onBack,
  onSelectSubject,
  onOpenLive,
}: SubjectViewProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'live' | 'tests'>('content');
  const [subjectsState, setSubjectsState] = useState<{ key: string; subjects: Subject[] }>({
    key: '',
    subjects: [],
  });
  const [liveState, setLiveState] = useState<{
    key: string;
    live: LiveClassItem[];
    upcoming: LiveClassItem[];
  }>({
    key: '',
    live: [],
    upcoming: [],
  });
  const [testsState, setTestsState] = useState<{ key: string; tests: TestSeriesItem[] }>({
    key: '',
    tests: [],
  });
  const [scheduleModalMsg, setScheduleModalMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const courseId = String(batch.id);
  const subjectsKey = `sub-${courseId}`;
  const isLoadingSubjects = subjectsState.key !== subjectsKey;
  const subjects = subjectsState.key === subjectsKey ? subjectsState.subjects : [];

  const liveKey = `live-${courseId}`;
  const isLoadingLive = activeTab === 'live' && liveState.key !== liveKey;
  const liveData = {
    live: liveState.key === liveKey ? liveState.live : [],
    upcoming: liveState.key === liveKey ? liveState.upcoming : [],
  };

  const testsKey = `tests-${courseId}`;
  const isLoadingTests = activeTab === 'tests' && testsState.key !== testsKey;
  const tests = testsState.key === testsKey ? testsState.tests : [];

  useEffect(() => {
    let cancelled = false;
    const setResult = (list: Subject[]) => {
      if (!cancelled) {
        setSubjectsState({ key: subjectsKey, subjects: list });
      }
    };

    fetch(`/api/rwa?path=freecontent&courseId=${encodeURIComponent(courseId)}`)
      .then((res) => res.json())
      .then((res) => {
        if (cancelled) return;
        const rwaSubjects =
          res && res.success && res.data && Array.isArray(res.data.subjects)
            ? res.data.subjects
            : [];
        if (rwaSubjects.length > 0) {
          setResult(
            rwaSubjects.map((item: Record<string, unknown>) => ({
              subjectid: String(item.subjectid),
              subject_name: String(item.subjectname || item.subject_name || 'Subject'),
              subject_logo: String(item.subjectlogo || item.subject_logo || ''),
              sortingparam: (item.sortingparam as string | number) ?? '0',
            }))
          );
          return;
        }
        return fetch(`/api/teachx/subjects?courseid=${encodeURIComponent(courseId)}`)
          .then((r) => r.json())
          .then((r) => {
            setResult(r && Array.isArray(r.data) ? r.data : []);
          });
      })
      .catch(() => {
        if (!cancelled) {
          setSubjectsState({ key: subjectsKey, subjects: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, subjectsKey, retryCount]);

  const handleRetrySubjects = () => {
    setSubjectsState({ key: '', subjects: [] });
    setRetryCount((n) => n + 1);
  };

  const autoRetryCountdown = useAutoRetryCountdown(
    !isLoadingSubjects && subjects.length === 0,
    handleRetrySubjects
  );

  useEffect(() => {
    if (activeTab === 'live') {
      fetch(`/api/teachx/live?courseid=${encodeURIComponent(courseId)}`)
        .then((res) => res.json())
        .then((res) => {
          setLiveState({
            key: liveKey,
            live: res && res.data && Array.isArray(res.data.live) ? res.data.live : [],
            upcoming:
              res && res.data && Array.isArray(res.data.upcoming) ? res.data.upcoming : [],
          });
        })
        .catch(() => setLiveState({ key: liveKey, live: [], upcoming: [] }));
    } else if (activeTab === 'tests' && testsState.key !== testsKey) {
      fetch(`/api/teachx/tests?courseid=${encodeURIComponent(courseId)}`)
        .then((res) => res.json())
        .then((res) => {
          setTestsState({
            key: testsKey,
            tests: res && Array.isArray(res.data) ? res.data : [],
          });
        })
        .catch(() => setTestsState({ key: testsKey, tests: [] }));
    }
  }, [activeTab, courseId, liveKey, testsKey, testsState.key]);

  return (
    <div className="min-h-screen pandeyji-root pb-12 relative">
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-pink-100 px-5 py-4 flex flex-col gap-5 shadow-[0_6px_24px_rgba(236,72,153,0.08)]">
        <div className="flex items-center justify-center relative max-w-[1000px] w-full mx-auto">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Batches"
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-pink-50 border border-pink-200 text-gray-800 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-pink-100 hover:border-pink-300 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-white border border-pink-200 flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.15)] overflow-hidden">
              <img
                src={BRAND_LOGO_URL}
                alt="PANDEY JI Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 font-edu-syne tracking-wide m-0">
              PANDEY <span className="text-themePink">JI</span> · {brandTitle || 'RWA'}
            </h2>
          </div>
        </div>

        <div className="flex bg-pink-50/80 backdrop-blur-md p-1.5 rounded-2xl border border-pink-100 gap-1.5 max-w-[500px] mx-auto w-full shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`flex-1 text-center py-3 px-2 text-[13px] font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'content'
                ? 'bg-white text-themePinkDeep shadow-[0_2px_10px_rgba(236,72,153,0.15)]'
                : 'text-pink-400 hover:bg-white/60 hover:text-themePinkDeep'
            }`}
          >
            Contents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex-1 text-center py-3 px-2 text-[13px] font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'live'
                ? 'bg-white text-themePinkDeep shadow-[0_2px_10px_rgba(236,72,153,0.15)]'
                : 'text-pink-400 hover:bg-white/60 hover:text-themePinkDeep'
            }`}
          >
            Live Classes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`flex-1 text-center py-3 px-2 text-[13px] font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tests'
                ? 'bg-white text-themePinkDeep shadow-[0_2px_10px_rgba(236,72,153,0.15)]'
                : 'text-pink-400 hover:bg-white/60 hover:text-themePinkDeep'
            }`}
          >
            Test Series
          </button>
        </div>
      </header>

      <div className="p-6 max-w-[1000px] mx-auto">
        <div className="mb-4 text-xs text-pink-400 font-medium">
          Batch: <span className="text-gray-800 font-semibold">{batch.title}</span>
        </div>

        {activeTab === 'content' && (
          <div>
            {isLoadingSubjects ? (
              <div className="text-center text-pink-400 text-sm py-8 font-medium">
                Loading subjects...
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-12 px-5 text-pink-400 border border-dashed border-pink-200 rounded-[20px] mt-5 bg-white/60">
                <div className="text-3xl mb-3">📭</div>
                <div className="text-sm font-semibold text-gray-800 mb-1">
                  Couldn&apos;t load subjects right now
                </div>
                <div className="text-xs mb-5">
                  The source site is busy or briefly unreachable. Tap retry — your content
                  usually appears in a few seconds.
                </div>
                <button
                  type="button"
                  onClick={handleRetrySubjects}
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
              <div className="flex flex-col gap-4">
                {subjects.map((subject) => (
                  <div
                    key={subject.subjectid}
                    onClick={() => onSelectSubject(subject)}
                    className="flex items-center bg-white/90 hover:bg-white border border-pink-100 hover:border-themePink/40 rounded-[20px] p-3.5 gap-4 transition-all cursor-pointer shadow-[0_3px_14px_rgba(236,72,153,0.08)] hover:-translate-y-1"
                  >
                    <div className="w-[90px] h-[64px] rounded-xl bg-pink-50 shrink-0 border border-pink-100 relative overflow-hidden flex items-center justify-center">
                      {subject.subject_logo ? (
                        <img
                          src={subject.subject_logo}
                          alt={subject.subject_name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-6 h-6 text-themePink/80" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-[15px] font-bold text-gray-900 mb-1.5 line-clamp-2 font-edu-syne">
                        {subject.subject_name}
                      </div>
                      <div className="text-xs text-pink-400 font-medium">
                        Tap to view topics
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSubject(subject);
                      }}
                      className="bg-gradient-to-br from-themePink to-themePinkDeep text-white border-0 py-2.5 px-4 rounded-xl text-[13px] font-bold cursor-pointer shadow-[0_4px_12px_rgba(236,72,153,0.3)] whitespace-nowrap shrink-0"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'live' && (
          <div>
            {isLoadingLive ? (
              <div className="text-center text-pink-400 text-sm py-8 font-medium">
                Checking schedule...
              </div>
            ) : liveData.live.length === 0 && liveData.upcoming.length === 0 ? (
              <div className="text-center py-12 px-5 text-pink-400 border border-dashed border-pink-200 rounded-[20px] mt-5 bg-white/60">
                No schedule found at the moment.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {liveData.live.length > 0 && (
                  <>
                    <div className="text-base font-bold mt-4 mb-2 flex items-center gap-2.5 font-edu-syne text-gray-900">
                      <span className="w-1 h-[18px] bg-themePink rounded" />
                      Live Now
                    </div>
                    {liveData.live.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onOpenLive(item)}
                        className="flex items-center bg-white/90 hover:bg-white border border-pink-100 hover:border-themePink/40 rounded-[20px] p-3.5 gap-4 transition-all cursor-pointer"
                      >
                        <div className="w-[90px] h-[64px] rounded-xl bg-pink-50 shrink-0 border border-pink-100 overflow-hidden flex items-center justify-center">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.Title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="w-6 h-6 text-themeGreen" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block text-[10px] font-extrabold px-2 py-1 rounded bg-themeGreen/10 text-themeGreen border border-themeGreen/25 mb-1.5">
                            LIVE
                          </span>
                          <div className="text-[15px] font-bold text-gray-900 mb-1 line-clamp-2 font-edu-syne">
                            {item.Title}
                          </div>
                          <div className="text-xs text-pink-400 font-medium">
                            {item.date_and_time || 'Join Now'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {liveData.upcoming.length > 0 && (
                  <>
                    <div className="text-base font-bold mt-4 mb-2 flex items-center gap-2.5 font-edu-syne text-gray-900">
                      <span className="w-1 h-[18px] bg-themePink rounded" />
                      Upcoming Classes
                    </div>
                    {liveData.upcoming.map((item) => (
                      <div
                        key={item.id}
                        onClick={() =>
                          setScheduleModalMsg(`Scheduled for: ${item.date_and_time || 'Soon'}`)
                        }
                        className="flex items-center bg-white/90 hover:bg-white border border-pink-100 hover:border-themePink/40 rounded-[20px] p-3.5 gap-4 transition-all cursor-pointer"
                      >
                        <div className="w-[90px] h-[64px] rounded-xl bg-pink-50 shrink-0 border border-pink-100 overflow-hidden flex items-center justify-center">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.Title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="w-6 h-6 text-themePink" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block text-[10px] font-extrabold px-2 py-1 rounded bg-pink-50 text-themePinkDeep border border-pink-200 mb-1.5">
                            UPCOMING
                          </span>
                          <div className="text-[15px] font-bold text-gray-900 mb-1 line-clamp-2 font-edu-syne">
                            {item.Title}
                          </div>
                          <div className="text-xs text-pink-400 font-medium">
                            {item.date_and_time || 'Scheduled'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tests' && (
          <div>
            {isLoadingTests ? (
              <div className="text-center text-pink-400 text-sm py-8 font-medium">
                Loading tests...
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-12 px-5 text-pink-400 border border-dashed border-pink-200 rounded-[20px] mt-5 bg-white/60">
                No Test Series available right now.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {tests.map((test) => (
                  <div
                    key={test.id}
                    onClick={() =>
                      setScheduleModalMsg(`Test Series "${test.title}" is ready in the app.`)
                    }
                    className="flex items-center bg-white/90 hover:bg-white border border-pink-100 hover:border-themePink/40 rounded-[20px] p-3.5 gap-4 transition-all cursor-pointer"
                  >
                    <div className="w-[90px] h-[64px] rounded-xl bg-pink-50 shrink-0 border border-pink-100 overflow-hidden flex items-center justify-center">
                      {test.logo ? (
                        <img
                          src={test.logo}
                          alt={test.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-6 h-6 text-themePink" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-gray-900 mb-1.5 line-clamp-2 font-edu-syne">
                        {test.title}
                      </div>
                      <div className="text-xs text-pink-400 font-medium">
                        Total Tests: {test.totaltesttitle || '0'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="bg-gradient-to-br from-themePink to-themePinkDeep text-white border-0 py-2.5 px-4 rounded-xl text-[13px] font-bold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {scheduleModalMsg && (
        <div className="fixed inset-0 bg-pink-950/40 backdrop-blur-md z-50 flex items-center justify-center p-5">
          <div className="bg-white w-full max-w-[360px] p-7 rounded-3xl border border-pink-200 text-center shadow-2xl">
            <div className="text-4xl mb-4">⏳</div>
            <div className="text-xl font-extrabold mb-2.5 font-edu-syne text-gray-900">
              Schedule Info
            </div>
            <div className="text-pink-400 mb-6 text-sm leading-relaxed">
              {scheduleModalMsg}
            </div>
            <button
              type="button"
              onClick={() => setScheduleModalMsg(null)}
              className="w-full py-3.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl text-sm font-bold text-themePinkDeep cursor-pointer transition-all"
            >
              Okay, Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
