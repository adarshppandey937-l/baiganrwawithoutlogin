import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  CheckCircle,
  ChevronDown,
  FolderOpen,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import staticBatchesJson from './data/batches.json';
import { WISHLIST_STORAGE_KEY } from './constants';
import type { Batch, MediaModalState, TabKey, ToastState, ViewState } from './types';
import { Navbar } from './components/Navbar';
import { BatchCard } from './components/BatchCard';
import { SubjectView } from './components/SubjectView';
import { TopicView } from './components/TopicView';
import { ContentView } from './components/ContentView';
import { MediaOptionsModal } from './components/MediaOptionsModal';
import { PlayerView } from './components/PlayerView';
import { WhatsAppPopup } from './components/WhatsAppPopup';

const INITIAL_BATCHES: Batch[] = [
  ...((staticBatchesJson as { new?: Batch[]; old?: Batch[] }).new || []),
  ...((staticBatchesJson as { new?: Batch[]; old?: Batch[] }).old || []),
];

function filterBatches(
  batches: Batch[],
  tab: TabKey,
  wishlist: string[],
  searchQuery: string
): Batch[] {
  const query = searchQuery.toLowerCase().trim();
  let list: Batch[];

  if (tab === 'wishlist') {
    const dedup = new Map<string, Batch>();
    for (const batch of batches) {
      dedup.set(String(batch.id), batch);
    }
    const wishlistSet = new Set(wishlist.map(String));
    list = Array.from(dedup.values()).filter((b) => wishlistSet.has(String(b.id)));
  } else {
    list = [...batches];
  }

  if (query) {
    list = list.filter(
      (b) => b.title.toLowerCase().includes(query) || String(b.id).toLowerCase().includes(query)
    );
  }
  return list;
}

function toggleWishlistId(
  current: string[],
  batchId: string
): { wishlist: string[]; isEnrolled: boolean } {
  const idStr = String(batchId);
  const normalized = current.map(String);
  const idx = normalized.indexOf(idStr);
  if (idx === -1) {
    return { wishlist: [...normalized, idStr], isEnrolled: true };
  }
  const next = [...normalized];
  next.splice(idx, 1);
  return { wishlist: next, isEnrolled: false };
}

export default function App() {
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [currentTab, setCurrentTab] = useState<TabKey>('new');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    message: 'Notification',
    type: 'success',
    visible: false,
  });
  const [viewState, setViewState] = useState<ViewState>({ view: 'home' });
  const [brandTitle, setBrandTitle] = useState('RWA');
  const [mediaModal, setMediaModal] = useState<MediaModalState | null>(null);
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(true);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type, visible: true });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        setWishlist(saved.map(String));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    fetch('/batches.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && (Array.isArray(data.new) || Array.isArray(data.old))) {
          const merged = [...(data.new || []), ...(data.old || [])];
          if (merged.length > 0) {
            setBatches(merged);
          }
        }
      })
      .catch(() => {});

    fetch('/api/rwa?app=RWA&i=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && (data['stylishName(brand)'] || data.name)) {
          setBrandTitle(data['stylishName(brand)'] || data.name);
        }
      })
      .catch(() => {});

    fetch('/api/rwa?path=batches&all=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        const apiBatches = res && Array.isArray(res.data) ? res.data : [];
        if (apiBatches.length === 0) return;
        setBatches((prev) => {
          const seen = new Set(prev.map((b) => String(b.id)));
          const extras: Batch[] = apiBatches
            .filter(
              (item: Record<string, unknown>) =>
                item && item.id != null && !seen.has(String(item.id))
            )
            .map((item: Record<string, unknown>) => ({
              id: item.id as string | number,
              title: String(item.title || 'Course'),
              thumbnail: String(item.thumbnail || ''),
            }));
          return extras.length > 0 ? [...prev, ...extras] : prev;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get('id') || params.get('courseid');
      const subjectId = params.get('subjectid');
      const topicId = params.get('topicid');

      if (courseId && batches.length > 0) {
        const matchedBatch = batches.find((b) => String(b.id) === String(courseId)) || {
          id: courseId,
          title: `Batch #${courseId}`,
          thumbnail: '',
        };
        if (subjectId && topicId) {
          setViewState({
            view: 'content',
            batch: matchedBatch,
            subject: { subjectid: subjectId, subject_name: 'Subject' },
            topic: { topicid: topicId, topic_name: 'Topic' },
          });
        } else if (subjectId) {
          setViewState({
            view: 'topic',
            batch: matchedBatch,
            subject: { subjectid: subjectId, subject_name: 'Subject' },
          });
        } else {
          setViewState({ view: 'subject', batch: matchedBatch });
        }
      } else {
        setViewState({ view: 'home' });
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [batches]);

  const filteredBatches = useMemo(
    () => filterBatches(batches, currentTab, wishlist, searchQuery),
    [batches, currentTab, wishlist, searchQuery]
  );

  const { visibleBatches, hasMore } = useMemo(() => {
    const count = Math.min(visibleCount, filteredBatches.length);
    return {
      visibleBatches: filteredBatches.slice(0, count),
      hasMore: count < filteredBatches.length,
    };
  }, [filteredBatches, visibleCount]);

  const handleSwitchTab = (tab: TabKey) => {
    setCurrentTab(tab);
    setSearchQuery('');
    setVisibleCount(12);
    setViewState({ view: 'home' });
  };

  const handleToggleEnroll = (batchId: string) => {
    const { wishlist: nextWishlist, isEnrolled } = toggleWishlistId(wishlist, batchId);
    setWishlist(nextWishlist);
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(nextWishlist));
    } catch {
      // ignore storage errors
    }
    if (isEnrolled) {
      showToast('Enrolled in batch!', 'success');
    }
  };

  const whatsappPopupNode = (
    <WhatsAppPopup
      open={showWhatsAppPopup}
      onClose={() => setShowWhatsAppPopup(false)}
    />
  );

  if (viewState.view === 'player') {
    return (
      <>
        <PlayerView
          url={viewState.url}
          title={viewState.title}
          mode={viewState.mode}
          onBack={() =>
            setViewState({
              view: 'content',
              batch: viewState.prevState.batch,
              subject: viewState.prevState.subject,
              topic: viewState.prevState.topic,
            })
          }
        />
        {whatsappPopupNode}
      </>
    );
  }

  if (viewState.view === 'subject') {
    return (
      <>
        <SubjectView
          batch={viewState.batch}
          brandTitle={brandTitle}
          onBack={() => setViewState({ view: 'home' })}
          onSelectSubject={(subject) =>
            setViewState({ view: 'topic', batch: viewState.batch, subject })
          }
          onOpenLive={() => {
            showToast('Opening live stream...', 'success');
          }}
        />
        {whatsappPopupNode}
      </>
    );
  }

  if (viewState.view === 'topic') {
    return (
      <>
        <TopicView
          batch={viewState.batch}
          subject={viewState.subject}
          brandTitle={brandTitle}
          onBack={() => setViewState({ view: 'subject', batch: viewState.batch })}
          onSelectTopic={(topic) =>
            setViewState({
              view: 'content',
              batch: viewState.batch,
              subject: viewState.subject,
              topic,
            })
          }
        />
        {whatsappPopupNode}
      </>
    );
  }

  if (viewState.view === 'content') {
    return (
      <>
        <ContentView
          batch={viewState.batch}
          subject={viewState.subject}
          topic={viewState.topic}
          brandTitle="ROJGAR WITH ANKIT"
          onBack={() =>
            setViewState({
              view: 'topic',
              batch: viewState.batch,
              subject: viewState.subject,
            })
          }
          onSelectVideo={(item) => {
            const prevState = {
              batch: viewState.batch,
              subject: viewState.subject,
              topic: viewState.topic,
            };
            if (item.youtube_id && item.embed_url) {
              setViewState({
                view: 'player',
                url: item.embed_url,
                title: item.Title || item.title || 'Lecture',
                mode: 'youtube',
                prevState,
              });
            } else {
              setMediaModal({
                batch: viewState.batch,
                item,
                mode: 'video',
                subject: viewState.subject,
                topic: viewState.topic,
              });
            }
          }}
          onSelectPdf={(item, pdfType) =>
            setMediaModal({
              batch: viewState.batch,
              item,
              mode: 'pdf',
              pdfType,
              subject: viewState.subject,
              topic: viewState.topic,
            })
          }
        />

        {mediaModal && (
          <MediaOptionsModal
            batch={mediaModal.batch}
            item={mediaModal.item}
            mode={mediaModal.mode}
            pdfType={mediaModal.pdfType}
            onClose={() => setMediaModal(null)}
            onPlayVideo={(url, title) => {
              const prevState = {
                batch: mediaModal.batch,
                subject: mediaModal.subject,
                topic: mediaModal.topic,
              };
              setMediaModal(null);
              setViewState({ view: 'player', url, title, mode: 'video', prevState });
            }}
            onOpenPdf={(url, title) => {
              const prevState = {
                batch: mediaModal.batch,
                subject: mediaModal.subject,
                topic: mediaModal.topic,
              };
              setMediaModal(null);
              setViewState({ view: 'player', url, title, mode: 'pdf', prevState });
            }}
          />
        )}
        {whatsappPopupNode}
      </>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col pandeyji-root pb-12">
      {toast.visible && (
        <div
          id="toast"
          role="status"
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-medium text-sm border toast-enter shadow-[0_10px_30px_rgba(190,24,93,0.18)] ${
            toast.type === 'success'
              ? 'bg-white border-green-200 text-green-600'
              : 'bg-white border-red-200 text-red-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span id="toast-msg">{toast.message}</span>
        </div>
      )}

      <Navbar
        currentTab={currentTab}
        onSwitchTab={handleSwitchTab}
        onResetHome={() => {
          setCurrentTab('new');
          setSearchQuery('');
          setVisibleCount(12);
          setViewState({ view: 'home' });
        }}
        wishlistCount={wishlist.length}
      />

      <main className="flex-1 w-full max-w-[90rem] mx-auto px-4 sm:px-6 pt-6 relative z-10">
        <div
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 fade-in-pop"
          style={{ animationDelay: '50ms' }}
        >
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto hide-scroll w-full md:w-auto p-1 bg-white rounded-xl border border-pink-100 shadow-sm">
            <button
              id="tab-new"
              type="button"
              onClick={() => handleSwitchTab('new')}
              className={`tab-btn shrink-0 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                currentTab === 'new'
                  ? 'bg-pink-50 text-themePinkDeep border-pink-200'
                  : 'bg-transparent text-pink-400 hover:text-themePinkDeep border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-themePink" />
              Latest <span className="hidden sm:inline">Batches</span>
              <span
                id="total-batch-count"
                className="bg-themePink text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded"
              >
                {batches.length}
              </span>
            </button>

            <button
              id="tab-wishlist"
              type="button"
              onClick={() => handleSwitchTab('wishlist')}
              className={`tab-btn shrink-0 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                currentTab === 'wishlist'
                  ? 'bg-pink-50 text-themePinkDeep border-pink-200'
                  : 'bg-transparent text-pink-400 hover:text-themePinkDeep border-transparent'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">My </span>Enrolled
              {wishlist.length > 0 && (
                <span
                  id="wishlist-count"
                  className="bg-themeGreen text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded"
                >
                  {wishlist.length}
                </span>
              )}
            </button>
          </div>

          <div className="relative w-full md:w-[350px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-pink-300" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              id="searchInput"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(12);
              }}
              placeholder="Search batches..."
              aria-label="Search batches..."
              className="w-full bg-white border border-pink-200 text-gray-900 text-sm rounded-lg block pl-10 pr-10 py-2.5 transition-all placeholder:text-pink-300 focus:outline-none focus:border-themePink/60 focus:bg-pink-50/40 shadow-sm"
            />
            {searchQuery.length > 0 && (
              <button
                id="clearSearchBtn"
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery('');
                  setVisibleCount(12);
                  searchInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-pink-300 hover:text-themePinkDeep transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {filteredBatches.length === 0 ? (
          <div
            id="emptyState"
            className="flex flex-col items-center justify-center py-20 text-center fade-in-pop"
          >
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mb-4 border border-pink-100">
              <FolderOpen className="w-8 h-8 text-pink-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">No Batches Found</h3>
            <p className="text-pink-400 text-sm">
              Try adjusting your search or enrolling in new batches.
            </p>
          </div>
        ) : (
          <>
            <div
              id="batchGrid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {visibleBatches.map((batch, idx) => (
                <BatchCard
                  key={`${batch.id}-${idx}`}
                  batch={batch}
                  index={idx}
                  isEnrolled={wishlist.includes(String(batch.id))}
                  onToggleEnroll={handleToggleEnroll}
                  onStudyClick={(selected) => setViewState({ view: 'subject', batch: selected })}
                />
              ))}
            </div>

            {hasMore && (
              <div
                id="loadMoreContainer"
                className="w-full flex justify-center mt-10 mb-6 fade-in-pop"
              >
                <button
                  id="loadMoreBtn"
                  type="button"
                  disabled={isLoadingMore}
                  onClick={() => {
                    if (isLoadingMore) return;
                    setIsLoadingMore(true);
                    window.setTimeout(() => {
                      setVisibleCount((prev) => prev + 12);
                      setIsLoadingMore(false);
                    }, 300);
                  }}
                  className="px-8 py-2.5 bg-white border border-pink-200 hover:border-themePink/50 rounded-lg text-gray-900 font-semibold text-sm transition-all btn-click-effect flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-pink-400" /> Loading
                    </>
                  ) : (
                    <>
                      Load More <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      {whatsappPopupNode}
    </div>
  );
}
