import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { TMDBMedia, WatchHistoryItem } from '../types/tmdb';
import { MediaCard } from './MediaCard';

interface MediaTrayProps {
  title: string;
  items: TMDBMedia[];
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistToggle?: () => void;
  historyItems?: WatchHistoryItem[];
  isTop10?: boolean;
}

export const MediaTray: React.FC<MediaTrayProps> = ({
  title,
  items,
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
  historyItems,
  isTop10,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollability, 350);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      className="relative my-7 sm:my-9 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto group/tray"
    >
      {/* Tray Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="w-1 h-4 md:h-5 bg-white rounded-sm shrink-0" />
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-white font-display tracking-tight">
            {title}
          </h2>
        </div>

        {/* Scroll Arrows */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-60 group-hover/tray:opacity-100 group-focus-within/tray:opacity-100 transition-opacity">
          <button
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-20 disabled:pointer-events-none text-white border border-white/[0.06] backdrop-blur-xl transition-all shadow cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-20 disabled:pointer-events-none text-white border border-white/[0.06] backdrop-blur-xl transition-all shadow cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollability}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar scroll-smooth"
      >
        {items.map((item, index) => {
          const historyMatch = historyItems?.find(
            (h) => h.id === item.id && h.type === (item.media_type || (item.title ? 'movie' : 'tv'))
          );

          return (
            <MediaCard
              key={`${item.id}-${index}`}
              item={item}
              className="w-44 sm:w-52 md:w-60 lg:w-64 flex-shrink-0"
              onPlay={onPlay}
              onInfo={onInfo}
              onUnreleased={onUnreleased}
              onWatchlistToggle={onWatchlistToggle}
              progressPercent={historyMatch?.progressPercent}
              lastStoppedFormatted={historyMatch?.lastStoppedFormatted}
              lastEpisodeLabel={
                historyMatch?.season && historyMatch?.episode
                  ? `S${historyMatch.season}:E${historyMatch.episode} ${historyMatch.episodeTitle ? `${historyMatch.episodeTitle}` : ''}`
                  : undefined
              }
            />
          );
        })}
      </div>
    </motion.section>
  );
};
