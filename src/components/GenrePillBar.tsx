import React from 'react';
import { Genre } from '../types/tmdb';

interface GenrePillBarProps {
  genres: Genre[];
  selectedGenreId: number | null;
  onSelectGenre: (genreId: number | null) => void;
}

export const GenrePillBar: React.FC<GenrePillBarProps> = ({
  genres,
  selectedGenreId,
  onSelectGenre,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 no-scrollbar">
      {/* "All" button */}
      <button
        id="genre-all-btn"
        onClick={() => onSelectGenre(null)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
          selectedGenreId === null
            ? 'bg-white text-zinc-950 font-semibold shadow-sm'
            : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
        }`}
      >
        All
      </button>

      {/* Genre Pills */}
      {genres.map((genre) => {
        const isSelected = selectedGenreId === genre.id;
        return (
          <button
            key={genre.id}
            id={`genre-pill-${genre.id}`}
            onClick={() => onSelectGenre(genre.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              isSelected
                ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
};
