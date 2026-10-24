import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  ArrowLeft,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Check,
  Share2,
  Moon,
  Sun,
  DownloadCloud,
  X,
  RotateCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TMDBMedia, MediaDetail, TVSeasonDetail, TVEpisode } from '../types/tmdb';
import { getMediaDetails, getTVSeasonDetails, getBackdropUrl, getPosterUrl, getAvatarUrl, getLocalMediaFallback, getProxiedImageUrl, normalizeImagePath } from '../services/tmdb';
import { STREAM_SERVERS } from '../services/servers';
import { getMediaReleaseStatus } from '../services/releaseStatus';
import {
  isItemInWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  saveWatchHistory,
  getSettings,
  saveSettings,
  getHistoryItem,
  formatPlaybackTime,
  saveEpisodeProgress,
  isItemDownloaded,
  addDownload,
} from '../services/storage';
import { NetflixEpisodeGuide } from './NetflixEpisodeGuide';
import { StreamQualityControl } from './StreamQualityControl';
import { RelatedMediaSection } from './RelatedMediaSection';
import { DownloadMediaModal } from './DownloadMediaModal';
import { adBlocker, AdBlockLevel } from '../services/adBlocker';

interface WatchViewProps {
  type: 'movie' | 'tv';
  id: number;
  onBack: () => void;
  onSelectMedia: (type: 'movie' | 'tv', id: number) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistChange: () => void;
}

export const WatchView: React.FC<WatchViewProps> = ({
  type,
  id,
  onBack,
  onSelectMedia,
  onUnreleased,
  onWatchlistChange,
}) => {
  const [media, setMedia] = useState<MediaDetail | null>(() => getLocalMediaFallback(type, id));
  const [loading, setLoading] = useState(false);
  const [serverIndex, setServerIndex] = useState<number>(0); // Default to VidZee Ultra
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [targetDownloadSeason, setTargetDownloadSeason] = useState<number>(1);
  const [targetDownloadEpisode, setTargetDownloadEpisode] = useState<number>(1);
  const [targetDownloadEpisodeName, setTargetDownloadEpisodeName] = useState<string | undefined>(undefined);
  const [seasonData, setSeasonData] = useState<TVSeasonDetail | null>(null);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState<number>(0);
  const [selectedQuality, setSelectedQuality] = useState<'auto' | '1080p' | '4k' | '720p'>('1080p');
  const [streamEnhancer, setStreamEnhancer] = useState<boolean>(true);
  const [showNextPrompt, setShowNextPrompt] = useState<boolean>(false);
  const [audioBoost, setAudioBoost] = useState<number>(100);
  const [adBlockLevel, setAdBlockLevel] = useState<AdBlockLevel>(adBlocker.getLevel());
  const [playerNotification, setPlayerNotification] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Initialize AdBlocker engine silently
  useEffect(() => {
    adBlocker.init();
    const unsubscribe = adBlocker.subscribe(() => {
      setAdBlockLevel(adBlocker.getLevel());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync state instantly if type or id changes
  useEffect(() => {
    setMedia(getLocalMediaFallback(type, id));
  }, [type, id]);

  // Initialize settings and existing playback stop point
  useEffect(() => {
    const settings = getSettings();
    if (settings.qualityPreference) {
      setSelectedQuality(settings.qualityPreference);
    }
    if (settings.streamEnhancer !== undefined) {
      setStreamEnhancer(settings.streamEnhancer);
    }
    setServerIndex(0);
    saveSettings({ preferredServer: 'vidzee' });

    const prevHistory = getHistoryItem(id, type);
    if (prevHistory) {
      if (type === 'tv' && prevHistory.season) {
        setSelectedSeason(prevHistory.season);
        if (prevHistory.episode) setSelectedEpisode(prevHistory.episode);
      }
      if (prevHistory.watchedSeconds) {
        setWatchedSeconds(prevHistory.watchedSeconds);
      }
    }
  }, [id, type]);

  // Fetch Media Details in the background
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const details = await getMediaDetails(type, id);
        if (isMounted && details) {
          setMedia(details);
          setInWatchlist(isItemInWatchlist(details.id));
          setIsDownloaded(isItemDownloaded(details.id));
        }
      } catch (err) {
        console.error('Failed to load media details', err);
      }
    }

    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isMounted = false;
    };
  }, [type, id]);

  // For TV Shows: Fetch Season Episodes when season changes
  useEffect(() => {
    if (type !== 'tv') return;

    let isMounted = true;
    setLoadingSeason(true);

    async function loadSeason() {
      try {
        const data = await getTVSeasonDetails(id, selectedSeason);
        if (isMounted) {
          setSeasonData(data);
          // If current selected episode is not in this season, reset to 1
          if (data && data.episodes && !data.episodes.some((e) => e.episode_number === selectedEpisode)) {
            setSelectedEpisode(1);
          }
        }
      } catch (err) {
        console.error('Failed to load season details', err);
      } finally {
        if (isMounted) setLoadingSeason(false);
      }
    }

    loadSeason();

    return () => {
      isMounted = false;
    };
  }, [type, id, selectedSeason]);

  const currentEpisodeObj = seasonData?.episodes.find((e) => e.episode_number === selectedEpisode);

  // Compute total duration in seconds
  const totalDurationSeconds =
    type === 'movie'
      ? (media?.runtime ? media.runtime * 60 : 7200)
      : (currentEpisodeObj?.runtime ? currentEpisodeObj.runtime * 60 : 2700);

  // Save / update watch history and episode progress helper
  const persistProgress = (secs: number, notifyParent: boolean = false) => {
    if (!media) return;
    const title = media.title || media.name || 'Untitled';
    const year = (media.release_date || media.first_air_date || '').slice(0, 4);

    saveWatchHistory({
      id: media.id,
      type,
      title,
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path,
      vote_average: media.vote_average,
      year,
      season: type === 'tv' ? selectedSeason : undefined,
      episode: type === 'tv' ? selectedEpisode : undefined,
      episodeTitle: type === 'tv' ? currentEpisodeObj?.name : undefined,
      timestamp: Date.now(),
      watchedSeconds: secs,
      durationSeconds: totalDurationSeconds,
      progressPercent: Math.min(100, Math.round((secs / totalDurationSeconds) * 100)),
    });

    if (type === 'tv') {
      saveEpisodeProgress(media.id, selectedSeason, selectedEpisode, secs, totalDurationSeconds);
    }
    if (notifyParent) {
      onWatchlistChange();
    }
  };

  // Continuous session tracking & progress persistence (silent to prevent UI freeze/memory buildup)
  useEffect(() => {
    if (!media) return;
    persistProgress(watchedSeconds, false);

    if (type === 'tv' && watchedSeconds >= totalDurationSeconds * 0.92 && !showNextPrompt) {
      setShowNextPrompt(true);
    }
  }, [watchedSeconds, media, type, selectedSeason, selectedEpisode, totalDurationSeconds]);

  // Sync to parent on unmount
  useEffect(() => {
    return () => {
      onWatchlistChange();
    };
  }, [onWatchlistChange]);

  // Interval timer for playback position advancement (lightweight, runs every 10s without parent re-renders)
  useEffect(() => {
    if (!media) return;

    const interval = setInterval(() => {
      setWatchedSeconds((prev) => Math.min(totalDurationSeconds, prev + 10));
    }, 10000);

    return () => clearInterval(interval);
  }, [media, totalDurationSeconds]);

  const handleTimeChange = (newSec: number) => {
    setWatchedSeconds(newSec);
    persistProgress(newSec, true);
  };

  const handleMarkCompleted = () => {
    setWatchedSeconds(totalDurationSeconds);
    persistProgress(totalDurationSeconds, true);
    if (type === 'tv') {
      setShowNextPrompt(true);
    }
  };

  const handleResetTime = () => {
    setWatchedSeconds(0);
    persistProgress(0, true);
    setShowNextPrompt(false);
  };

  // VidZee is the dedicated exclusive stream provider
  const streamUrl =
    type === 'movie'
      ? `https://player.vidzee.wtf/embed/movie/${id}?lang=en&sub=en`
      : `https://player.vidzee.wtf/embed/tv/${id}/${selectedSeason}/${selectedEpisode}?lang=en&sub=en`;


  const toggleWatchlist = () => {
    if (!media) return;
    if (inWatchlist) {
      removeFromWatchlist(media.id);
      setInWatchlist(false);
    } else {
      addToWatchlist(media);
      setInWatchlist(true);
    }
    onWatchlistChange();
  };

  const handleDownload = () => {
    if (!media) return;
    setTargetDownloadSeason(selectedSeason);
    setTargetDownloadEpisode(selectedEpisode);
    setTargetDownloadEpisodeName(currentEpisodeObj?.name);
    setDownloadModalOpen(true);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNextEpisode = () => {
    if (!seasonData?.episodes) return;
    const currentIndex = seasonData.episodes.findIndex((e) => e.episode_number === selectedEpisode);
    if (currentIndex < seasonData.episodes.length - 1) {
      setSelectedEpisode(seasonData.episodes[currentIndex + 1].episode_number);
      setWatchedSeconds(0);
      setShowNextPrompt(false);
      window.scrollTo({
        top: playerContainerRef.current?.offsetTop ? playerContainerRef.current.offsetTop - 80 : 0,
        behavior: 'smooth',
      });
    } else if (media?.seasons && selectedSeason < media.seasons.length) {
      setSelectedSeason((prev) => prev + 1);
      setSelectedEpisode(1);
      setWatchedSeconds(0);
      setShowNextPrompt(false);
      window.scrollTo({
        top: playerContainerRef.current?.offsetTop ? playerContainerRef.current.offsetTop - 80 : 0,
        behavior: 'smooth',
      });
    }
  };

  const handlePrevEpisode = () => {
    if (!seasonData?.episodes) return;
    const currentIndex = seasonData.episodes.findIndex((e) => e.episode_number === selectedEpisode);
    if (currentIndex > 0) {
      setSelectedEpisode(seasonData.episodes[currentIndex - 1].episode_number);
      setWatchedSeconds(0);
      setShowNextPrompt(false);
      window.scrollTo({
        top: playerContainerRef.current?.offsetTop ? playerContainerRef.current.offsetTop - 80 : 0,
        behavior: 'smooth',
      });
    }
  };

  const handleQualityChange = (q: 'auto' | '1080p' | '4k' | '720p') => {
    setSelectedQuality(q);
    saveSettings({ qualityPreference: q });
    setPlayerKey((k) => k + 1);
  };

  const handleToggleStreamEnhancer = () => {
    const newVal = !streamEnhancer;
    setStreamEnhancer(newVal);
    saveSettings({ streamEnhancer: newVal });
  };

  // TV Remote Media Keys & Quick Shortcuts Handler
  useEffect(() => {
    const handleTVRemoteKeys = (e: KeyboardEvent) => {
      // Ignore key events when user is typing in form inputs
      const activeTag = (document.activeElement?.tagName || '').toUpperCase();
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      const key = e.key;
      const code = e.keyCode;

      // Fast Forward (+10s) / Rewind (-10s) via Shift+Right / Shift+Left or Media Keys
      if (key === 'MediaFastForward' || (e.shiftKey && (key === 'ArrowRight' || code === 39))) {
        e.preventDefault();
        handleTimeChange(Math.min(totalDurationSeconds, watchedSeconds + 10));
      } else if (key === 'MediaRewind' || (e.shiftKey && (key === 'ArrowLeft' || code === 37))) {
        e.preventDefault();
        handleTimeChange(Math.max(0, watchedSeconds - 10));
      } else if (key === 'MediaTrackNext' || key === 'n' || key === 'N') {
        if (type === 'tv') handleNextEpisode();
      } else if (key === 'MediaTrackPrevious' || key === 'p' || key === 'P') {
        if (type === 'tv') handlePrevEpisode();
      } else if (key === 'r' || key === 'R') {
        setPlayerKey((k) => k + 1);
      }
    };

    window.addEventListener('keydown', handleTVRemoteKeys);
    return () => window.removeEventListener('keydown', handleTVRemoteKeys);
  }, [type, watchedSeconds, totalDurationSeconds, selectedSeason, selectedEpisode, seasonData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-white">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-white px-4">
        <h2 className="text-xl font-bold mb-2">Unavailable</h2>
        <p className="text-zinc-400 text-sm mb-6">Unable to load the requested video stream.</p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm cursor-pointer transition-all"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const releaseStatus = getMediaReleaseStatus(media);

  if (!releaseStatus.isReleased) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-white px-4 text-center">
        <div className="flex items-center justify-center text-amber-400 mb-4">
          <AlertCircle className="w-10 h-10" strokeWidth={1.5} />
        </div>
        <span className="px-3 py-1 rounded-full bg-white/10 text-amber-300 font-semibold text-xs uppercase tracking-wider mb-3">
          Coming Soon
        </span>
        <h2 className="text-2xl font-bold mb-2 max-w-md">{media.title || media.name}</h2>
        <p className="text-zinc-400 text-sm max-w-md mb-6 leading-relaxed">
          {releaseStatus.statusMessage} elio+ streams verified HD content and avoids low-quality bootlegs.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleWatchlist}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
              inWatchlist ? 'bg-white/10 text-white border border-white/15' : 'bg-white hover:bg-zinc-200 text-zinc-950 font-bold'
            }`}
          >
            {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {inWatchlist ? 'In My List' : 'Add to List'}
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-zinc-300 hover:text-white font-medium text-sm cursor-pointer transition-colors"
          >
            Return to Browse
          </button>
        </div>
      </div>
    );
  }

  const title = media.title || media.name || 'Untitled';
  const releaseYear = (media.release_date || media.first_air_date || '').slice(0, 4);
  const runtimeDisplay = media.runtime
    ? `${Math.floor(media.runtime / 60)}h ${media.runtime % 60}m`
    : currentEpisodeObj?.runtime
    ? `${currentEpisodeObj.runtime}m`
    : null;
  const totalSeasons = media.number_of_seasons || (media.seasons ? media.seasons.length : 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen bg-[#000000] pb-24 transition-colors duration-500 ${
        isDimmed ? 'bg-black' : ''
      }`}
    >
      {/* Top Floating Control Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[#000000]/90 backdrop-blur-2xl border-b border-white/[0.06] px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="watch-back-button"
              onClick={onBack}
              className="p-2 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer bg-transparent"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate font-display">
                {title}
              </h2>
              {type === 'tv' && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-400 font-medium">
                    Season {selectedSeason} • Episode {selectedEpisode}
                  </span>
                  {currentEpisodeObj?.name && (
                    <p className="text-xs text-zinc-300 font-medium truncate hidden sm:inline">
                      : {currentEpisodeObj.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Icons - Clean transparent icon buttons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Stream Quality Selector */}
            <StreamQualityControl
              selectedQuality={selectedQuality}
              onSelectQuality={handleQualityChange}
              streamEnhancer={streamEnhancer}
              onToggleStreamEnhancer={handleToggleStreamEnhancer}
            />

            {/* Watchlist Bookmark */}
            <button
              id="watch-watchlist-toggle"
              onClick={toggleWatchlist}
              title={inWatchlist ? 'Remove from My List' : 'Add to My List'}
              className="p-2 text-zinc-300 hover:text-white transition-colors cursor-pointer bg-transparent"
            >
              {inWatchlist ? <Check className="w-4 h-4 text-white" strokeWidth={1.5} /> : <Bookmark className="w-4 h-4" strokeWidth={1.5} />}
            </button>

            {/* Download */}
            <button
              id="watch-download-toggle"
              onClick={handleDownload}
              title={isDownloaded ? 'Downloaded' : 'Download for offline viewing'}
              className="p-2 text-zinc-300 hover:text-white transition-colors cursor-pointer bg-transparent"
            >
              {isDownloaded ? <Check className="w-4 h-4 text-white" strokeWidth={1.5} /> : <DownloadCloud className="w-4 h-4" strokeWidth={1.5} />}
            </button>

            {/* Share link */}
            <button
              id="watch-share-button"
              onClick={handleShare}
              title="Copy stream link"
              className="p-2 text-zinc-300 hover:text-white transition-colors cursor-pointer bg-transparent"
            >
              {copiedLink ? <Check className="w-4 h-4 text-white" strokeWidth={1.5} /> : <Share2 className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Streaming Area */}
      <div
        ref={playerContainerRef}
        className={`mx-auto transition-all duration-300 pt-4 px-4 sm:px-6 lg:px-8 relative z-10 ${
          isTheaterMode ? 'max-w-full px-0 sm:px-0 lg:px-0 pt-0' : 'max-w-6xl'
        }`}
      >
        {/* Stream Player Controls Header - Apple TV+ / Netflix Frosted Glass Style */}
        <div className="bg-[#0b0c10]/95 backdrop-blur-2xl rounded-t-2xl p-3 sm:p-3.5 flex items-center justify-between flex-wrap gap-2.5 border-b border-white/[0.06] shadow-lg">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Reload Stream Button */}
            <button
              id="btn-reload-stream"
              onClick={() => {
                setPlayerKey((k) => k + 1);
                setPlayerNotification('Player Refreshed');
                setTimeout(() => setPlayerNotification(null), 2500);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.06] text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95"
              title="Reload Player"
            >
              <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Reload</span>
            </button>


            {/* Zero Pop-up Protection Shield Indicator */}
            <span className="text-[11px] font-medium text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06] hidden md:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Shield Active</span>
            </span>

            {playerNotification && (
              <span className="text-[11px] font-medium text-zinc-200 bg-white/10 px-2.5 py-1 rounded-full border border-white/15 shadow-sm animate-in fade-in duration-200">
                {playerNotification}
              </span>
            )}
          </div>

          {/* Quick Player Action Utilities */}
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {/* TV Show Quick Prev/Next buttons */}
            {type === 'tv' && seasonData?.episodes && (
              <div className="flex items-center gap-1 mr-1 border-r border-white/[0.08] pr-2">
                <button
                  onClick={handlePrevEpisode}
                  disabled={selectedEpisode <= 1}
                  className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] disabled:opacity-20 disabled:pointer-events-none text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-0.5 cursor-pointer border border-white/[0.06] transition-all"
                  title="Previous Episode"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  onClick={handleNextEpisode}
                  className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-0.5 cursor-pointer border border-white/[0.06] transition-all"
                  title="Next Episode"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Focus / Dim Lights */}
            <button
              onClick={() => setIsDimmed(!isDimmed)}
              title={isDimmed ? 'Turn lights on' : 'Dim lights (Cinema Theater Atmosphere)'}
              className={`p-2 rounded-full transition-all cursor-pointer border ${
                isDimmed
                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                  : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/[0.06] text-zinc-300 hover:text-white'
              }`}
            >
              {isDimmed ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Theater Mode Toggle (Standard vs Full Theater) */}
            <button
              onClick={() => {
                adBlocker.suppressNextPopups(4000);
                setIsTheaterMode(!isTheaterMode);
              }}
              title={isTheaterMode ? 'Minimize to standard player' : 'Maximize to theater mode'}
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-all cursor-pointer border border-white/[0.06]"
            >
              {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Responsive 16:9 Aspect Ratio Video Player Container */}
        <div
          id="streaming-iframe-wrapper"
          className={`relative w-full aspect-video bg-black transition-all duration-300 ${
            isTheaterMode ? '' : 'rounded-b-2xl overflow-hidden border-x border-b border-white/[0.06] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]'
          }`}
        >
          {/* Ambient Cinema Halo Behind Player */}
          <div className="absolute -inset-4 bg-gradient-to-r from-white/[0.02] via-zinc-800/[0.02] to-transparent blur-3xl opacity-30 pointer-events-none -z-10" />

          <>
            <iframe
              key={`${streamUrl}-${playerKey}-${adBlockLevel}`}
              id="cinestream-player-frame"
              src={streamUrl}
              title={`${title} Stream Player`}
              className="absolute inset-0 w-full h-full border-0 bg-black"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="origin"
              sandbox={adBlocker.getIframeSandboxAttributes() || 'allow-scripts allow-same-origin allow-presentation allow-pointer-lock allow-forms'}
            />
          </>

          {/* Simple Up Next Button Prompt */}
          <AnimatePresence>
            {showNextPrompt && type === 'tv' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute bottom-5 right-5 z-30 flex items-center gap-2"
              >
                <button
                  id="btn-up-next-prompt"
                  onClick={handleNextEpisode}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 active:scale-95 text-black font-extrabold text-xs shadow-2xl shadow-black/90 cursor-pointer transition-all duration-150"
                  title={`Play Next: Season ${selectedSeason} Episode ${selectedEpisode + 1}`}
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Up Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowNextPrompt(false)}
                  aria-label="Dismiss Up Next"
                  title="Dismiss"
                  className="p-2 rounded-full bg-black/70 hover:bg-black/90 text-neutral-400 hover:text-white backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Netflix-Style Series Tracking & Episode Browser for TV shows */}
      {type === 'tv' && (
        <NetflixEpisodeGuide
          tvId={id}
          totalSeasons={totalSeasons}
          selectedSeason={selectedSeason}
          selectedEpisode={selectedEpisode}
          onSelectSeason={(s) => {
            setSelectedSeason(s);
            setSelectedEpisode(1);
            setWatchedSeconds(0);
            setShowNextPrompt(false);
          }}
          onSelectEpisode={(ep) => {
            setSelectedEpisode(ep);
            setWatchedSeconds(0);
            setShowNextPrompt(false);
            window.scrollTo({
              top: playerContainerRef.current?.offsetTop ? playerContainerRef.current.offsetTop - 80 : 0,
              behavior: 'smooth',
            });
          }}
          seasonData={seasonData}
          loadingSeason={loadingSeason}
          fallbackBackdrop={media.backdrop_path}
          onDownloadEpisode={(s, ep, epName) => {
            setTargetDownloadSeason(s);
            setTargetDownloadEpisode(ep);
            setTargetDownloadEpisodeName(epName);
            setDownloadModalOpen(true);
          }}
        />
      )}

      {/* Rich Media Metadata & Synopsis Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              {/* Clean Metadata Line */}
              <div className="flex items-center flex-wrap gap-3 text-xs sm:text-sm text-neutral-400 font-medium mb-3">
                <span className="text-white font-semibold">{type === 'movie' ? 'Movie' : 'Show'}</span>
                {releaseYear && (
                  <span>{releaseYear}</span>
                )}
                {runtimeDisplay && (
                  <span>{runtimeDisplay}</span>
                )}
                {media.vote_average > 0 && (
                  <span className="text-neutral-300 font-semibold font-mono">
                    {media.vote_average.toFixed(1)} / 10
                  </span>
                )}
              </div>

              {/* Title & Tagline */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-display tracking-tight">
                {title}
              </h1>
              {media.tagline && (
                <p className="text-sm italic text-neutral-400 mt-1">&ldquo;{media.tagline}&rdquo;</p>
              )}
            </div>

            {/* Genres Chips */}
            {media.genres && media.genres.length > 0 && (
              <div className="flex items-center flex-wrap gap-2">
                {media.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-900 text-neutral-300"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Synopsis</h3>
              <p className="text-neutral-300 leading-relaxed text-sm sm:text-base font-normal">
                {media.overview || `Watch ${title} in crystal-clear high definition with seamless playback and multiple subtitle options on elio+.`}
              </p>
            </div>

            {/* Cast Carousel */}
            {media.credits?.cast && media.credits.cast.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Featured Cast</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {media.credits.cast.slice(0, 12).map((actor) => (
                    <div key={actor.id} className="flex-shrink-0 w-24 text-center">
                      <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-neutral-800 mb-2">
                        <img
                          src={getAvatarUrl(actor.profile_path)}
                          alt={actor.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (actor.profile_path && !target.src.includes('wsrv.nl')) {
                              const clean = normalizeImagePath(actor.profile_path);
                              target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w185${clean}`, 185);
                              return;
                            }
                            target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
                          }}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-semibold text-neutral-200 line-clamp-1">{actor.name}</div>
                      <div className="text-[10px] text-neutral-400 line-clamp-1">{actor.character}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Poster & Quick Info */}
          <div className="space-y-6">
            <div className="bg-[#121214] rounded-2xl p-5 space-y-4">
              <img
                src={getPosterUrl(media.poster_path, 'w500')}
                alt={title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (media.poster_path && !target.src.includes('wsrv.nl')) {
                    const clean = normalizeImagePath(media.poster_path);
                    target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w500${clean}`, 500);
                    return;
                  }
                  if (media.backdrop_path && !target.src.includes(media.backdrop_path)) {
                    target.src = getBackdropUrl(media.backdrop_path, 'w780');
                    return;
                  }
                  target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80';
                }}
                className="w-full aspect-[2/3] object-cover rounded-xl"
              />

              <div className="space-y-3 text-xs text-neutral-300 divide-y divide-white/5">
                <div className="flex justify-between pt-2">
                  <span className="text-neutral-500">Status</span>
                  <span className="font-medium text-white">{media.status || 'Released'}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-neutral-500">Language</span>
                  <span className="font-medium text-white uppercase">English (EN)</span>
                </div>
                {media.vote_count > 0 && (
                  <div className="flex justify-between pt-2">
                    <span className="text-neutral-500">Votes</span>
                    <span className="font-medium text-white">{media.vote_count.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Section */}
      <RelatedMediaSection
        recommendations={media.recommendations?.results || []}
        similar={media.similar?.results || []}
        onSelectMedia={onSelectMedia}
        onWatchlistChange={onWatchlistChange}
      />

      {/* Download Video Options Modal */}
      <DownloadMediaModal
        media={media}
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        season={targetDownloadSeason}
        episode={targetDownloadEpisode}
        episodeName={targetDownloadEpisodeName}
        totalSeasons={totalSeasons}
        onDownloadStarted={() => setIsDownloaded(true)}
      />
    </motion.div>
  );
};
