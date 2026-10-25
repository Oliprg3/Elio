import React, { useState, useEffect } from 'react';
import { ProviderInfo, ProviderLogo } from './BrandHub';
import { TMDBMedia } from '../types/tmdb';
import { getByProvider } from '../services/tmdb';
import { MediaCard } from './MediaCard';
import { Clapperboard, Tv, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface BrandShowcaseProps {
  provider: ProviderInfo;
  onClose: () => void;
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased: (item: TMDBMedia) => void;
  onWatchlistToggle: () => void;
}

export const BrandShowcase: React.FC<BrandShowcaseProps> = ({
  provider,
  onClose,
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [movies, setMovies] = useState<TMDBMedia[]>([]);
  const [shows, setShows] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function fetchBrandMedia() {
      try {
        const [moviesP1, moviesP2, showsP1, showsP2] = await Promise.all([
          getByProvider('movie', provider.id, 1),
          getByProvider('movie', provider.id, 2),
          getByProvider('tv', provider.id, 1),
          getByProvider('tv', provider.id, 2),
        ]);

        if (isMounted) {
          const allMovies = [...(moviesP1 || []), ...(moviesP2 || [])];
          const allShows = [...(showsP1 || []), ...(showsP2 || [])];
          
          // Deduplicate by ID
          const uniqueMovies = Array.from(new Map(allMovies.map((m) => [m.id, m])).values());
          const uniqueShows = Array.from(new Map(allShows.map((s) => [s.id, s])).values());

          setMovies(uniqueMovies);
          setShows(uniqueShows);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load provider items', err);
        if (isMounted) setLoading(false);
      }
    }

    fetchBrandMedia();

    return () => {
      isMounted = false;
    };
  }, [provider.id]);

  const displayedItems =
    filterType === 'movie'
      ? movies
      : filterType === 'tv'
      ? shows
      : [...shows, ...movies].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16 animate-fade-in">
      {/* Brand Header Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-8 border border-white/10 bg-gradient-to-r ${provider.bgGradient}`}
        style={{
          boxShadow: `0 20px 40px -15px ${provider.glowColor}`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 shadow-inner flex items-center justify-center min-w-[80px]">
              <ProviderLogo providerKey={provider.key} className="h-10 sm:h-12 w-auto" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-300 font-semibold tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
                  Showing {provider.name} Only
                </span>
                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                <span className="text-xs text-neutral-400">
                  {movies.length + shows.length} Titles
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
                {provider.name} Network
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 max-w-xl mt-1">
                Browse original shows and hit movies exclusive to {provider.name}.
              </p>
            </div>
          </div>

          {/* Controls & Filter Pills */}
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <div className="flex items-center bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All Titles
              </button>
              <button
                onClick={() => setFilterType('tv')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'tv'
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                Series ({shows.length})
              </button>
              <button
                onClick={() => setFilterType('movie')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'movie'
                    ? 'bg-white text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Clapperboard className="w-3.5 h-3.5" />
                Movies ({movies.length})
              </button>
            </div>

            <button
              onClick={onClose}
              title="Close filter and view all channels"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Show All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Media Catalog Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-[2/3] rounded-2xl bg-neutral-900/80 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="py-16 text-center text-neutral-400 bg-neutral-900/30 rounded-2xl border border-white/5">
          <p className="text-base font-semibold">No media found for {provider.name} at this time.</p>
          <button
            onClick={onClose}
            className="mt-3 text-xs font-bold text-white hover:underline cursor-pointer"
          >
            Back to All Streaming Hubs
          </button>
        </div>
      ) : filterType === 'all' ? (
        <div className="space-y-12">
          {/* Section 1: Popular Series */}
          {shows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-white" />
                  <h3 className="text-lg font-bold text-white font-display">
                    {provider.name} TV Shows & Series
                  </h3>
                </div>
                <button
                  onClick={() => setFilterType('tv')}
                  className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  View All ({shows.length}) →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {shows.slice(0, 6).map((item) => (
                  <MediaCard
                    key={`show-${item.id}`}
                    item={item}
                    className="w-full"
                    onPlay={onPlay}
                    onInfo={onInfo}
                    onUnreleased={onUnreleased}
                    onWatchlistToggle={onWatchlistToggle}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Hit Movies */}
          {movies.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clapperboard className="w-4 h-4 text-white" />
                  <h3 className="text-lg font-bold text-white font-display">
                    {provider.name} Movies & Features
                  </h3>
                </div>
                <button
                  onClick={() => setFilterType('movie')}
                  className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  View All ({movies.length}) →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {movies.slice(0, 6).map((item) => (
                  <MediaCard
                    key={`movie-${item.id}`}
                    item={item}
                    className="w-full"
                    onPlay={onPlay}
                    onInfo={onInfo}
                    onUnreleased={onUnreleased}
                    onWatchlistToggle={onWatchlistToggle}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Full Catalog Grid */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-bold text-white font-display">
                All {provider.name} Releases
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {displayedItems.slice(0, 24).map((item) => (
                <MediaCard
                  key={`all-${item.media_type || 'media'}-${item.id}`}
                  item={item}
                  className="w-full"
                  onPlay={onPlay}
                  onInfo={onInfo}
                  onUnreleased={onUnreleased}
                  onWatchlistToggle={onWatchlistToggle}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Full Grid for Single Type */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {displayedItems.map((item) => (
            <MediaCard
              key={`${item.media_type || 'media'}-${item.id}`}
              item={item}
              className="w-full"
              onPlay={onPlay}
              onInfo={onInfo}
              onUnreleased={onUnreleased}
              onWatchlistToggle={onWatchlistToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};
