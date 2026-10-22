import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, Info, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { TMDBMedia } from '../types/tmdb';
import { getPosterUrl, getProxiedImageUrl, getBackdropUrl, normalizeImagePath } from '../services/tmdb';
import { isItemInWatchlist, addToWatchlist, removeFromWatchlist } from '../services/storage';
import { getMediaReleaseStatus } from '../services/releaseStatus';

interface MediaCardProps {
  item: TMDBMedia;
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistToggle?: () => void;
  progressPercent?: number;
  lastEpisodeLabel?: string;
  lastStoppedFormatted?: string;
  className?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
  progressPercent,
  lastEpisodeLabel,
  lastStoppedFormatted,
  className = 'w-44 sm:w-52 md:w-60 lg:w-64 flex-shrink-0',
}) => {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setInWatchlist(isItemInWatchlist(item.id));
  }, [item.id]);

  const title = item.title || item.name || 'Untitled';
  const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);
  const type = item.media_type || (item.title ? 'movie' : 'tv');
  const releaseStatus = getMediaReleaseStatus(item);

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWatchlist) {
      removeFromWatchlist(item.id);
      setInWatchlist(false);
    } else {
      addToWatchlist(item);
      setInWatchlist(true);
    }
    if (onWatchlistToggle) onWatchlistToggle();
  };

  const handleCardClick = () => {
    if (!releaseStatus.isReleased) {
      if (onUnreleased) {
        onUnreleased(item);
      } else {
        onInfo(item);
      }
      return;
    }
    onPlay(type as 'movie' | 'tv', item.id);
  };

  return (
    <motion.div
      id={`media-card-${item.id}`}
      tabIndex={0}
      data-card-id={item.id}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      className={`group relative cursor-pointer select-none focus:outline-none ${className}`}
    >
      {/* Main Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#0e1015] border border-white/[0.06] shadow-md group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.85)] group-hover:border-white/[0.18] transition-all duration-300">
        <img
          src={getPosterUrl(item.poster_path, 'w342')}
          alt={title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            const currentSrc = target.src;
            
            // 1. If direct TMDB fails, retry through high-speed CDN proxy
            if (item.poster_path && !currentSrc.includes('wsrv.nl')) {
              const clean = normalizeImagePath(item.poster_path);
              target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w342${clean}`, 342);
              return;
            }
            
            // 2. If poster fails, try backdrop
            if (item.backdrop_path && !currentSrc.includes(item.backdrop_path)) {
              target.src = getBackdropUrl(item.backdrop_path, 'w780');
              return;
            }

            // 3. Fallback to resilient photo
            if (!currentSrc.includes('unsplash')) {
              target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=342&q=80';
            }
          }}
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {/* Subtle Status Pill on Poster if unreleased */}
        {!releaseStatus.isReleased && (
          <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[10px] font-bold text-zinc-950 uppercase tracking-wider shadow">
              Soon
            </span>
          </div>
        )}

        {/* Continue Watching Progress Bar */}
        {progressPercent !== undefined && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/80 z-10 overflow-hidden">
            <div
              className="h-full bg-white rounded-r transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        )}

        {/* Apple TV+ style subtle vignette & action layer on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20 flex flex-col justify-between p-3 transition-opacity duration-300 z-10 pointer-events-none ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Top Quick Actions */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={handleWatchlistClick}
              title={inWatchlist ? 'Remove from My List' : 'Add to My List'}
              className={`w-7 h-7 rounded-full flex items-center justify-center border backdrop-blur-xl transition-all cursor-pointer ${
                inWatchlist
                  ? 'bg-white text-zinc-950 border-white'
                  : 'bg-black/60 border-white/20 text-white hover:bg-white/20'
              }`}
            >
              {inWatchlist ? <Check className="w-3.5 h-3.5 text-zinc-950" /> : <Plus className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onInfo(item);
              }}
              title="More Details"
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center backdrop-blur-xl transition-all cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center Play Icon */}
          <div className="flex items-center justify-center my-auto pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-xl shadow-black/80 transform group-hover:scale-110 transition-transform">
              <Play className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950 ml-0.5" />
            </div>
          </div>

          {/* Bottom Episode / Stopped Meta if available */}
          <div className="text-left">
            {lastEpisodeLabel && (
              <p className="text-[10px] text-zinc-200 font-medium truncate">
                {lastEpisodeLabel}
              </p>
            )}
            {lastStoppedFormatted && (
              <p className="text-[9px] text-zinc-400 font-mono">
                {lastStoppedFormatted} ({progressPercent}%)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card Bottom Meta - Clean unboxed typography */}
      <div className="mt-2 text-left">
        <div className="text-xs sm:text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
          {title}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
          <span>{releaseYear || (type === 'movie' ? 'Film' : 'Series')}</span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span>{item.vote_average && item.vote_average > 0 ? `★ ${item.vote_average.toFixed(1)}` : 'HD'}</span>
          {!releaseStatus.isReleased && (
            <>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="text-amber-300 font-medium">Soon</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

