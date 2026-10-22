import React, { useState, useEffect } from 'react';
import { Play, Info, Plus, Check, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { TMDBMedia } from '../types/tmdb';
import { getBackdropUrl, getProxiedImageUrl, normalizeImagePath, getPosterUrl } from '../services/tmdb';
import { isItemInWatchlist, addToWatchlist, removeFromWatchlist } from '../services/storage';
import { getMediaReleaseStatus } from '../services/releaseStatus';

interface HeroBillboardProps {
  items: TMDBMedia[];
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onMoreInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistChange: () => void;
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({
  items,
  onPlay,
  onMoreInfo,
  onUnreleased,
  onWatchlistChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const currentItem = items[currentIndex] || items[0];

  useEffect(() => {
    if (currentItem) {
      setInWatchlist(isItemInWatchlist(currentItem.id));
    }
  }, [currentItem]);

  // Auto rotation & preloading next slide image
  useEffect(() => {
    if (items.length <= 1) return;
    
    // Preload next image into browser cache
    const nextIdx = (currentIndex + 1) % items.length;
    const nextItem = items[nextIdx];
    if (nextItem && nextItem.backdrop_path) {
      const img = new Image();
      img.src = getBackdropUrl(nextItem.backdrop_path, 'w1280');
    }

    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [items, currentIndex, isPaused]);

  if (!currentItem) return null;

  const title = currentItem.title || currentItem.name || 'Featured Title';
  const releaseYear = (currentItem.release_date || currentItem.first_air_date || '').slice(0, 4);
  const type = currentItem.media_type || (currentItem.title ? 'movie' : 'tv');
  const releaseStatus = getMediaReleaseStatus(currentItem);

  const toggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(currentItem.id);
      setInWatchlist(false);
    } else {
      addToWatchlist(currentItem);
      setInWatchlist(true);
    }
    onWatchlistChange();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div
      id="hero-billboard"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full h-[72vh] sm:h-[78vh] md:h-[86vh] max-h-[860px] min-h-[520px] overflow-hidden bg-[#000000]"
    >
      {/* Background Backdrop Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          key={currentItem.id}
          src={getBackdropUrl(currentItem.backdrop_path, 'w1280')}
          alt={title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            const currentSrc = target.src;
            if (currentItem.backdrop_path && !currentSrc.includes('wsrv.nl')) {
              const clean = normalizeImagePath(currentItem.backdrop_path);
              target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w1280${clean}`, 1280);
              return;
            }
            if (currentItem.poster_path && !currentSrc.includes(currentItem.poster_path)) {
              target.src = getPosterUrl(currentItem.poster_path, 'w780');
              return;
            }
            if (!currentSrc.includes('unsplash')) {
              target.src = 'https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?auto=format&fit=crop&w=1280&q=80';
            }
          }}
          className="w-full h-full object-cover object-center md:object-top scale-100 transition-all duration-1000 ease-out"
          decoding="async"
          fetchPriority="high"
        />
        {/* Cinematic Multi-angle Deep Black Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/65 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/80 to-transparent w-full md:w-3/4" />
        <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#000000]/90 via-[#000000]/40 to-transparent pointer-events-none" />
      </div>

      {/* Content Container */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-16 md:pb-24 z-20">
        <div className="max-w-2xl space-y-3.5">
          {/* Unboxed Typographic Metadata Line */}
          <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm text-zinc-400 font-medium">
            <span className="text-zinc-200 font-medium">{type === 'movie' ? 'Film' : 'Series'}</span>
            {releaseYear && (
              <>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span>{releaseYear}</span>
              </>
            )}
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span>4K Ultra HD</span>
            {currentItem.vote_average && currentItem.vote_average > 0 ? (
              <>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="text-zinc-200 font-semibold flex items-center gap-1">
                  ★ {currentItem.vote_average.toFixed(1)}
                </span>
              </>
            ) : null}
            {!releaseStatus.isReleased && (
              <>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="text-amber-300 font-medium">Coming Soon</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white font-display tracking-tight leading-none drop-shadow-2xl">
            {title}
          </h1>

          {/* Overview / Synopsis */}
          <p className="text-sm sm:text-base text-zinc-300 line-clamp-3 leading-relaxed max-w-xl font-normal drop-shadow">
            {currentItem.overview || 'Stream this title with immediate uninterrupted playback in high fidelity.'}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-3 pt-2">
            {/* Primary Watch Button - High Contrast Crisp White Pill */}
            <button
              id="hero-play-button"
              onClick={() => {
                if (!releaseStatus.isReleased) {
                  if (onUnreleased) onUnreleased(currentItem);
                  else onMoreInfo(currentItem);
                  return;
                }
                onPlay(type as 'movie' | 'tv', currentItem.id);
              }}
              className={`px-7 py-3 rounded-full font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.6)] hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer ${
                releaseStatus.isReleased
                  ? 'bg-white hover:bg-zinc-200 text-zinc-950'
                  : 'bg-amber-400 hover:bg-amber-500 text-zinc-950'
              }`}
            >
              {releaseStatus.isReleased ? (
                <>
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-zinc-950 text-zinc-950" />
                  <span>Play</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-zinc-950" />
                  <span>Not Released</span>
                </>
              )}
            </button>

            {/* Watchlist Toggle - Frosted Glass Pill */}
            <button
              id="hero-watchlist-toggle"
              onClick={toggleWatchlist}
              className={`px-5 py-3 rounded-full font-medium text-sm sm:text-base flex items-center gap-2 border transition-all duration-200 cursor-pointer backdrop-blur-xl ${
                inWatchlist
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.1] text-zinc-200 hover:text-white'
              }`}
            >
              {inWatchlist ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>In My List</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to List</span>
                </>
              )}
            </button>

            {/* Details Modal Trigger */}
            <button
              id="hero-info-button"
              onClick={() => onMoreInfo(currentItem)}
              className="p-3 text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
              title="More Info"
            >
              <Info className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Carousel Slide Indicators & Controls */}
        <div className="absolute right-4 sm:right-8 bottom-12 md:bottom-20 flex items-center gap-3">
          <button
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-xl transition-all cursor-pointer active:scale-90"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1.5">
            {items.slice(0, 6).map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-7 bg-white shadow-lg'
                    : 'w-2 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            aria-label="Next Slide"
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-xl transition-all cursor-pointer active:scale-90"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

