import React, { useState, useEffect } from 'react';
import { X, Calendar, Bookmark, Check, ShieldAlert, Film, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TMDBMedia } from '../types/tmdb';
import { getPosterUrl, getBackdropUrl, getProxiedImageUrl, normalizeImagePath } from '../services/tmdb';
import { isItemInWatchlist, addToWatchlist, removeFromWatchlist } from '../services/storage';

interface NotReleasedModalProps {
  item: TMDBMedia | null;
  isOpen: boolean;
  onClose: () => void;
  onWatchlistChange?: () => void;
}

export const NotReleasedModal: React.FC<NotReleasedModalProps> = ({
  item,
  isOpen,
  onClose,
  onWatchlistChange,
}) => {
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    if (item) {
      setInWatchlist(isItemInWatchlist(item.id));
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const title = item.title || item.name || 'Untitled';
  const releaseDate = item.release_date || item.first_air_date || 'Upcoming';
  const type = item.media_type || (item.title ? 'movie' : 'tv');

  const toggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(item.id);
      setInWatchlist(false);
    } else {
      addToWatchlist(item);
      setInWatchlist(true);
    }
    if (onWatchlistChange) onWatchlistChange();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div
        id="not-released-modal-backdrop"
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#000000] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header Banner */}
          <div className="relative h-44 w-full bg-neutral-900 overflow-hidden">
            <img
              src={getBackdropUrl(item.backdrop_path || item.poster_path, 'w780')}
              alt={title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                const path = item.backdrop_path || item.poster_path;
                if (path && !target.src.includes('wsrv.nl')) {
                  const clean = normalizeImagePath(path);
                  target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w780${clean}`, 780);
                  return;
                }
                target.src = 'https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?auto=format&fit=crop&w=780&q=80';
              }}
              className="w-full h-full object-cover object-center opacity-40 blur-xs"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 z-20 p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {/* Poster + Badge Floating */}
            <div className="absolute bottom-3 left-5 right-5 flex items-end gap-3.5">
              <div className="w-16 h-24 rounded-lg overflow-hidden bg-neutral-800 border border-white/15 flex-shrink-0 shadow-lg">
                <img
                  src={getPosterUrl(item.poster_path, 'w342')}
                  alt={title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (item.poster_path && !target.src.includes('wsrv.nl')) {
                      const clean = normalizeImagePath(item.poster_path);
                      target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w342${clean}`, 342);
                      return;
                    }
                    if (item.backdrop_path && !target.src.includes(item.backdrop_path)) {
                      target.src = getBackdropUrl(item.backdrop_path, 'w780');
                      return;
                    }
                    target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=342&q=80';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 pb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 uppercase tracking-wider mb-1">
                  <ShieldAlert className="w-3 h-3" />
                  Not Released
                </span>
                <h3 className="text-base font-bold text-white truncate font-display">
                  {title}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                  <Calendar className="w-3 h-3 text-neutral-500" />
                  <span>Theatrical Release: {releaseDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Body Information */}
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-zinc-400" />
                HD Streaming Notice
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                This title is currently not released in official HD digital quality. elio+ only provides verified HD streaming without bootleg recordings.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={toggleWatchlist}
                className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  inWatchlist
                    ? 'bg-white/10 border border-white/15 text-white'
                    : 'bg-white hover:bg-zinc-200 text-zinc-950 shadow-md'
                }`}
              >
                {inWatchlist ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>In Your Watchlist</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4 text-zinc-950" />
                    <span>Save to Watchlist</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-semibold border border-white/[0.06] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
