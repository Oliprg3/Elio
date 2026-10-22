import React, { useState, useEffect } from 'react';
import { Bookmark, History, Trash2, Play, Clock, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TMDBMedia, WatchHistoryItem } from '../types/tmdb';
import { getWatchlist, getWatchHistory, clearWatchHistory, removeFromWatchlist, saveWatchHistory } from '../services/storage';
import { getPosterUrl, getProxiedImageUrl, normalizeImagePath } from '../services/tmdb';
import { MediaCard } from './MediaCard';

interface WatchlistViewProps {
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onInfo: (item: TMDBMedia) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistToggle: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  onPlay,
  onInfo,
  onUnreleased,
  onWatchlistToggle,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'watchlist' | 'history'>('watchlist');
  const [watchlist, setWatchlist] = useState<TMDBMedia[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  const loadData = () => {
    setWatchlist(getWatchlist());
    setHistory(getWatchHistory());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearHistory = () => {
    clearWatchHistory();
    setHistory([]);
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, id: number, type: 'movie' | 'tv') => {
    e.stopPropagation();
    const current = getWatchHistory();
    const updated = current.filter((item) => !(item.id === id && item.type === type));
    localStorage.setItem('cinestream_history_v1', JSON.stringify(updated));
    setHistory(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen pt-8 sm:pt-10 md:pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
            My List
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Your personal saved titles and watch history
          </p>
        </div>

        {/* Sub tabs switcher */}
        <div className="flex items-center p-1 bg-white/[0.04] border border-white/[0.08] rounded-full backdrop-blur-xl">
          <button
            id="watchlist-tab-btn"
            onClick={() => setActiveSubTab('watchlist')}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'watchlist'
                ? 'bg-white text-black shadow-lg'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Watchlist ({watchlist.length})</span>
          </button>
          <button
            id="history-tab-btn"
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'history'
                ? 'bg-white text-black shadow-lg'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Continue Watching ({history.length})</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Watchlist View */}
        {activeSubTab === 'watchlist' && (
          <motion.div
            key="watchlist-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {watchlist.length === 0 ? (
              <div className="py-24 text-center max-w-md mx-auto">
                <div className="flex items-center justify-center mx-auto mb-4 text-zinc-400">
                  <Bookmark className="w-10 h-10 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Your Watchlist is Empty</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Explore movies and shows and save them here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 md:gap-7">
                {watchlist.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    className="w-full"
                    onPlay={onPlay}
                    onInfo={onInfo}
                    onUnreleased={onUnreleased}
                    onWatchlistToggle={() => {
                      loadData();
                      onWatchlistToggle();
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* History / Continue Watching View */}
        {activeSubTab === 'history' && (
          <motion.div
            key="history-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {history.length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear History
                </button>
              </div>
            )}

            {history.length === 0 ? (
              <div className="py-24 text-center max-w-md mx-auto">
                <div className="flex items-center justify-center mx-auto mb-4 text-zinc-400">
                  <History className="w-10 h-10 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">No Streaming History</h3>
                <p className="text-zinc-400 text-xs mb-6">
                  Titles you watch will appear here so you can easily resume.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {history.map((h) => {
                  const formattedDate = new Date(h.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });
                  const progress = h.progressPercent || 0;
                  const isCompleted = h.isCompleted || progress >= 95;

                  return (
                    <motion.div
                      key={`${h.type}-${h.id}-${h.season || 0}-${h.episode || 0}`}
                      whileHover={{ y: -3 }}
                      className="bg-[#0e1015] border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between group hover:border-white/[0.15] transition-all shadow-md relative"
                    >
                      {/* Delete item button */}
                      <button
                        onClick={(e) => handleRemoveHistoryItem(e, h.id, h.type)}
                        title="Remove from history"
                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/60 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      <div>
                        <div className="flex gap-3">
                          {/* Poster */}
                          <div className="relative w-16 h-24 flex-shrink-0">
                            <img
                              src={getPosterUrl(h.poster_path, 'w185')}
                              alt={h.title}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (h.poster_path && !target.src.includes('wsrv.nl')) {
                                  const clean = normalizeImagePath(h.poster_path);
                                  target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w185${clean}`, 185);
                                  return;
                                }
                                target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=200&q=80';
                              }}
                              className="w-full h-full object-cover rounded-lg bg-neutral-900 border border-white/10"
                            />
                            {isCompleted && (
                              <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={1.5} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-4">
                            <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                              {h.type === 'movie' ? 'Movie' : 'Show'}
                            </div>
                            <h4 className="text-sm font-bold text-white truncate mt-0.5 group-hover:text-zinc-200 transition-colors">
                              {h.title}
                            </h4>
                            {h.season && h.episode && (
                              <div className="text-xs text-neutral-300 font-semibold mt-0.5">
                                Season {h.season} Episode {h.episode}
                              </div>
                            )}
                            {h.episodeTitle && (
                              <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                                {h.episodeTitle}
                              </div>
                            )}
                            <div className="text-[10px] text-neutral-500 mt-1">
                              {formattedDate}
                            </div>
                          </div>
                        </div>

                        {/* Stopped timestamp indicator & Progress bar */}
                        <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-[11px] text-zinc-300 mb-1.5 font-mono">
                            <span className="flex items-center gap-1 text-zinc-400 text-[10px]">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              {isCompleted ? (
                                <span className="text-zinc-200 font-semibold">Completed</span>
                              ) : (
                                <span>Stopped at {h.lastStoppedFormatted || `${progress}%`}</span>
                              )}
                            </span>
                            <span className="text-zinc-200 font-semibold text-[10px]">
                              {progress}%
                            </span>
                          </div>
                          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 bg-white"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resume button */}
                      <button
                        onClick={() => onPlay(h.type, h.id)}
                        className="mt-3.5 w-full py-2 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950" />
                        <span>{isCompleted ? 'Watch Again' : 'Resume'}</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
