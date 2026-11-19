import { Bookmark, LayoutGrid } from 'lucide-react';
import { BRAND_LOGO_URL } from '../constants';
import type { TabKey } from '../types';

interface NavbarProps {
  currentTab: TabKey;
  onSwitchTab: (tab: TabKey) => void;
  onResetHome: () => void;
  wishlistCount: number;
}

export function Navbar({ onSwitchTab, onResetHome, wishlistCount }: NavbarProps) {
  return (
    <nav className="w-full z-40 nav-glass h-[70px] sticky top-0">
      <div className="max-w-[90rem] mx-auto px-3 sm:px-6 h-full flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onResetHome}
          aria-label="PANDEY JI Home"
          className="flex items-center gap-2 sm:gap-3 cursor-pointer btn-click-effect bg-transparent border-0 p-0 text-left min-w-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-pink-200 rounded-lg flex items-center justify-center relative z-10 overflow-hidden shrink-0 shadow-[0_0_12px_rgba(236,72,153,0.18)]">
            <img
              src={BRAND_LOGO_URL}
              alt="PANDEY JI Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-[15px] sm:text-xl font-black tracking-tight sm:tracking-wider text-gray-900 font-edu-syne whitespace-nowrap">
            PANDEY <span className="text-themePink">JI</span>
          </h1>
        </button>

        <div className="hidden md:flex items-center gap-6 shrink-0">
          <button
            type="button"
            onClick={() => onSwitchTab('new')}
            className="text-gray-900 hover:text-themePink font-bold text-sm transition-colors flex items-center gap-2 btn-click-effect cursor-pointer whitespace-nowrap shrink-0"
          >
            <LayoutGrid className="w-4 h-4" /> Batches
          </button>
          <button
            type="button"
            onClick={() => onSwitchTab('wishlist')}
            className="text-pink-400 hover:text-themePink font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Bookmark className="w-4 h-4" /> My Enrollments
          </button>
        </div>

        <div className="md:hidden flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSwitchTab('wishlist')}
            aria-label="My Enrollments"
            className="text-pink-500 p-2 border border-pink-200 rounded-lg hover:text-themePink hover:border-themePink transition-colors btn-click-effect relative bg-white cursor-pointer shrink-0"
          >
            <Bookmark className="w-4 h-4" />
            {wishlistCount > 0 && (
              <span
                id="mobile-wishlist-indicator"
                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-themeGreen rounded-full"
              />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
