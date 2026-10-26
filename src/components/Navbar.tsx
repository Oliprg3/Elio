import React from 'react';
import { Search, Clapperboard, Tv, TrendingUp, Bookmark, Settings, Home, LayoutGrid, MonitorPlay } from 'lucide-react';
import { TMDBMedia } from '../types/tmdb';
import { detectIsTVDevice, tvNav } from '../services/tvNavigation';
import { ElioLogo } from './ElioLogo';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
  href?: string;
}

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onSelectMedia: (type: 'movie' | 'tv', id: number) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onOpenSettings: () => void;
  watchlistCount: number;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

const NATIVE_SHELL_UA_FLAG = 'elio-native-shell';

function isNativeShell(): boolean {
  try {
    return navigator.userAgent.includes(NATIVE_SHELL_UA_FLAG);
  } catch {
    return false;
  }
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  watchlistCount,
}) => {
  // "Get App (.apk)" entry only appears on TV devices (manual switch or auto-detect)
  const [isTV, setIsTV] = React.useState(() => detectIsTVDevice());
  const [apkHref] = React.useState(() => (isNativeShell() ? '/__update__/elio-tv.apk' : '/elio-tv.apk'));
  React.useEffect(() => tvNav.subscribe((tv) => setIsTV(tv)), []);

  // Left sidebar navigation items (Home, Search, Movies, Shows, etc.)
  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'movies', label: 'Movies', icon: Clapperboard },
    { id: 'tv', label: 'Shows', icon: Tv },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'genres', label: 'Categories', icon: LayoutGrid },
    { id: 'watchlist', label: 'My List', icon: Bookmark, badge: watchlistCount > 0 ? watchlistCount : undefined },
  ];
  if (isTV) {
    navItems.push({ id: 'get-app', label: 'Get App', icon: MonitorPlay, href: apkHref });
  }

  return (
    <>
      {/* Desktop Left Sidebar Navigation */}
      <aside
        id="main-sidebar"
        aria-label="Sidebar Navigation"
        className="hidden md:flex fixed top-0 bottom-0 left-0 z-50 w-16 lg:w-20 bg-[#000000] border-r border-white/[0.06] flex-col items-center justify-between py-6 select-none"
      >
        {/* Top Logo */}
        <div className="flex flex-col items-center">
          <button
            id="brand-logo-btn"
            data-is-logo="true"
            onClick={() => onSelectTab('home')}
            className="p-2 text-white hover:opacity-80 transition-all cursor-pointer focus:outline-none bg-transparent"
            aria-label="Home"
            title="Home"
          >
            <ElioLogo size="md" />
          </button>
        </div>

        {/* Navigation Items (Home, Search, Movies, Shows...) */}
        <nav className="flex flex-col items-center gap-4 lg:gap-5 w-full px-2 my-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const content = (
              <>
                {/* Active Left Indicator Bar */}
                {isActive && !item.href && (
                  <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                )}

                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-white' : 'group-hover:scale-110'
                  }`}
                  strokeWidth={1.5}
                />

                {/* Subtitle label for instant recognition */}
                <span
                  className={`text-[9px] tracking-tight mt-1 transition-colors ${
                    isActive ? 'text-white font-semibold' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                >
                  {item.label}
                </span>

                {/* Watchlist badge dot */}
                {item.badge !== undefined && (
                  <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-white rounded-full" />
                )}

                {/* Minimalist Floating Tooltip on Hover */}
                <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-[#111114] border border-white/10 text-[11px] font-medium text-white opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap shadow-xl z-50">
                  {item.label}
                </span>
              </>
            );

            if (item.href) {
              return (
                <a
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  href={item.href}
                  download="elio-tv.apk"
                  title={item.label}
                  aria-label={item.label}
                  className="group relative flex flex-col items-center justify-center w-12 h-12 text-zinc-300 hover:text-white transition-colors cursor-pointer bg-transparent focus:outline-none"
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`group relative flex flex-col items-center justify-center w-12 h-12 transition-colors cursor-pointer bg-transparent focus:outline-none ${
                  isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {content}
              </button>
            );
          })}
        </nav>

        {/* Bottom Settings Button */}
        <div className="flex flex-col items-center w-full px-2">
          <button
            id="settings-modal-btn"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings"
            className="group relative flex flex-col items-center justify-center w-12 h-12 text-zinc-500 hover:text-white transition-colors cursor-pointer bg-transparent focus:outline-none"
          >
            <Settings className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" strokeWidth={1.5} />
            <span className="text-[9px] tracking-tight mt-1 text-zinc-500 group-hover:text-zinc-300">
              Settings
            </span>

            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded bg-[#111114] border border-white/10 text-[11px] font-medium text-white opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap shadow-xl z-50">
              Settings
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#000000]/95 backdrop-blur-2xl border-t border-white/[0.06] py-2 px-2 z-50 flex items-center justify-around overflow-x-auto no-scrollbar shadow-2xl select-none"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const content = (
            <>
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              <span className="whitespace-nowrap leading-none text-[9px]">{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </>
          );
          if (item.href) {
            return (
              <a
                key={item.id}
                id={`mobile-nav-${item.id}`}
                href={item.href}
                download="elio-tv.apk"
                aria-label={item.label}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[10px] transition-colors relative min-w-[44px] shrink-0 cursor-pointer bg-transparent focus:outline-none ${
                  isActive ? 'text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {content}
              </a>
            );
          }
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 text-[10px] transition-colors relative min-w-[44px] shrink-0 cursor-pointer bg-transparent focus:outline-none ${
                isActive ? 'text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {content}
            </button>
          );
        })}
      </nav>
    </>
  );
};
