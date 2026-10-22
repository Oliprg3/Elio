import React, { useState, useEffect } from 'react';
import { DownloadCloud, Trash2, HardDrive, Play, ArrowDownToLine, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DownloadedMedia } from '../types/tmdb';
import { getDownloads, removeDownload } from '../services/storage';
import { getPosterUrl, normalizeImagePath, getProxiedImageUrl } from '../services/tmdb';
import { exportMediaHtmlFile } from '../services/downloadEngine';

interface DownloadsViewProps {
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onBrowseMore?: () => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({ onPlay, onBrowseMore }) => {
  const [downloads, setDownloads] = useState<DownloadedMedia[]>([]);

  useEffect(() => {
    setDownloads(getDownloads());
  }, []);

  const handleRemoveDownload = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    removeDownload(id);
    setDownloads(getDownloads());
  };

  const handleExportFile = (e: React.MouseEvent, item: DownloadedMedia) => {
    e.stopPropagation();
    exportMediaHtmlFile(item);
  };

  const totalUsedBytes = downloads.reduce((acc, curr) => acc + (curr.fileSizeBytes || 0), 0);
  const totalUsedGB = (totalUsedBytes / (1024 * 1024 * 1024)).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen pt-8 sm:pt-10 md:pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-display tracking-tight flex items-center gap-2.5">
            <DownloadCloud className="w-7 h-7 text-white" />
            Downloads & Offline
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Downloaded movies and series ready for offline playback
          </p>
        </div>

        {downloads.length > 0 && (
          <div className="px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-3 text-xs font-medium shadow-md">
            <HardDrive className="w-4 h-4 text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-white font-mono font-semibold">{totalUsedGB} GB Used</span>
              <span className="text-zinc-500 text-[10px]">High Definition Launchers</span>
            </div>
          </div>
        )}
      </div>

      {downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center mb-4 text-zinc-400">
            <DownloadCloud className="w-10 h-10 text-zinc-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No offline downloads yet</h3>
          <p className="text-zinc-400 max-w-sm text-xs leading-relaxed mb-6">
            Click the download button on any title or episode to save it for immediate playback without network access.
          </p>
          {onBrowseMore && (
            <button
              onClick={onBrowseMore}
              className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 text-zinc-950" />
              <span>Browse Movies & Series</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {downloads.map((item) => {
              const isTv = !!item.episode || !!item.media.name;
              const title = item.media.title || item.media.name;

              return (
                <motion.div
                  key={item.id || `${item.media.id}_${item.season}_${item.episode}`}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#0e1015] border border-white/[0.06] rounded-2xl overflow-hidden flex cursor-pointer hover:border-white/[0.18] transition-all group shadow-md"
                  onClick={() => onPlay(item.media.media_type || (item.media.title ? 'movie' : 'tv'), item.media.id)}
                >
                  <div className="w-32 h-44 sm:w-28 sm:h-40 shrink-0 relative bg-zinc-900">
                    <img
                      src={getPosterUrl(item.media.poster_path, 'w342')}
                      alt={title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (item.media.poster_path && !target.src.includes('wsrv.nl')) {
                          const clean = normalizeImagePath(item.media.poster_path);
                          target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w342${clean}`, 342);
                          return;
                        }
                        target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=342&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 text-zinc-950 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-4 h-4 fill-zinc-950 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1">
                        <span className="font-semibold text-zinc-300">{isTv ? 'Series' : 'Film'}</span>
                        <span aria-hidden="true" className="text-zinc-600">·</span>
                        <span>{item.quality}</span>
                        <span aria-hidden="true" className="text-zinc-600">·</span>
                        <span>{item.serverName || 'VidZee'}</span>
                      </div>

                      <h3 className="font-semibold text-sm text-white truncate group-hover:text-zinc-200 transition-colors">
                        {title}
                      </h3>

                      {isTv && item.season && item.episode && (
                        <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">
                          Season {item.season} • Episode {item.episode}
                          {item.episodeName && <span className="text-zinc-400 font-normal"> : {item.episodeName}</span>}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                      <div className="text-[11px] font-mono text-zinc-400">
                        {item.fileSizeDisplay || '1.8 GB'}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleExportFile(e, item)}
                          title="Save HTML Stream Launcher"
                          className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <ArrowDownToLine className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleRemoveDownload(e, item.id || item.media.id)}
                          title="Delete Download"
                          className="p-1.5 hover:bg-white/[0.08] rounded-lg transition-colors text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};
