import { TMDBMedia, WatchHistoryItem } from '../types/tmdb';

export interface DownloadItem {
  id: string; // Unique key: e.g. "12345" for movie or "12345_s1_e3" for episode
  media: TMDBMedia;
  season?: number;
  episode?: number;
  episodeName?: string;
  quality?: string;
  format?: string;
  downloadedAt: number;
  sizeMB: number;
  status: 'completed' | 'downloading';
  progress: number;
}

const DOWNLOADS_KEY = 'cinestream_downloads_v1';

export const getDownloads = (): DownloadItem[] => {
  try {
    const raw = localStorage.getItem(DOWNLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load downloads', e);
    return [];
  }
};

export const addDownload = (
  media: TMDBMedia,
  season?: number,
  episode?: number,
  episodeName?: string,
  quality: string = '1080p Full HD',
  format: string = 'MP4',
  sizeMB?: number
): DownloadItem[] => {
  try {
    const list = getDownloads();
    const isMovie = media.media_type === 'movie' || ('title' in media && !!media.title);
    const downloadKey = isMovie ? `${media.id}` : `${media.id}_s${season || 1}_e${episode || 1}`;
    
    const exists = list.some((i) => i.id === downloadKey || (!season && i.media.id === media.id));
    if (!exists) {
      const calculatedSize = sizeMB || (isMovie ? 1420 : 680);
      const newItem: DownloadItem = {
        id: downloadKey,
        media,
        season: !isMovie ? season || 1 : undefined,
        episode: !isMovie ? episode || 1 : undefined,
        episodeName: !isMovie ? episodeName : undefined,
        quality,
        format,
        downloadedAt: Date.now(),
        sizeMB: calculatedSize,
        status: 'completed',
        progress: 100
      };
      const updated = [newItem, ...list];
      localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
      return updated;
    }
    return list;
  } catch (e) {
    console.error('Failed to add download', e);
    return getDownloads();
  }
};

export const removeDownload = (downloadIdOrMediaId: string | number): DownloadItem[] => {
  try {
    const list = getDownloads();
    const targetStr = String(downloadIdOrMediaId);
    const updated = list.filter((i) => i.id !== targetStr && String(i.media.id) !== targetStr);
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove download', e);
    return getDownloads();
  }
};

export const isItemDownloaded = (id: number, season?: number, episode?: number): boolean => {
  const list = getDownloads();
  if (season !== undefined && episode !== undefined) {
    const key = `${id}_s${season}_e${episode}`;
    return list.some((i) => i.id === key);
  }
  return list.some((i) => i.media.id === id || i.id.startsWith(`${id}_`));
};

const WATCHLIST_KEY = 'cinestream_watchlist_v1';
const HISTORY_KEY = 'cinestream_history_v1';
const SETTINGS_KEY = 'cinestream_settings_v1';

export interface UserSettings {
  preferredServer: string;
  tmdbApiKey: string;
  autoNextEpisode: boolean;
  qualityPreference: 'auto' | '1080p' | '4k' | '720p';
  streamEnhancer: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  preferredServer: 'autoembed',
  tmdbApiKey: '',
  autoNextEpisode: true,
  qualityPreference: '1080p',
  streamEnhancer: true,
};

const EPISODE_PROGRESS_PREFIX = 'cinestream_ep_prog_';

export interface EpisodeProgress {
  watchedSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  isCompleted: boolean;
  updatedAt: number;
}

export const getEpisodeProgress = (
  tvId: number,
  season: number,
  episode: number
): EpisodeProgress | null => {
  try {
    const key = `${EPISODE_PROGRESS_PREFIX}${tvId}_s${season}_e${episode}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

export const saveEpisodeProgress = (
  tvId: number,
  season: number,
  episode: number,
  watchedSeconds: number,
  durationSeconds: number
): void => {
  try {
    const key = `${EPISODE_PROGRESS_PREFIX}${tvId}_s${season}_e${episode}`;
    const progressPercent = durationSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100)) : 0;
    const data: EpisodeProgress = {
      watchedSeconds,
      durationSeconds,
      progressPercent,
      isCompleted: progressPercent >= 90,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save episode progress', e);
  }
};

export const getShowEpisodesProgressMap = (
  tvId: number,
  season: number
): Record<number, EpisodeProgress> => {
  const result: Record<number, EpisodeProgress> = {};
  try {
    const prefix = `${EPISODE_PROGRESS_PREFIX}${tvId}_s${season}_e`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const epNum = parseInt(k.replace(prefix, ''), 10);
        if (!isNaN(epNum)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            result[epNum] = JSON.parse(raw);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return result;
};

export const getWatchlist = (): TMDBMedia[] => {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load watchlist', e);
    return [];
  }
};

export const addToWatchlist = (item: TMDBMedia): TMDBMedia[] => {
  try {
    const list = getWatchlist();
    const exists = list.some((i) => i.id === item.id);
    if (!exists) {
      const updated = [item, ...list];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
      return updated;
    }
    return list;
  } catch (e) {
    console.error('Failed to add to watchlist', e);
    return getWatchlist();
  }
};

export const removeFromWatchlist = (id: number): TMDBMedia[] => {
  try {
    const list = getWatchlist();
    const updated = list.filter((i) => i.id !== id);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove from watchlist', e);
    return getWatchlist();
  }
};

export const isItemInWatchlist = (id: number): boolean => {
  const list = getWatchlist();
  return list.some((i) => i.id === id);
};

export const getWatchHistory = (): WatchHistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load history', e);
    return [];
  }
};

export const formatPlaybackTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatDurationReadable = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};

export const getHistoryItem = (id: number, type: 'movie' | 'tv'): WatchHistoryItem | undefined => {
  const history = getWatchHistory();
  return history.find((h) => h.id === id && h.type === type);
};

export const removeHistoryItem = (id: number, type: 'movie' | 'tv'): WatchHistoryItem[] => {
  try {
    const history = getWatchHistory();
    const updated = history.filter((h) => !(h.id === id && h.type === type));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove history item', e);
    return getWatchHistory();
  }
};

export const saveWatchHistory = (item: WatchHistoryItem): WatchHistoryItem[] => {
  try {
    const history = getWatchHistory();
    const filtered = history.filter((h) => !(h.id === item.id && h.type === item.type));
    
    // Auto-calculate progress percent and readable string if seconds provided
    const watched = item.watchedSeconds || 0;
    const total = item.durationSeconds || 0;
    let progress = item.progressPercent;
    if (total > 0 && watched > 0) {
      progress = Math.min(100, Math.round((watched / total) * 100));
    }
    const formatted = item.lastStoppedFormatted || (watched > 0 ? formatPlaybackTime(watched) : undefined);

    const enrichedItem: WatchHistoryItem = {
      ...item,
      progressPercent: progress !== undefined ? progress : item.progressPercent,
      lastStoppedFormatted: formatted,
      isCompleted: progress !== undefined ? progress >= 92 : item.isCompleted,
    };

    const updated = [enrichedItem, ...filtered].slice(0, 30); // Keep max 30 recent items
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save watch history', e);
    return getWatchHistory();
  }
};

export const clearWatchHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('Failed to clear watch history', e);
  }
};

export const getSettings = (): UserSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: Partial<UserSettings>): UserSettings => {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

const RECENT_SEARCHES_KEY = 'cinestream_recent_searches_v1';

export const getRecentSearches = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const addRecentSearch = (query: string): string[] => {
  if (!query || !query.trim()) return getRecentSearches();
  const clean = query.trim();
  try {
    const list = getRecentSearches();
    const filtered = list.filter((item) => item.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...filtered].slice(0, 10);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return getRecentSearches();
  }
};

export const removeRecentSearch = (query: string): string[] => {
  try {
    const list = getRecentSearches();
    const updated = list.filter((item) => item.toLowerCase() !== query.toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return getRecentSearches();
  }
};

export const clearRecentSearches = (): void => {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (e) {
    console.error('Failed to clear recent searches', e);
  }
};

