import React, { useEffect, useState } from 'react';
import { X, Play, Plus, Check, AlertCircle, DownloadCloud } from 'lucide-react';
import { TMDBMedia, MediaDetail } from '../types/tmdb';
import { getMediaDetails, getBackdropUrl, getPosterUrl, getAvatarUrl, getProxiedImageUrl, normalizeImagePath } from '../services/tmdb';
import { isItemInWatchlist, addToWatchlist, removeFromWatchlist, isItemDownloaded, addDownload } from '../services/storage';
import { getMediaReleaseStatus } from '../services/releaseStatus';
import { DownloadMediaModal } from './DownloadMediaModal';

interface MediaDetailModalProps {
  media: TMDBMedia | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (type: 'movie' | 'tv', id: number) => void;
  onUnreleased?: (item: TMDBMedia) => void;
  onWatchlistChange: () => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  isOpen,
  onClose,
  onPlay,
  onUnreleased,
  onWatchlistChange,
}) => {
  const [details, setDetails] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  const type = media?.media_type || (media?.title ? 'movie' : 'tv');
  const releaseStatus = getMediaReleaseStatus(media);

  useEffect(() => {
    if (!media || !isOpen) return;

    setInWatchlist(isItemInWatchlist(media.id));
    setIsDownloaded(isItemDownloaded(media.id));
    setLoading(true);

    getMediaDetails(type as 'movie' | 'tv', media.id)
      .then((res) => {
        setDetails(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [media, isOpen, type]);

  if (!isOpen || !media) return null;

  const title = details?.title || details?.name || media.title || media.name || 'Untitled';
  const releaseDate = details?.release_date || details?.first_air_date || media.release_date || media.first_air_date || '';
  const releaseYear = releaseDate.slice(0, 4);

  const toggleWatchlist = () => {
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
    setDownloadModalOpen(true);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      id="media-detail-modal"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-[#000000] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Close Button */}
        <button
          id="modal-close-btn"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Hero Banner with Backdrop */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-black">
          <img
            src={getBackdropUrl(media.backdrop_path, 'w1280')}
            alt={title}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              const currentSrc = target.src;
              if (media.backdrop_path && !currentSrc.includes('wsrv.nl')) {
                const clean = normalizeImagePath(media.backdrop_path);
                target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w1280${clean}`, 1280);
                return;
              }
              if (media.poster_path && !currentSrc.includes(media.poster_path)) {
                target.src = getPosterUrl(media.poster_path, 'w780');
                return;
              }
              if (!currentSrc.includes('unsplash')) {
                target.src = 'https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?auto=format&fit=crop&w=1280&q=80';
              }
            }}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-transparent to-transparent w-2/3" />

          {/* Hero text overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-2 text-xs text-zinc-300 font-medium">
              <span className="text-white font-semibold">{type === 'movie' ? 'Film' : 'Series'}</span>
              {releaseYear && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span>{releaseYear}</span>
                </>
              )}
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="text-zinc-200">4K Ultra HD</span>
              {!releaseStatus.isReleased && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="text-amber-300 font-semibold">Coming Soon</span>
                </>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight drop-shadow-md">
              {title}
            </h2>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 space-y-6">
          {/* Action Row */}
          <div className="flex items-center gap-3">
            <button
              id="modal-play-btn"
              onClick={() => {
                onClose();
                if (!releaseStatus.isReleased) {
                  if (onUnreleased) onUnreleased(media);
                  return;
                }
                onPlay(type as 'movie' | 'tv', media.id);
              }}
              className={`px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer ${
                releaseStatus.isReleased
                  ? 'bg-white hover:bg-zinc-200 text-zinc-950'
                  : 'bg-amber-400 hover:bg-amber-500 text-zinc-950'
              }`}
            >
              {releaseStatus.isReleased ? (
                <>
                  <Play className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                  <span>Play</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-zinc-950" />
                  <span>Not Released</span>
                </>
              )}
            </button>

            <button
              id="modal-watchlist-btn"
              onClick={toggleWatchlist}
              className={`px-4 py-2.5 rounded-full border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                inWatchlist
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-zinc-200 hover:text-white'
              }`}
            >
              {inWatchlist ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{inWatchlist ? 'In My List' : 'Add to List'}</span>
            </button>

            <button
              id="modal-download-btn"
              onClick={handleDownload}
              className={`px-4 py-2.5 rounded-full border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                isDownloaded
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-zinc-200 hover:text-white'
              }`}
            >
              {isDownloaded ? <Check className="w-3.5 h-3.5 text-white" /> : <DownloadCloud className="w-3.5 h-3.5" />}
              <span>{isDownloaded ? 'Downloaded' : 'Download'}</span>
            </button>
          </div>


          {/* Genres */}
          {details?.genres && details.genres.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              {details.genres.map((g) => (
                <span
                  key={g.id}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-neutral-300"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Synopsis</h4>
            <p className="text-neutral-300 text-sm leading-relaxed font-normal">
              {details?.overview || media.overview || (loading ? 'Loading synopsis...' : 'High-definition digital media stream available for immediate playback on elio+.')}
            </p>
          </div>

          {/* Cast */}
          {details?.credits?.cast && details.credits.cast.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Featured Cast</h4>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {details.credits.cast.slice(0, 8).map((actor) => (
                  <div key={actor.id} className="flex-shrink-0 w-20 text-center">
                    <div className="w-14 h-14 mx-auto rounded-full overflow-hidden bg-neutral-800 border border-white/10 mb-1">
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
                    <div className="text-[11px] font-semibold text-neutral-200 truncate">{actor.name}</div>
                    <div className="text-[9px] text-neutral-400 truncate">{actor.character}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Related / Recommendations in Modal */}
          {details?.recommendations?.results && details.recommendations.results.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">More Like This</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {details.recommendations.results.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      onClose();
                      onPlay(rec.media_type || 'movie', rec.id);
                    }}
                    className="group cursor-pointer rounded-xl bg-neutral-900 border border-white/5 overflow-hidden hover:border-white/30 transition-all"
                  >
                    <div className="aspect-[2/3] w-full bg-neutral-950 overflow-hidden relative">
                      <img
                        src={getPosterUrl(rec.poster_path, 'w342')}
                        alt={rec.title || rec.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (rec.poster_path && !target.src.includes('wsrv.nl')) {
                            const clean = normalizeImagePath(rec.poster_path);
                            target.src = getProxiedImageUrl(`https://image.tmdb.org/t/p/w342${clean}`, 342);
                            return;
                          }
                          if (rec.backdrop_path && !target.src.includes(rec.backdrop_path)) {
                            target.src = getBackdropUrl(rec.backdrop_path, 'w780');
                            return;
                          }
                          target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=342&q=80';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg">
                          <Play className="w-3.5 h-3.5 fill-zinc-950 ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-bold text-white truncate group-hover:text-zinc-200">
                        {rec.title || rec.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DownloadMediaModal
        media={media}
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        totalSeasons={details?.number_of_seasons || (details?.seasons?.length) || 1}
        onDownloadStarted={() => setIsDownloaded(true)}
      />
    </div>
  );
};
