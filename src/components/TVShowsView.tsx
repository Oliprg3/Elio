import React, { useState, useEffect } from 'react';
import { Tv, SlidersHorizontal, Plus, Loader2 } from 'lucide-react';
import { TMDBMedia } from '../types/tmdb';
import { getPopularTV, getTopRated, getByGenre, getAnimeTV } from '../services/tmdb';
import { TV_GENRES, CURATED_TV } from '../services/tmdbData';
import { MediaCard } from './MediaCard';
import { GenrePillBar } from './GenrePillBar';
import { CustomSelect } from './CustomSelect';

interface TVShowsViewProps {
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistToggle: () => void;
}

export const TVShowsView: React.FC<TVShowsViewProps> = ({
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
}) => {
  const [shows, setShows] = useState<TMDBMedia[]>(CURATED_TV);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'popular' | 'top_rated' | 'anime'>('popular');

  // Initial load with 2 pages for 40+ shows
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setPage(2);
        setHasMore(true);

        let p1: TMDBMedia[] = [];
        let p2: TMDBMedia[] = [];

        if (selectedGenre !== null) {
          [p1, p2] = await Promise.all([
            getByGenre('tv', selectedGenre, 1),
            getByGenre('tv', selectedGenre, 2),
          ]);
        } else if (sortBy === 'top_rated') {
          [p1, p2] = await Promise.all([
            getTopRated('tv', 1),
            getTopRated('tv', 2),
          ]);
        } else if (sortBy === 'anime') {
          [p1, p2] = await Promise.all([
            getAnimeTV(1),
            getAnimeTV(2),
          ]);
        } else {
          [p1, p2] = await Promise.all([
            getPopularTV(1),
            getPopularTV(2),
          ]);
        }

        const combined = [...(p1 || []), ...(p2 || [])];
        const unique = Array.from(new Map(combined.map((t) => [t.id, t])).values());

        if (isMounted && unique.length > 0) {
          setShows(unique);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [selectedGenre, sortBy]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      let nextBatch: TMDBMedia[] = [];

      if (selectedGenre !== null) {
        nextBatch = await getByGenre('tv', selectedGenre, nextPage);
      } else if (sortBy === 'top_rated') {
        nextBatch = await getTopRated('tv', nextPage);
      } else if (sortBy === 'anime') {
        nextBatch = await getAnimeTV(nextPage);
      } else {
        nextBatch = await getPopularTV(nextPage);
      }

      if (nextBatch && nextBatch.length > 0) {
        setShows((prev) => {
          const map = new Map(prev.map((s) => [s.id, s]));
          nextBatch.forEach((s) => map.set(s.id, s));
          return Array.from(map.values());
        });
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more shows:', e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen pt-8 sm:pt-10 md:pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-display tracking-tight">
            TV Shows & Series
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
            Browse {shows.length} series
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <CustomSelect<'popular' | 'top_rated' | 'anime'>
            id="tv-sort"
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setSelectedGenre(null);
            }}
            size="sm"
            variant="subtle"
            icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            options={[
              { value: 'popular', label: 'Most Popular' },
              { value: 'top_rated', label: 'Highest Rated' },
              { value: 'anime', label: 'Anime Series' },
            ]}
          />
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="mb-8">
        <GenrePillBar
          genres={TV_GENRES}
          selectedGenreId={selectedGenre}
          onSelectGenre={(gid) => {
            setSelectedGenre(gid);
          }}
        />
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-zinc-400 text-sm font-medium">Loading series...</p>
        </div>
      ) : shows.length === 0 ? (
        <div className="py-24 text-center text-zinc-400">
          No shows found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 md:gap-7">
            {shows.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                className="w-full"
                onPlay={onPlay}
                onInfo={onInfo}
                onUnreleased={onUnreleased}
                onWatchlistToggle={onWatchlistToggle}
              />
            ))}
          </div>

          {/* Load More Shows Button */}
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                id="btn-load-more-shows"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Loading more series...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Load More Series</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
