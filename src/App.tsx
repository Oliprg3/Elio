import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBillboard } from './components/HeroBillboard';
import { MediaTray } from './components/MediaTray';
import { Footer } from './components/Footer';
import { TMDBMedia, WatchHistoryItem } from './types/tmdb';
import { getMediaReleaseStatus } from './services/releaseStatus';
import {
  getTrendingAll,
  getPopularMovies,
  getPopularTV,
  getTopRated,
  getByGenre,
  getByProvider,
} from './services/tmdb';
import { CURATED_MOVIES, CURATED_TV } from './services/tmdbData';
import { getWatchlist, getWatchHistory } from './services/storage';
import { tvNav } from './services/tvNavigation';
import { adBlocker } from './services/adBlocker';

// Code-splitting non-critical views and modals for fast initial bundle & parsing
const WatchView = lazy(() => import('./components/WatchView').then((m) => ({ default: m.WatchView })));
const MoviesView = lazy(() => import('./components/MoviesView').then((m) => ({ default: m.MoviesView })));
const TVShowsView = lazy(() => import('./components/TVShowsView').then((m) => ({ default: m.TVShowsView })));
const TrendingView = lazy(() => import('./components/TrendingView').then((m) => ({ default: m.TrendingView })));
const GenresView = lazy(() => import('./components/GenresView').then((m) => ({ default: m.GenresView })));
const WatchlistView = lazy(() => import('./components/WatchlistView').then((m) => ({ default: m.WatchlistView })));
const NetflixSearchView = lazy(() => import('./components/NetflixSearchView').then((m) => ({ default: m.NetflixSearchView })));
const MediaDetailModal = lazy(() => import('./components/MediaDetailModal').then((m) => ({ default: m.MediaDetailModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })));
const NotReleasedModal = lazy(() => import('./components/NotReleasedModal').then((m) => ({ default: m.NotReleasedModal })));

const ViewLoadingFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
  </div>
);

interface WatchRoute {
  type: 'movie' | 'tv';
  id: number;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [watchRoute, setWatchRoute] = useState<WatchRoute | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Home Trays Data - Initialized with instant curated media for 0ms page load
  const [trendingHero, setTrendingHero] = useState<TMDBMedia[]>([...CURATED_MOVIES.slice(0, 5), ...CURATED_TV.slice(0, 5)]);
  const [popularMovies, setPopularMovies] = useState<TMDBMedia[]>(CURATED_MOVIES);
  const [popularTV, setPopularTV] = useState<TMDBMedia[]>(CURATED_TV);
  const [topRated, setTopRated] = useState<TMDBMedia[]>(CURATED_MOVIES.filter((m) => (m.vote_average || 0) >= 8));
  const [actionHits, setActionHits] = useState<TMDBMedia[]>(CURATED_MOVIES.filter((m) => m.genre_ids?.includes(28)));
  const [scifiHits, setScifiHits] = useState<TMDBMedia[]>(CURATED_MOVIES.filter((m) => m.genre_ids?.includes(878)));
  
  // Provider Specific Trays
  const [netflixMedia, setNetflixMedia] = useState<TMDBMedia[]>([]);
  const [hboMaxShows, setHboMaxShows] = useState<TMDBMedia[]>([]);
  const [disneyMedia, setDisneyMedia] = useState<TMDBMedia[]>([]);
  const [primeMedia, setPrimeMedia] = useState<TMDBMedia[]>([]);
  const [appleMedia, setAppleMedia] = useState<TMDBMedia[]>([]);
  const [animeHits, setAnimeHits] = useState<TMDBMedia[]>([]);
  const [comedyHits, setComedyHits] = useState<TMDBMedia[]>([]);

  const [watchlist, setWatchlist] = useState<TMDBMedia[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loadingHome, setLoadingHome] = useState(false);

  // Modals
  const [detailModalItem, setDetailModalItem] = useState<TMDBMedia | null>(null);
  const [notReleasedModalItem, setNotReleasedModalItem] = useState<TMDBMedia | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load storage state
  const refreshStorageData = useCallback(() => {
    setWatchlist(getWatchlist());
    setHistory(getWatchHistory());
  }, []);

  // Parse Initial URL / Route on load (support /watch/movie/533535 or params)
  useEffect(() => {
    const parseUrl = () => {
      const path = window.location.pathname;
      const match = path.match(/\/watch\/(movie|tv)\/(\d+)/i);
      if (match) {
        setWatchRoute({
          type: match[1] as 'movie' | 'tv',
          id: parseInt(match[2], 10),
        });
        return;
      }

      // Also check search params as fallback
      const searchParams = new URLSearchParams(window.location.search);
      const qType = searchParams.get('type') as 'movie' | 'tv' | null;
      const qId = searchParams.get('id');
      if (qType && qId) {
        setWatchRoute({
          type: qType,
          id: parseInt(qId, 10),
        });
        return;
      }

      // Any non-watch URL (including browser/remote Back) exits the player.
      setWatchRoute((prev) => (prev ? null : prev));
      refreshStorageData();
    };

    parseUrl();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, [refreshStorageData]);

  // High-performance Staged / Progressive Catalogue Loading
  const loadHomeCatalog = useCallback(() => {
    try {
      // Stage 1: Critical Viewport (Hero & Top Primary Trays)
      getTrendingAll('day').then((res) => { if (res && res.length > 0) setTrendingHero(res); });
      getPopularMovies(1).then((res) => { if (res && res.length > 0) setPopularMovies(res); });
      getPopularTV(1).then((res) => { if (res && res.length > 0) setPopularTV(res); });

      // Stage 2: Secondary Trays (Staggered by 150ms to unblock network & hero paint)
      setTimeout(() => {
        getTopRated('movie', 1).then((res) => { if (res && res.length > 0) setTopRated(res); });
        getByGenre('movie', 28, 1).then((res) => { if (res && res.length > 0) setActionHits(res); });
        getByGenre('movie', 878, 1).then((res) => { if (res && res.length > 0) setScifiHits(res); });
      }, 150);

      // Stage 3: Below-the-fold Provider Trays & Deep Categories (Loaded gracefully on idle)
      const idleCallback = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 600));
      idleCallback(() => {
        getByProvider('tv', 8, 1).then((res) => { if (res && res.length > 0) setNetflixMedia(res); });
        getByProvider('tv', 384, 1).then((res) => { if (res && res.length > 0) setHboMaxShows(res); });
        
        setTimeout(() => {
          getByProvider('movie', 337, 1).then((res) => { if (res && res.length > 0) setDisneyMedia(res); });
          getByProvider('movie', 119, 1).then((res) => { if (res && res.length > 0) setPrimeMedia(res); });
          getByProvider('tv', 350, 1).then((res) => { if (res && res.length > 0) setAppleMedia(res); });
          getByGenre('movie', 35, 1).then((res) => { if (res && res.length > 0) setComedyHits(res); });
          getByGenre('tv', 16, 1).then((res) => { if (res && res.length > 0) setAnimeHits(res); });
        }, 300);
      });
    } catch (err) {
      console.error('Failed to load home catalog', err);
    } finally {
      setLoadingHome(false);
    }
  }, []);

  useEffect(() => {
    adBlocker.init();
  }, []);

  useEffect(() => {
    loadHomeCatalog();
    refreshStorageData();
  }, [loadHomeCatalog, refreshStorageData]);

  // On TV devices land the remote focus on the first usable element
  useEffect(() => {
    if (tvNav.getIsTV()) {
      const raf = requestAnimationFrame(() => tvNav.focusFirstAvailableElement());
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  // Handle Android TV remote Back key hierarchically
  useEffect(() => {
    tvNav.onBack(() => {
      if (detailModalItem) {
        setDetailModalItem(null);
        return true;
      }
      if (notReleasedModalItem) {
        setNotReleasedModalItem(null);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (watchRoute) {
        setWatchRoute(null);
        if (window.location.pathname !== '/') {
          window.history.replaceState({}, '', '/');
        }
        return true;
      }
      if (currentTab !== 'home') {
        setCurrentTab('home');
        if (window.location.pathname !== '/') {
          window.history.replaceState({}, '', '/');
        }
        return true;
      }
      return false;
    });
  }, [detailModalItem, notReleasedModalItem, isSettingsOpen, watchRoute, currentTab]);

  // Navigate to Watch Streaming Page (/watch/[type]/[id])
  const handleSelectMedia = (type: 'movie' | 'tv', id: number) => {
    setWatchRoute({ type, id });
    const targetUrl = `/watch/${type}/${id}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back from watch page
  const handleBackToBrowse = () => {
    setWatchRoute(null);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    refreshStorageData();
  };

  // Tab switcher
  const handleSelectTab = (tab: string) => {
    setWatchRoute(null);
    setCurrentTab(tab);
    if (window.location.pathname !== '/') {
       window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden">
      {/* Top Main Navbar - Hidden on Watch Route for Immersive Player */}
      {!watchRoute && (
        <Navbar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          onSelectMedia={handleSelectMedia}
          onUnreleased={(item) => setNotReleasedModalItem(item)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          watchlistCount={watchlist.length}
          searchQuery={searchQuery}
          onSearchQueryChange={(q) => setSearchQuery(q)}
        />
      )}

      {/* Content Container (Offset by sidebar on desktop) */}
      <div className={`flex-1 flex flex-col min-w-0 ${!watchRoute ? 'md:pl-16 lg:pl-20' : ''}`}>
        {/* Main Content Router */}
        <main className="flex-1 w-full bg-transparent pt-0 pb-16 md:pb-0">
          <AnimatePresence mode="wait">
          <motion.div
            key={watchRoute ? `watch-${watchRoute.id}` : currentTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            <Suspense fallback={<ViewLoadingFallback />}>
              {watchRoute ? (
                /* Dynamic Streaming Detail Page (/watch/[type]/[id]) */
                <WatchView
                  type={watchRoute.type}
                  id={watchRoute.id}
                  onBack={handleBackToBrowse}
                  onSelectMedia={handleSelectMedia}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistChange={refreshStorageData}
                />
              ) : currentTab === 'search' ? (
          <NetflixSearchView
            searchQuery={searchQuery}
            onSearchQueryChange={(q) => setSearchQuery(q)}
            onPlay={handleSelectMedia}
            onInfo={(item) => setDetailModalItem(item)}
            onUnreleased={(item) => setNotReleasedModalItem(item)}
            onWatchlistToggle={refreshStorageData}
          />
        ) : currentTab === 'movies' ? (
          <MoviesView
            onPlay={handleSelectMedia}
            onInfo={(item) => setDetailModalItem(item)}
            onUnreleased={(item) => setNotReleasedModalItem(item)}
            onWatchlistToggle={refreshStorageData}
          />
        ) : currentTab === 'tv' ? (
          <TVShowsView
            onPlay={handleSelectMedia}
            onInfo={(item) => setDetailModalItem(item)}
            onUnreleased={(item) => setNotReleasedModalItem(item)}
            onWatchlistToggle={refreshStorageData}
          />
        ) : currentTab === 'trending' ? (
          <TrendingView
            onPlay={handleSelectMedia}
            onInfo={(item) => setDetailModalItem(item)}
            onUnreleased={(item) => setNotReleasedModalItem(item)}
            onWatchlistToggle={refreshStorageData}
          />
        ) : currentTab === 'genres' ? (
          <GenresView
            onPlay={handleSelectMedia}
            onInfo={(item) => setDetailModalItem(item)}
            onUnreleased={(item) => setNotReleasedModalItem(item)}
            onWatchlistToggle={refreshStorageData}
          />
        ) : currentTab === 'watchlist' ? (
          <WatchlistView
            onPlay={handleSelectMedia}
            onInfo={(item) => setDetailModalItem(item)}
            onUnreleased={(item) => setNotReleasedModalItem(item)}
            onWatchlistToggle={refreshStorageData}
          />
        ) : (
          /* Home Screen with Cinematic Hero & Curated Trays */
          <div className="animate-fade-in">
            {/* Dynamic Hero Billboard */}
            <HeroBillboard
              items={trendingHero.length > 0 ? trendingHero : popularMovies}
              onPlay={handleSelectMedia}
              onMoreInfo={(item) => setDetailModalItem(item)}
              onUnreleased={(item) => setNotReleasedModalItem(item)}
              onWatchlistChange={refreshStorageData}
            />

            <div className="relative -mt-10 sm:-mt-16 md:-mt-24 z-20 space-y-4 pb-16">
              {/* Continue Watching (If history exists) */}
              {history.length > 0 && (
                <MediaTray
                  title="Continue Watching"
                  items={history.map((h) => ({
                    id: h.id,
                    title: h.type === 'movie' ? h.title : undefined,
                    name: h.type === 'tv' ? h.title : undefined,
                    overview: `Continue streaming ${h.title} right where you left off.`,
                    poster_path: h.poster_path,
                    backdrop_path: h.backdrop_path,
                    vote_average: h.vote_average,
                    vote_count: 100,
                    popularity: 100,
                    media_type: h.type,
                  }))}
                  historyItems={history}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}

              {/* My List Tray (If items exist) */}
              {watchlist.length > 0 && (
                <MediaTray
                  title="My List"
                  items={watchlist}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}

              {/* Top Trending Today */}
              <MediaTray
                title="Top Trending Today"
                items={trendingHero.slice(0, 10)}
                onPlay={handleSelectMedia}
                onInfo={(item) => setDetailModalItem(item)}
                onUnreleased={(item) => setNotReleasedModalItem(item)}
                onWatchlistToggle={refreshStorageData}
              />

              {/* elio+ Originals & Exclusives */}
              {netflixMedia.length > 0 && (
                <MediaTray
                  title="elio+ Originals & Exclusives"
                  items={netflixMedia}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}

              {/* Critically Acclaimed Series */}
              {hboMaxShows.length > 0 && (
                <MediaTray
                  title="Critically Acclaimed Series"
                  items={hboMaxShows}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}

              {/* Blockbuster Franchises */}
              {disneyMedia.length > 0 && (
                <MediaTray
                  title="Blockbuster Franchises"
                  items={disneyMedia}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}

              {/* Popular Movies */}
              <MediaTray
                title="Popular Movies"
                items={popularMovies}
                onPlay={handleSelectMedia}
                onInfo={(item) => setDetailModalItem(item)}
                onUnreleased={(item) => setNotReleasedModalItem(item)}
                onWatchlistToggle={refreshStorageData}
              />

              {/* Television Series */}
              <MediaTray
                title="Television Series"
                items={popularTV}
                onPlay={handleSelectMedia}
                onInfo={(item) => setDetailModalItem(item)}
                onUnreleased={(item) => setNotReleasedModalItem(item)}
                onWatchlistToggle={refreshStorageData}
              />

              {/* Hollywood Hits */}
              {primeMedia.length > 0 && (
                <MediaTray
                  title="Hollywood Hits"
                  items={primeMedia}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}

              {/* Featured Premieres */}
              {appleMedia.length > 0 && (
                <MediaTray
                  title="Featured Premieres"
                  items={appleMedia}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}

              {/* Top Rated Masterpieces */}
              <MediaTray
                title="Top Rated Masterpieces"
                items={topRated}
                onPlay={handleSelectMedia}
                onInfo={(item) => setDetailModalItem(item)}
                onUnreleased={(item) => setNotReleasedModalItem(item)}
                onWatchlistToggle={refreshStorageData}
              />

              {/* Action & High-Octane */}
              <MediaTray
                title="Action & High-Octane"
                items={actionHits}
                onPlay={handleSelectMedia}
                onInfo={(item) => setDetailModalItem(item)}
                onUnreleased={(item) => setNotReleasedModalItem(item)}
                onWatchlistToggle={refreshStorageData}
              />

              {/* Sci-Fi & Cyberpunk */}
              <MediaTray
                title="Sci-Fi & Cyberpunk"
                items={scifiHits}
                onPlay={handleSelectMedia}
                onInfo={(item) => setDetailModalItem(item)}
                onUnreleased={(item) => setNotReleasedModalItem(item)}
                onWatchlistToggle={refreshStorageData}
              />

              {/* Anime & Animated Gems */}
              {animeHits.length > 0 && (
                <MediaTray
                  title="Anime & Animated Gems"
                  items={animeHits}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}

              {/* Comedy & Feel-Good Hits */}
              {comedyHits.length > 0 && (
                <MediaTray
                  title="Comedy & Feel-Good Hits"
                  items={comedyHits}
                  onPlay={handleSelectMedia}
                  onInfo={(item) => setDetailModalItem(item)}
                  onUnreleased={(item) => setNotReleasedModalItem(item)}
                  onWatchlistToggle={refreshStorageData}
                />
              )}
            </div>
          </div>
        )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quick Details Modal */}
      <Suspense fallback={null}>
        {detailModalItem && (
          <MediaDetailModal
            media={detailModalItem}
            isOpen={Boolean(detailModalItem)}
            onClose={() => setDetailModalItem(null)}
            onPlay={handleSelectMedia}
            onUnreleased={(item) => setNotReleasedModalItem(item)}
            onWatchlistChange={refreshStorageData}
          />
        )}

        {/* Not Released Modal */}
        {notReleasedModalItem && (
          <NotReleasedModal
            media={notReleasedModalItem}
            isOpen={Boolean(notReleasedModalItem)}
            onClose={() => setNotReleasedModalItem(null)}
            onWatchlistChange={refreshStorageData}
          />
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onSettingsSaved={() => {
              loadHomeCatalog();
              refreshStorageData();
            }}
          />
        )}
      </Suspense>

        {/* Footer */}
        <Footer onSelectTab={handleSelectTab} />
      </div>
    </div>
  );
}
