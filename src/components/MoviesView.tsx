import React, { useState, useEffect } from 'react';
import { Clapperboard, SlidersHorizontal, Plus, Loader2 } from 'lucide-react';
import { TMDBMedia } from '../types/tmdb';
import { getPopularMovies, getTopRated, getByGenre } from '../services/tmdb';
import { MOVIE_GENRES, CURATED_MOVIES } from '../services/tmdbData';
import { MediaCard } from './MediaCard';
import { GenrePillBar } from './GenrePillBar';
import { CustomSelect } from './CustomSelect';

interface MoviesViewProps {
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistToggle: () => void;
}

export const MoviesView: React.FC<MoviesViewProps> = ({
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
}) => {
  const [movies, setMovies] = useState<TMDBMedia[]>(CURATED_MOVIES);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'popular' | 'top_rated'>('popular');

  // Load initial batch of movies (page 1 + page 2 for an expanded list of 40 titles)
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
            getByGenre('movie', selectedGenre, 1),
            getByGenre('movie', selectedGenre, 2),
          ]);
        } else if (sortBy === 'top_rated') {
          [p1, p2] = await Promise.all([
            getTopRated('movie', 1),
            getTopRated('movie', 2),
          ]);
        } else {
          [p1, p2] = await Promise.all([
            getPopularMovies(1),
            getPopularMovies(2),
          ]);
        }

        const combined = [...(p1 || []), ...(p2 || [])];
        const unique = Array.from(new Map(combined.map((m) => [m.id, m])).values());

        if (isMounted && unique.length > 0) {
          setMovies(unique);
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

  // Load next page of movies
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      let nextBatch: TMDBMedia[] = [];

      if (selectedGenre !== null) {
        nextBatch = await getByGenre('movie', selectedGenre, nextPage);
      } else if (sortBy === 'top_rated') {
        nextBatch = await getTopRated('movie', nextPage);
      } else {
        nextBatch = await getPopularMovies(nextPage);
      }

      if (nextBatch && nextBatch.length > 0) {
        setMovies((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          nextBatch.forEach((m) => map.set(m.id, m));
          return Array.from(map.values());
        });
        setPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Failed to load more movies:', e);
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
            Movies
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
            Browse {movies.length} titles
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <CustomSelect<'popular' | 'top_rated'>
            id="movie-sort"
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
            ]}
          />
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="mb-8">
        <GenrePillBar
          genres={MOVIE_GENRES}
          selectedGenreId={selectedGenre}
          onSelectGenre={(gid) => {
            setSelectedGenre(gid);
          }}
        />
      </div>

      {/* Media Grid with Larger, High-Contrast Cards */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-zinc-400 text-sm font-medium">Loading movies...</p>
        </div>
      ) : movies.length === 0 ? (
        <div className="py-24 text-center text-zinc-400">
          No movies found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 md:gap-7">
            {movies.map((item) => (
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

          {/* Load More Movies Button */}
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                id="btn-load-more-movies"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Loading more movies...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Load More Movies</span>
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
