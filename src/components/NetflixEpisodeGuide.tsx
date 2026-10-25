import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  LayoutGrid,
  List,
  ChevronRight,
  Check,
  Clock,
  Download,
  Search,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TVSeasonDetail, TVEpisode } from '../types/tmdb';
import { getBackdropUrl } from '../services/tmdb';
import { saveEpisodeProgress, getShowEpisodesProgressMap, EpisodeProgress, isItemDownloaded } from '../services/storage';
import { CustomSelect, CustomSelectOption } from './CustomSelect';

interface NetflixEpisodeGuideProps {
  tvId: number;
  totalSeasons: number;
  selectedSeason: number;
  selectedEpisode: number;
  onSelectSeason: (season: number) => void;
  onSelectEpisode: (episode: number) => void;
  seasonData: TVSeasonDetail | null;
  loadingSeason: boolean;
  fallbackBackdrop?: string | null;
  onDownloadEpisode?: (season: number, episode: number, episodeName?: string) => void;
}

export const NetflixEpisodeGuide: React.FC<NetflixEpisodeGuideProps> = ({
  tvId,
  totalSeasons,
  selectedSeason,
  selectedEpisode,
  onSelectSeason,
  onSelectEpisode,
  seasonData,
  loadingSeason,
  fallbackBackdrop,
  onDownloadEpisode,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [progressMap, setProgressMap] = useState<Record<number, EpisodeProgress>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reload progress map when seasonData or tvId changes
  useEffect(() => {
    if (tvId && selectedSeason) {
      setProgressMap(getShowEpisodesProgressMap(tvId, selectedSeason));
    }
  }, [tvId, selectedSeason, seasonData]);

  const rawEpisodes = seasonData?.episodes || [];
  const totalEpisodesCount = rawEpisodes.length;

  // Filter episodes based on user search / episode number
  const episodes = useMemo(() => {
    if (!searchQuery.trim()) return rawEpisodes;
    const q = searchQuery.toLowerCase().trim();
    return rawEpisodes.filter((ep) => {
      const matchNum = ep.episode_number.toString() === q || `ep ${ep.episode_number}`.includes(q) || `episode ${ep.episode_number}`.includes(q);
      const matchName = ep.name?.toLowerCase().includes(q);
      const matchOverview = ep.overview?.toLowerCase().includes(q);
      return matchNum || matchName || matchOverview;
    });
  }, [rawEpisodes, searchQuery]);

  // Calculate completed count
  const completedCount = rawEpisodes.filter((ep) => {
    const prog = progressMap[ep.episode_number];
    return prog?.isCompleted || (prog?.progressPercent && prog.progressPercent >= 90);
  }).length;

  const handleToggleCompleted = (e: React.MouseEvent, ep: TVEpisode) => {
    e.stopPropagation();
    const current = progressMap[ep.episode_number];
    const duration = (ep.runtime || 45) * 60;
    if (current?.isCompleted) {
      saveEpisodeProgress(tvId, selectedSeason, ep.episode_number, 0, duration);
    } else {
      saveEpisodeProgress(tvId, selectedSeason, ep.episode_number, duration, duration);
    }
    setProgressMap(getShowEpisodesProgressMap(tvId, selectedSeason));
  };

  const handleDownloadClick = (e: React.MouseEvent, ep: TVEpisode) => {
    e.stopPropagation();
    if (onDownloadEpisode) {
      onDownloadEpisode(selectedSeason, ep.episode_number, ep.name || `Episode ${ep.episode_number}`);
    }
  };

  return (
    <section id="netflix-episode-guide" className="mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-zinc-950/70 border border-white/[0.08] rounded-2xl p-5 sm:p-7 shadow-xl backdrop-blur-md">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.08]">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
              Episodes
            </h3>
            {totalEpisodesCount > 0 && (
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                <span>Season {selectedSeason}</span>
                <span>•</span>
                <span>{totalEpisodesCount} Episodes</span>
                {completedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-300 font-medium">{completedCount} watched</span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Right Controls: Season Selector, Search & Layout Toggle */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Custom Season Selector Dropdown */}
            <div className="flex items-center gap-2">
              <CustomSelect
                id="netflix-season-select"
                value={selectedSeason}
                onChange={(val) => onSelectSeason(Number(val))}
                size="sm"
                variant="default"
                icon={<Layers className="w-3.5 h-3.5" />}
                options={Array.from({ length: Math.max(1, totalSeasons) }).map((_, i) => ({
                  value: i + 1,
                  label: `Season ${i + 1}`,
                }))}
              />
            </div>

            {/* Episode Search / Filter Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter episode # or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 text-white text-xs rounded-xl pl-8 pr-7 py-2 focus:outline-none focus:border-white/30 transition-colors placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* List / Grid Toggle */}
            <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">List</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'grid' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clean Interactive Season Pill Tab Bar */}
        {totalSeasons > 1 && (
          <div className="mb-5 pb-3 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {Array.from({ length: totalSeasons }).map((_, i) => {
              const seasonNum = i + 1;
              const isActive = seasonNum === selectedSeason;
              return (
                <button
                  key={seasonNum}
                  onClick={() => onSelectSeason(seasonNum)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 border select-none ${
                    isActive
                      ? 'bg-white text-zinc-900 border-white shadow-sm'
                      : 'bg-white/[0.04] text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  Season {seasonNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Season Progress Bar */}
        {totalEpisodesCount > 0 && (
          <div className="mb-6">
            <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${Math.round((completedCount / totalEpisodesCount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Episodes Content */}
        {loadingSeason ? (
          <div className="py-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading season {selectedSeason} episodes...</span>
          </div>
        ) : episodes.length > 0 ? (
          viewMode === 'list' ? (
            /* Standard List Layout */
            <div className="space-y-2.5">
              {episodes.map((ep, idx) => {
                const isCurrent = ep.episode_number === selectedEpisode;
                const prog = progressMap[ep.episode_number];
                const isCompleted = prog?.isCompleted || (prog?.progressPercent && prog.progressPercent >= 90);
                const progressPct = prog?.progressPercent || 0;
                const isDownloaded = isItemDownloaded(tvId, selectedSeason, ep.episode_number);
                const epName = ep.name || `Episode ${ep.episode_number}`;

                return (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(0.2, idx * 0.02) }}
                    id={`netflix-episode-row-${ep.episode_number}`}
                    onClick={() => onSelectEpisode(ep.episode_number)}
                    className={`group relative rounded-2xl p-3 sm:p-4 transition-all duration-150 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center gap-4 border ${
                      isCurrent
                        ? 'bg-white/[0.06] border-white/20 shadow-xl'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-zinc-300 hover:text-white'
                    }`}
                  >
                    {/* Clean Minimalist Episode Number */}
                    <div className="hidden sm:flex items-center justify-center w-10 shrink-0">
                      <span className={`text-xl sm:text-2xl font-semibold font-mono tracking-tight ${
                        isCurrent ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`}>
                        {ep.episode_number}
                      </span>
                    </div>

                    {/* Thumbnail Still */}
                    <div className="relative w-full sm:w-52 aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-black/40 shadow-md">
                      <img
                        src={
                          ep.still_path
                            ? getBackdropUrl(ep.still_path, 'w780')
                            : getBackdropUrl(fallbackBackdrop, 'w780')
                        }
                        alt={`Episode ${ep.episode_number} - ${epName}`}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Play Hover Overlay */}
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                        isCurrent ? 'bg-black/50 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'
                      }`}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 bg-white text-zinc-900">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Episode Still Progress Bar */}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70">
                          <div
                            className="h-full bg-white"
                            style={{ width: `${Math.min(progressPct, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Episode Information */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5 sm:hidden">
                            <span className={`text-xs font-semibold font-mono ${
                              isCurrent ? 'text-white' : 'text-zinc-400'
                            }`}>
                              Ep {ep.episode_number}
                            </span>
                          </div>

                          <h4 className={`text-sm sm:text-base font-semibold truncate ${
                            isCurrent ? 'text-white' : 'text-zinc-200 group-hover:text-white transition-colors'
                          }`}>
                            {epName}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {ep.runtime && (
                            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">
                              <Clock className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
                              {ep.runtime}m
                            </span>
                          )}

                          {/* Direct Video Download Button for this Episode */}
                          <button
                            onClick={(e) => handleDownloadClick(e, ep)}
                            title={`Download Episode ${ep.episode_number} Video (HD)`}
                            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-medium border ${
                              isDownloaded
                                ? 'bg-white/[0.12] text-white border-white/20'
                                : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.08]'
                            }`}
                          >
                            <Download className="w-4 h-4" strokeWidth={1.5} />
                            <span className="hidden md:inline">Download</span>
                          </button>

                          {/* Watched Status Toggle */}
                          <button
                            onClick={(e) => handleToggleCompleted(e, ep)}
                            title={isCompleted ? 'Mark as unwatched' : 'Mark as watched'}
                            className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                              isCompleted
                                ? 'bg-white/[0.12] text-white border-white/20'
                                : 'bg-white/[0.04] text-zinc-500 hover:text-zinc-300 border-white/[0.08]'
                            }`}
                          >
                            <Check className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                        {ep.overview || 'Stream and download this episode in full HD with fast playback.'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Grid Layout */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {episodes.map((ep, idx) => {
                const isCurrent = ep.episode_number === selectedEpisode;
                const prog = progressMap[ep.episode_number];
                const isCompleted = prog?.isCompleted || (prog?.progressPercent && prog.progressPercent >= 90);
                const progressPct = prog?.progressPercent || 0;
                const isDownloaded = isItemDownloaded(tvId, selectedSeason, ep.episode_number);
                const epName = ep.name || `Episode ${ep.episode_number}`;

                return (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(0.2, idx * 0.02) }}
                    id={`netflix-episode-grid-${ep.episode_number}`}
                    onClick={() => onSelectEpisode(ep.episode_number)}
                    className={`group rounded-2xl p-3.5 transition-all duration-150 cursor-pointer flex flex-col justify-between border ${
                      isCurrent
                        ? 'bg-white/[0.06] border-white/20 shadow-xl'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div>
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40 mb-3 shadow-md">
                        <img
                          src={
                            ep.still_path
                              ? getBackdropUrl(ep.still_path, 'w780')
                              : getBackdropUrl(fallbackBackdrop, 'w780')
                          }
                          alt={`Episode ${ep.episode_number} - ${epName}`}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />

                        {ep.runtime && (
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300">
                            {ep.runtime}m
                          </div>
                        )}

                        {isCurrent && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="px-3 py-1 rounded-full bg-white text-zinc-900 font-semibold text-xs flex items-center gap-1 shadow-lg">
                              <Play className="w-3.5 h-3.5 fill-current" /> Playing Ep {ep.episode_number}
                            </span>
                          </div>
                        )}

                        {progressPct > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/70">
                            <div
                              className="h-full bg-white"
                              style={{ width: `${Math.min(progressPct, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="mb-2">
                        <div className="text-[11px] font-medium font-mono text-zinc-400 uppercase mb-0.5">
                          Episode {ep.episode_number}
                        </div>
                        <h4 className={`text-xs sm:text-sm font-semibold truncate ${
                          isCurrent ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                        }`}>
                          {epName}
                        </h4>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {ep.overview || 'Stream this episode in crystal clear HD.'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => handleToggleCompleted(e, ep)}
                        className={`text-[10px] font-medium flex items-center gap-1 cursor-pointer ${
                          isCompleted ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <Check className="w-3 h-3" strokeWidth={1.5} />
                        <span>{isCompleted ? 'Watched' : 'Mark'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleDownloadClick(e, ep)}
                          title={`Download Episode ${ep.episode_number}`}
                          className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent"
                        >
                          <Download className="w-4 h-4" strokeWidth={1.5} />
                        </button>

                        <span className="text-[11px] text-zinc-300 font-medium group-hover:text-white flex items-center">
                          Play <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          <div className="py-12 text-center text-zinc-400 text-sm">
            {searchQuery ? (
              <div>
                <p>No episodes matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs font-semibold text-white hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              'No episode metadata available for this season.'
            )}
          </div>
        )}
      </div>
    </section>
  );
};
