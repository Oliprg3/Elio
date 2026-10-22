import React, { useState, useEffect } from 'react';
import { Layers, Clapperboard, Tv } from 'lucide-react';
import { TMDBMedia, Genre } from '../types/tmdb';
import { MOVIE_GENRES, TV_GENRES, CURATED_MOVIES, CURATED_TV } from '../services/tmdbData';
import { getByGenre } from '../services/tmdb';
import { MediaCard } from './MediaCard';

interface GenresViewProps {
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistToggle: () => void;
}

export const GenresView: React.FC<GenresViewProps> = ({
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
}) => {
  const [selectedType, setSelectedType] = useState<'movie' | 'tv'>('movie');
  const [selectedGenre, setSelectedGenre] = useState<Genre>(MOVIE_GENRES[0]);
  const [items, setItems] = useState<TMDBMedia[]>(
    CURATED_MOVIES.filter((m) => m.genre_ids?.includes(MOVIE_GENRES[0].id))
  );
  const [loading, setLoading] = useState(false);

  const currentGenreList = selectedType === 'movie' ? MOVIE_GENRES : TV_GENRES;

  useEffect(() => {
    let isMounted = true;

    getByGenre(selectedType, selectedGenre.id)
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
  }, [selectedType, selectedGenre]);

  return (
    <div className="min-h-screen pt-8 sm:pt-10 md:pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
            Categories & Genres
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Browse our complete catalogue by genre</p>
        </div>

        {/* Media Type Switcher */}
        <div className="flex items-center p-1 bg-white/[0.04] border border-white/[0.06] rounded-full backdrop-blur-md">
          <button
            onClick={() => {
              setSelectedType('movie');
              setSelectedGenre(MOVIE_GENRES[0]);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedType === 'movie'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" /> Movies
          </button>
          <button
            onClick={() => {
              setSelectedType('tv');
              setSelectedGenre(TV_GENRES[0]);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedType === 'tv'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" /> Shows
          </button>
        </div>
      </div>

      {/* Genre Grid Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-8">
        {currentGenreList.map((g) => {
          const isSelected = selectedGenre.id === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g)}
              className={`p-3 rounded-xl text-left border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-white text-zinc-950 border-white font-semibold shadow-md'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] text-zinc-300 hover:text-white'
              }`}
            >
              <div className="text-xs font-semibold">{g.name}</div>
              <div className={`text-[10px] mt-0.5 capitalize ${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>
                {selectedType === 'movie' ? 'Film' : 'Series'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Media Results */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white font-display">
          {selectedGenre.name} {selectedType === 'movie' ? 'Movies' : 'Shows'}
        </h2>
        <span className="text-xs text-neutral-400">
          Showing {items.length} titles
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-zinc-400 text-sm">Loading category titles...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-zinc-400">
          No titles found.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 md:gap-7">
          {items.map((item) => (
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
      )}
    </div>
  );
};
