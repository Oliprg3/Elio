import React, { useState, useEffect } from 'react';
import {
  X,
  DownloadCloud,
  Film,
  Tv,
  Copy,
  Check,
  ArrowDownToLine,
  ExternalLink,
  Play,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TMDBMedia } from '../types/tmdb';
import { getVideoDownloadOptions, downloadMediaFileToDevice, VideoDownloadOption } from '../services/downloadEngine';
import { addDownload } from '../services/storage';
import { CustomSelect } from './CustomSelect';

interface DownloadMediaModalProps {
  media: TMDBMedia | null;
  isOpen: boolean;
  onClose: () => void;
  season?: number;
  episode?: number;
  episodeName?: string;
  totalSeasons?: number;
  onDownloadStarted?: () => void;
}

export const DownloadMediaModal: React.FC<DownloadMediaModalProps> = ({
  media,
  isOpen,
  onClose,
  season = 1,
  episode = 1,
  episodeName,
  totalSeasons = 1,
  onDownloadStarted,
}) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(season);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(episode);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSeason(season || 1);
      setSelectedEpisode(episode || 1);
      setDownloadSuccess(false);
    }
  }, [isOpen, season, episode]);

  if (!isOpen || !media) return null;

  const isMovie = media.media_type === 'movie' || ('title' in media && !!media.title);
  const title = media.title || media.name || 'Media';
  const computedTotalSeasons = totalSeasons || (media as any).number_of_seasons || (media as any).seasons?.length || 1;
  const options = getVideoDownloadOptions(media, selectedSeason, selectedEpisode);

  const handleStartDownload = (option: VideoDownloadOption) => {
    const epLabel = !isMovie ? (episodeName || `Episode ${selectedEpisode}`) : undefined;
    
    // Save to local storage downloads library
    addDownload(
      media,
      !isMovie ? selectedSeason : undefined,
      !isMovie ? selectedEpisode : undefined,
      epLabel,
      option.quality,
      option.format,
      option.sizeMB
    );

    if (onDownloadStarted) onDownloadStarted();

    // Trigger instant browser download
    downloadMediaFileToDevice(
      media,
      option,
      selectedSeason,
      selectedEpisode,
      epLabel
    );

    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
    }, 4000);
  };

  const handleCopyStreamLink = (url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#0e1015] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-2xl text-white overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3.5 mb-5 pr-8">
            <DownloadCloud className="w-7 h-7 text-white shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                {title}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isMovie ? 'Download movie video file' : `Season ${selectedSeason}, Episode ${selectedEpisode}`}
              </p>
            </div>
          </div>

          {/* TV Show Episode & Season Switcher */}
          {!isMovie && (
            <div className="mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-zinc-300">Target Episode:</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Season selector */}
                <CustomSelect
                  value={selectedSeason}
                  onChange={(val) => {
                    setSelectedSeason(Number(val));
                    setSelectedEpisode(1);
                  }}
                  size="sm"
                  variant="subtle"
                  options={Array.from({ length: Math.max(1, computedTotalSeasons) }).map((_, i) => ({
                    value: i + 1,
                    label: `Season ${i + 1}`,
                  }))}
                />

                {/* Episode number selector */}
                <CustomSelect
                  value={selectedEpisode}
                  onChange={(val) => setSelectedEpisode(Number(val))}
                  size="sm"
                  variant="subtle"
                  options={Array.from({ length: 30 }).map((_, i) => ({
                    value: i + 1,
                    label: `Ep ${i + 1}`,
                  }))}
                />
              </div>
            </div>
          )}

          {/* Download Success Notice */}
          {downloadSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs flex flex-col gap-1.5">
              <span className="flex items-center gap-2 font-bold text-white">
                <Check className="w-4 h-4 text-white" strokeWidth={1.5} />
                <span>Stream Launcher saved!</span>
              </span>
              <span className="text-zinc-400 leading-relaxed">
                Direct .mp4 downloads are disabled by the stream host due to copyright protections. We have downloaded an HTML Stream Launcher instead. Open it in any browser to watch your video ad-free.
              </span>
            </div>
          )}

          {/* Quality Options */}
          <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Video Quality & Formats
              </span>
              <button
                onClick={() => handleCopyStreamLink(options[0].url)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors bg-transparent"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
              </button>
            </div>

            {options.map((opt) => (
              <div
                key={opt.quality}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Film className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{opt.quality}</span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {opt.format}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {opt.resolution} • {opt.sizeFormatted}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyStreamLink(opt.url)}
                    title="Copy stream URL"
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleStartDownload(opt)}
                    className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-white/[0.06] pt-3.5">
            <span>Saves offline HTML stream launcher</span>
            <button
              onClick={() => handleCopyStreamLink(options[0].url)}
              className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{copiedLink ? 'Copied' : 'Copy Direct Link'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
