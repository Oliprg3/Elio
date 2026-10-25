import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MagnifyingGlassIcon as Search,
  XMarkIcon as X,
  PlayIcon as Play,
} from '@heroicons/react/24/outline';
import { PlayIcon as PlaySolid } from '@heroicons/react/24/solid';
import { motion } from 'motion/react';
import { TMDBMedia } from '../types/tmdb';
import {
  searchMedia,
  getTrendingAll,
  getPopularMovies,
  getPosterUrl,
  getBackdropUrl,
} from '../services/tmdb';
import { MOVIE_GENRES, TV_GENRES, CURATED_MOVIES, CURATED_TV } from '../services/tmdbData';
import { MediaCard } from './MediaCard';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../services/storage';
import { getMediaReleaseStatus } from '../services/releaseStatus';

interface NetflixSearchViewProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistToggle: () => void;
}

const POPULAR_CATEGORY_TAGS = [
  { id: 28, name: 'Action', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 878, name: 'Sci-Fi', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 35, name: 'Comedy', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 80, name: 'Crime & Thriller', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 16, name: 'Anime & Animation', type: 'tv' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 27, name: 'Horror', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 18, name: 'Drama', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 10759, name: 'Action & Adventure', type: 'tv' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 99, name: 'Documentary', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 10749, name: 'Romance', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 9648, name: 'Mystery', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
  { id: 10751, name: 'Family', type: 'movie' as const, accent: 'group-hover:border-white/30 group-hover:bg-white/[0.04]' },
];

export const NetflixSearchView: React.FC<NetflixSearchViewProps> = ({
  searchQuery,
  onSearchQueryChange,
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
}) => {
  const [results, setResults] = useState<TMDBMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filters
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'newest'>('relevance');

  // Top Searches & Discover Data
  const [topSearches, setTopSearches] = useState<TMDBMedia[]>([]);
  const [recommendations, setRecommendations] = useState<TMDBMedia[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load Initial Top Searches & History
  useEffect(() => {
    setRecentSearches(getRecentSearches());

    getTrendingAll('day').then((data) => {
      if (data && data.length > 0) {
        setTopSearches(data.slice(0, 9));
      } else {
        setTopSearches([...CURATED_MOVIES.slice(0, 5), ...CURATED_TV.slice(0, 4)]);
      }
    });

    getPopularMovies(1).then((data) => {
      if (data && data.length > 0) {
        setRecommendations(data.slice(0, 12));
      } else {
        setRecommendations(CURATED_MOVIES.slice(0, 12));
      }
    });
  }, []);

  // Keyboard shortcut for focusing search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Perform Live Search on query change
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setPage(1);

    const timer = setTimeout(async () => {
      try {
        const [res1, res2] = await Promise.all([
          searchMedia(trimmed, 1),
          searchMedia(trimmed, 2),
        ]);

        const combined = [...(res1 || []), ...(res2 || [])];
        const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
        
        setResults(unique);
        setHasMore(unique.length >= 20);

        if (trimmed.length >= 2) {
          const updated = addRecentSearch(trimmed);
          setRecentSearches(updated);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load more search results
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !searchQuery.trim()) return;
    setLoadingMore(true);
    const nextPage = page + 2;
    try {
      const moreResults = await searchMedia(searchQuery.trim(), nextPage);
      if (moreResults && moreResults.length > 0) {
        setResults((prev) => {
          const combined = [...prev, ...moreResults];
          return Array.from(new Map(combined.map((item) => [item.id, item])).values());
        });
        setPage(nextPage);
        setHasMore(moreResults.length >= 10);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more results', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filtered and Sorted Results
  const processedResults = useMemo(() => {
    let list = [...results];

    if (mediaTypeFilter === 'movie') {
      list = list.filter((item) => item.media_type === 'movie' || item.title);
    } else if (mediaTypeFilter === 'tv') {
      list = list.filter((item) => item.media_type === 'tv' || item.name);
    }

    if (selectedGenreId !== null) {
      list = list.filter((item) => item.genre_ids?.includes(selectedGenreId));
    }

    if (sortBy === 'rating') {
      list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => {
        const dateA = a.release_date || a.first_air_date || '';
        const dateB = b.release_date || b.first_air_date || '';
        return dateB.localeCompare(dateA);
      });
    }

    return list;
  }, [results, mediaTypeFilter, selectedGenreId, sortBy]);

  // Dynamic suggested keyword pills when searching
  const suggestedTags = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const queryLower = searchQuery.toLowerCase();
    const tags = new Set<string>();

    results.slice(0, 15).forEach((item) => {
      if (item.genre_ids) {
        item.genre_ids.forEach((gid) => {
          const g = [...MOVIE_GENRES, ...TV_GENRES].find((x) => x.id === gid);
          if (g && !queryLower.includes(g.name.toLowerCase())) {
            tags.add(g.name);
          }
        });
      }
    });

    return Array.from(tags).slice(0, 6);
  }, [searchQuery, results]);

  const handleSelectRecent = (term: string) => {
    onSearchQueryChange(term);
    inputRef.current?.focus();
  };

  const handleRemoveRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = removeRecentSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleCategoryClick = (category: typeof POPULAR_CATEGORY_TAGS[0]) => {
    onSearchQueryChange(category.name);
    setSelectedGenreId(category.id);
  };

  const isQueryActive = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen pt-8 sm:pt-10 md:pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Search Header Bar (Ultra-Premium Apple / Netflix Aesthetic) */}
      <div className="relative mb-10">
        <div className="relative max-w-3xl mx-auto">
          {/* Main Input Container - Thinner sleek profile */}
          <div className="relative flex items-center bg-zinc-950/70 hover:bg-zinc-900/80 focus-within:bg-zinc-900/90 border border-white/[0.08] hover:border-white/20 focus-within:border-white/40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
            
            <input
              ref={inputRef}
              id="netflix-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search by title, character, actor, genre..."
              autoFocus
              className="w-full pl-10 pr-20 py-2.5 sm:py-3 text-sm sm:text-base bg-transparent text-white placeholder:text-zinc-500 rounded-xl focus:outline-none tracking-wide"
            />

            {/* Right Controls */}
            <div className="absolute right-3 flex items-center gap-2">
              {isLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              {searchQuery && (
                <button
                  id="btn-clear-search-view"
                  onClick={() => {
                    onSearchQueryChange('');
                    setSelectedGenreId(null);
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 bg-white/[0.04] border border-white/[0.06] rounded select-none">
                ESC
              </span>
            </div>
          </div>

          {/* Quick Filter Control Chips */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-2.5">
            {/* Media Type Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-white/[0.06] backdrop-blur-md">
              {(
                [
                  { id: 'all', label: 'All Titles' },
                  { id: 'movie', label: 'Movies' },
                  { id: 'tv', label: 'TV Shows' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMediaTypeFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    mediaTypeFilter === tab.id
                      ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 hidden sm:inline-block">Sort:</span>
              <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-white/[0.06] backdrop-blur-md">
                {(
                  [
                    { id: 'relevance', label: 'Popular' },
                    { id: 'rating', label: 'Top Rated' },
                    { id: 'newest', label: 'Newest' },
                  ] as const
                ).map((sort) => (
                  <button
                    key={sort.id}
                    onClick={() => setSortBy(sort.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      sortBy === sort.id
                        ? 'bg-white/[0.12] text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY CONTENT: Active Results vs Empty State */}
      {isQueryActive ? (
        /* ACTIVE SEARCH RESULTS */
        <div>
          {/* Netflix "Explore titles related to: [query]" Banner */}
          <div className="mb-6 pb-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
                <span>Explore titles related to:</span>
                <span className="text-zinc-300 font-normal">&ldquo;{searchQuery}&rdquo;</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {isLoading
                  ? 'Searching catalogue...'
                  : `${processedResults.length} title${processedResults.length === 1 ? '' : 's'} available`}
              </p>
            </div>

            {/* Related Keyword Suggestions */}
            {suggestedTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-zinc-500 font-medium">Related:</span>
                {suggestedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onSearchQueryChange(tag)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] hover:border-white/20 transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results Grid or Empty Match Notice */}
          {isLoading && processedResults.length === 0 ? (
            <div className="py-24 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-sm">Searching elio+ media library...</p>
            </div>
          ) : processedResults.length > 0 ? (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5">
                {processedResults.map((item) => (
                  <MediaCard
                    key={`${item.media_type || 'media'}-${item.id}`}
                    item={item}
                    onPlay={onPlay}
                    onInfo={onInfo}
                    onUnreleased={onUnreleased}
                    onWatchlistToggle={onWatchlistToggle}
                    className="w-full"
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    id="btn-load-more-search"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading more titles...' : 'Load More Results'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Zero Matches Netflix State */
            <div className="py-16 text-center max-w-xl mx-auto">
              <div className="flex items-center justify-center text-zinc-400 mx-auto mb-4">
                <Search className="w-10 h-10 text-zinc-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Your search for &ldquo;{searchQuery}&rdquo; did not have any matches.
              </h3>
              <div className="text-xs text-zinc-400 text-left bg-zinc-950/60 p-4 rounded-xl border border-white/[0.06] mb-8 space-y-1.5">
                <p className="font-semibold text-zinc-300">Suggestions:</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                  <li>Try different keywords or check your spelling</li>
                  <li>Looking for a movie or TV show? Try using the main title name</li>
                  <li>Try searching for a genre like action, comedy, anime, or drama</li>
                </ul>
              </div>

              {/* Recommended Titles Grid */}
              {recommendations.length > 0 && (
                <div className="text-left mt-10">
                  <h4 className="text-base font-bold text-white mb-4">
                    Popular on elio+
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                    {recommendations.slice(0, 6).map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        onPlay={onPlay}
                        onInfo={onInfo}
                        onUnreleased={onUnreleased}
                        onWatchlistToggle={onWatchlistToggle}
                        className="w-full"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* EMPTY SEARCH DISCOVERY STATE (Premium Netflix Top Searches & Categories) */
        <div className="space-y-14">
          {/* Recent Searches (If Any) */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Recent Searches
                </h3>
                <button
                  onClick={handleClearAllRecent}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Clear history
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectRecent(term);
                      }
                    }}
                    onClick={() => handleSelectRecent(term)}
                    className="group px-3.5 py-1.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 text-xs text-zinc-300 hover:text-white border border-white/[0.06] hover:border-white/20 flex items-center gap-2 cursor-pointer transition-all duration-200"
                  >
                    <span>{term}</span>
                    <button
                      onClick={(e) => handleRemoveRecent(e, term)}
                      className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded-full"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Netflix Top Searches / Trending Ranked Leaderboard (No Clutter Icon) */}
          {topSearches.length > 0 && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
                  Top Searches Today
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {topSearches.map((item, idx) => {
                  const title = item.title || item.name || 'Untitled';
                  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
                  const type = item.media_type || (item.title ? 'movie' : 'tv');
                  const status = getMediaReleaseStatus(item);

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.015 }}
                      transition={{ duration: 0.2 }}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!status.isReleased) {
                            if (onUnreleased) onUnreleased(item);
                            else onInfo(item);
                            return;
                          }
                          onPlay(type as 'movie' | 'tv', item.id);
                        }
                      }}
                      onClick={() => {
                        if (!status.isReleased) {
                          if (onUnreleased) onUnreleased(item);
                          else onInfo(item);
                          return;
                        }
                        onPlay(type as 'movie' | 'tv', item.id);
                      }}
                      className="group flex items-center gap-3.5 p-2 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/80 border border-white/[0.05] hover:border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer"
                    >
                      {/* Rank Number */}
                      <span className="w-6 text-center font-black font-display text-base sm:text-lg text-zinc-600 group-hover:text-zinc-200 transition-colors select-none">
                        {idx + 1}
                      </span>

                      {/* Backdrop Thumbnail */}
                      <div className="relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 shadow-md">
                        <img
                          src={getBackdropUrl(item.backdrop_path, 'w780') || getPosterUrl(item.poster_path, 'w185')}
                          alt={title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (item.poster_path) {
                              target.src = getPosterUrl(item.poster_path, 'w185');
                            } else {
                              target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="w-7 h-7 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-lg">
                            <PlaySolid className="w-3.5 h-3.5 ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Title Info */}
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-zinc-100 transition-colors">
                          {title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] uppercase font-semibold text-zinc-300">
                            {type === 'movie' ? 'Movie' : 'Show'}
                          </span>
                          {year && <span>{year}</span>}
                          {item.vote_average && item.vote_average > 0 && (
                            <span className="text-zinc-400">★ {item.vote_average.toFixed(1)}</span>
                          )}
                        </div>
                      </div>

                      {/* Play Action Trigger */}
                      <div className="w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-white text-zinc-400 group-hover:text-zinc-950 flex items-center justify-center transition-all mr-1.5 flex-shrink-0">
                        <PlaySolid className="w-3.5 h-3.5 ml-0.5" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Browse by Categories (Premium Glass Tiles) */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white font-display tracking-tight">
                Explore by Categories
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {POPULAR_CATEGORY_TAGS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`group relative overflow-hidden rounded-2xl p-4 text-left border border-white/[0.06] bg-zinc-950/60 ${cat.accent} transition-all duration-300 cursor-pointer shadow-sm hover:shadow-lg`}
                >
                  <div className="mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      {cat.type === 'movie' ? 'Movie' : 'Show'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white group-hover:text-white transition-colors">
                    {cat.name}
                  </div>
                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 tracking-wider block mt-2 transition-colors">
                    Browse &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

