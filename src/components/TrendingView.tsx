import React, { useState, useEffect } from 'react';

import { TMDBMedia } from '../types/tmdb';
import { getTrendingAll } from '../services/tmdb';
import { CURATED_MOVIES, CURATED_TV } from '../services/tmdbData';
import { MediaCard } from './MediaCard';

interface TrendingViewProps {
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistToggle: () => void;
}

export const TrendingView: React.FC<TrendingViewProps> = ({
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
}) => {
  const [items, setItems] = useState<TMDBMedia[]>([...CURATED_MOVIES, ...CURATED_TV]);
  const [loading, setLoading] = useState(false);
  const [timeWindow, setTimeWindow] = useState<'day' | 'week'>('day');

  useEffect(() => {
    let isMounted = true;

    getTrendingAll(timeWindow)
      .then((res) => {
        if (isMounted && res.length > 0) setItems(res);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [timeWindow]);

  return (
    <div className="min-h-screen pt-8 sm:pt-10 md:pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-display tracking-tight">
            Trending Now
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-medium">
            Most streamed films and series across all networks
          </p>
        </div>

        {/* Time Window Switcher */}
        <div className="flex items-center p-1 bg-white/[0.04] border border-white/[0.06] rounded-full backdrop-blur-md">
          <button
            id="trending-today-btn"
            onClick={() => setTimeWindow('day')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              timeWindow === 'day'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            id="trending-week-btn"
            onClick={() => setTimeWindow('week')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              timeWindow === 'week'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            This Week
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-zinc-400 text-sm">Loading trending titles...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-zinc-400">
          No trending titles found.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 md:gap-7">
          {items.map((item, index) => (
            <MediaCard
              key={`${item.id}-${index}`}
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
