import { TMDBMedia, MediaDetail, TVSeasonDetail, TVSeasonSummary, Genre, MediaType } from '../types/tmdb';
import { CURATED_MOVIES, CURATED_TV, FALLBACK_EPISODES, MOVIE_GENRES, TV_GENRES } from './tmdbData';
import { getSettings } from './storage';

// Default TMDB Read API Key (user provided)
const DEFAULT_TMDB_API_KEY = 'a01cd55b205d43cd5b3df7cf09d049e3';
const BASE_URL = 'https://api.themoviedb.org/3';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Normalizes poster/backdrop paths to prevent missing slash errors or malformed URLs
export const normalizeImagePath = (path: string | null | undefined): string => {
  if (!path) return '';
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const getPosterUrl = (path: string | null | undefined, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342'): string => {
  if (!path || path.trim() === '') {
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=342&q=80';
  }
  const clean = normalizeImagePath(path);
  if (clean.startsWith('http')) return clean;
  return `${TMDB_IMAGE_BASE}/${size}${clean}`;
};

export const getProxiedImageUrl = (url: string, width = 342): string => {
  if (!url) return '';
  if (url.includes('wsrv.nl')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;
};

export const getBackdropUrl = (path: string | null | undefined, size: 'w780' | 'w1280' | 'original' = 'w1280'): string => {
  if (!path || path.trim() === '') {
    return 'https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?auto=format&fit=crop&w=1280&q=80';
  }
  const clean = normalizeImagePath(path);
  if (clean.startsWith('http')) return clean;
  return `${TMDB_IMAGE_BASE}/${size}${clean}`;
};

export const getAvatarUrl = (path: string | null | undefined): string => {
  if (!path || path.trim() === '') {
    return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  }
  const clean = normalizeImagePath(path);
  if (clean.startsWith('http')) return clean;
  return `${TMDB_IMAGE_BASE}/w185${clean}`;
};

// In-Memory & Persistent Storage Caching for Instant (0ms) Page Load
const apiCache = new Map<string, { timestamp: number; data: any }>();
const pendingRequests = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours TTL
const REVALIDATE_AFTER_MS = 15 * 60 * 1000; // 15 minutes fresh window

const getApiKey = (): string => {
  const envNextKey = (import.meta as any).env?.NEXT_PUBLIC_TMDB_API_KEY;
  if (envNextKey && typeof envNextKey === 'string' && envNextKey.trim().length > 5) {
    return envNextKey.trim();
  }
  const envViteKey = (import.meta as any).env?.VITE_TMDB_API_KEY;
  if (envViteKey && typeof envViteKey === 'string' && envViteKey.trim().length > 5) {
    return envViteKey.trim();
  }
  const userSettings = getSettings();
  if (userSettings.tmdbApiKey && userSettings.tmdbApiKey.trim().length > 5) {
    return userSettings.tmdbApiKey.trim();
  }
  return DEFAULT_TMDB_API_KEY;
};

// Generic fetch wrapper with instant caching, deduplication & stale-while-revalidate
async function tmdbFetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T | null> {
  const apiKey = getApiKey();
  const sortedParamEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const cacheKey = `tmdb_en_v5_${endpoint}_${JSON.stringify(sortedParamEntries)}`;
  const now = Date.now();

  // 1. Check In-Memory Cache (0ms instant return)
  const cachedMemory = apiCache.get(cacheKey);
  if (cachedMemory && now - cachedMemory.timestamp < CACHE_TTL_MS) {
    // If getting slightly old, revalidate in background quietly
    if (now - cachedMemory.timestamp > REVALIDATE_AFTER_MS && !pendingRequests.has(cacheKey)) {
      triggerBackgroundFetch<T>(endpoint, sortedParamEntries, apiKey, cacheKey);
    }
    return cachedMemory.data as T;
  }

  // 2. Check LocalStorage Persistent Cache (0ms instant cold-start return)
  try {
    const localData = localStorage.getItem(cacheKey);
    if (localData) {
      const parsed = JSON.parse(localData);
      if (parsed && parsed.data && now - (parsed.timestamp || 0) < CACHE_TTL_MS) {
        apiCache.set(cacheKey, parsed);
        if (now - parsed.timestamp > REVALIDATE_AFTER_MS && !pendingRequests.has(cacheKey)) {
          triggerBackgroundFetch<T>(endpoint, sortedParamEntries, apiKey, cacheKey);
        }
        return parsed.data as T;
      }
    }
  } catch (_) {
    // LocalStorage quota or parse ignore
  }

  // 3. Deduplicate in-flight requests for identical endpoints
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T | null>;
  }

  return performNetworkFetch<T>(endpoint, sortedParamEntries, apiKey, cacheKey);
}

// Background revalidation helper
function triggerBackgroundFetch<T>(
  endpoint: string,
  sortedParamEntries: [string, string | number][],
  apiKey: string,
  cacheKey: string
) {
  setTimeout(() => {
    performNetworkFetch<T>(endpoint, sortedParamEntries, apiKey, cacheKey).catch(() => {});
  }, 50);
}

// Core network execution with fast abort and caching
async function performNetworkFetch<T>(
  endpoint: string,
  sortedParamEntries: [string, string | number][],
  apiKey: string,
  cacheKey: string
): Promise<T | null> {
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    include_adult: 'false',
    language: 'en-US',
    include_image_language: 'en,null',
    region: 'US',
    ...Object.fromEntries(sortedParamEntries.map(([k, v]) => [k, String(v)])),
  });

  const url = `${BASE_URL}${endpoint}?${searchParams.toString()}`;

  const fetchPromise = (async (): Promise<T | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const jsonData = (await response.json()) as T;

      // Cache response in memory and localStorage
      const cacheEntry = { timestamp: Date.now(), data: jsonData };
      apiCache.set(cacheKey, cacheEntry);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      } catch (_) {
        // Handle localStorage quota by clearing older tmdb entries
        try {
          const keys = Object.keys(localStorage).filter((k) => k.startsWith('tmdb_'));
          if (keys.length > 30) {
            keys.slice(0, 15).forEach((k) => localStorage.removeItem(k));
          }
        } catch (_) {}
      }

      return jsonData;
    } catch (_) {
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// Fetch trending movies and TV shows
export async function getTrendingAll(timeWindow: 'day' | 'week' = 'day'): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: TMDBMedia[] }>(`/trending/all/${timeWindow}`);
  if (data?.results && data.results.length > 0) {
    return data.results.map((item) => ({
      ...item,
      media_type: item.media_type || (item.title ? 'movie' : 'tv'),
    }));
  }
  // Return mixed curated items
  return [...CURATED_MOVIES.slice(0, 5), ...CURATED_TV.slice(0, 5)];
}

// Fetch Popular Movies
export async function getPopularMovies(page: number = 1): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: TMDBMedia[] }>('/movie/popular', { page });
  if (data?.results && data.results.length > 0) {
    return data.results.map((m) => ({ ...m, media_type: 'movie' }));
  }
  return CURATED_MOVIES;
}

// Fetch Popular TV Shows
export async function getPopularTV(page: number = 1): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: TMDBMedia[] }>('/tv/popular', { page });
  if (data?.results && data.results.length > 0) {
    return data.results.map((t) => ({ ...t, media_type: 'tv' }));
  }
  return CURATED_TV;
}

// Fetch Top Rated Movies or TV
export async function getTopRated(type: 'movie' | 'tv' = 'movie', page: number = 1): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: TMDBMedia[] }>(`/${type}/top_rated`, { page });
  if (data?.results && data.results.length > 0) {
    return data.results.map((m) => ({ ...m, media_type: type }));
  }
  return type === 'movie' ? CURATED_MOVIES.filter((m) => m.vote_average >= 8) : CURATED_TV.filter((t) => t.vote_average >= 8.5);
}

// Fetch Discover Anime (TV)
export async function getAnimeTV(page: number = 1): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: TMDBMedia[] }>(`/discover/tv`, {
    with_genres: 16,
    with_original_language: 'ja',
    sort_by: 'popularity.desc',
    page,
  });
  if (data?.results && data.results.length > 0) {
    return data.results.map((item) => ({ ...item, media_type: 'tv', is_anime: true, original_language: 'ja' }));
  }
  return CURATED_TV.filter((item) => item.genre_ids?.includes(16) || item.genre_ids?.includes(2100));
}

// Fetch Discover Anime (Movies)
export async function getAnimeMovies(page: number = 1): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: TMDBMedia[] }>(`/discover/movie`, {
    with_genres: 16,
    with_original_language: 'ja',
    sort_by: 'popularity.desc',
    page,
  });
  if (data?.results && data.results.length > 0) {
    return data.results.map((item) => ({ ...item, media_type: 'movie', is_anime: true, original_language: 'ja' }));
  }
  return CURATED_MOVIES.filter((item) => item.genre_ids?.includes(16) || item.genre_ids?.includes(2100));
}

// Fetch Discover by Genre
export async function getByGenre(mediaType: 'movie' | 'tv', genreId: number, page: number = 1): Promise<TMDBMedia[]> {
  if (genreId === 2100) {
    return mediaType === 'tv' ? getAnimeTV(page) : getAnimeMovies(page);
  }

  const data = await tmdbFetch<{ results: TMDBMedia[] }>(`/discover/${mediaType}`, {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    page,
  });
  if (data?.results && data.results.length > 0) {
    return data.results.map((item) => ({ ...item, media_type: mediaType }));
  }
  // Curated fallback filter
  const pool = mediaType === 'movie' ? CURATED_MOVIES : CURATED_TV;
  const filtered = pool.filter((item) => item.genre_ids?.includes(genreId));
  return filtered.length > 0 ? filtered : pool;
}

export async function getByProvider(mediaType: 'movie' | 'tv', providerId: number, page: number = 1): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: TMDBMedia[] }>(`/discover/${mediaType}`, {
    with_watch_providers: providerId,
    watch_region: 'US',
    sort_by: 'popularity.desc',
    page,
  });
  if (data?.results && data.results.length > 0) {
    return data.results.map((item) => ({ ...item, media_type: mediaType }));
  }
  const pool = mediaType === 'movie' ? CURATED_MOVIES : CURATED_TV;
  return pool;
}

// Multi-search (Movies & TV)
export async function searchMedia(query: string, page: number = 1): Promise<TMDBMedia[]> {
  if (!query || query.trim().length === 0) return [];

  const data = await tmdbFetch<{ results: TMDBMedia[] }>('/search/multi', {
    query: query.trim(),
    page,
  });

  if (data?.results && data.results.length > 0) {
    return data.results
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .filter((item) => item.poster_path || item.backdrop_path);
  }

  // Local fallback search across curated lists
  const q = query.toLowerCase();
  const allCurated = [...CURATED_MOVIES, ...CURATED_TV];
  return allCurated.filter(
    (item) =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      item.overview.toLowerCase().includes(q)
  );
}

// Get Full Media Details
export async function getMediaDetails(type: 'movie' | 'tv', id: number | string): Promise<MediaDetail | null> {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  let resolvedType = type;
  let data = await tmdbFetch<MediaDetail>(`/${type}/${numId}`, {
    append_to_response: 'credits,recommendations,similar,videos,external_ids',
  });

  // If initial fetch failed, try the alternate media type (e.g. if a TV ID was passed as movie or vice versa)
  if (!data) {
    const altType = type === 'movie' ? 'tv' : 'movie';
    const altData = await tmdbFetch<MediaDetail>(`/${altType}/${numId}`, {
      append_to_response: 'credits,recommendations,similar,videos,external_ids',
    });
    if (altData) {
      data = altData;
      resolvedType = altType;
    }
  }

  if (data) {
    const imdbId = data.imdb_id || data.external_ids?.imdb_id;
    const title = data.title || data.name || (resolvedType === 'movie' ? `Movie #${numId}` : `Series #${numId}`);
    return {
      ...data,
      imdb_id: imdbId,
      media_type: resolvedType,
      overview: data.overview && data.overview.trim().length > 0 
        ? data.overview 
        : `Stream ${title} in crystal-clear high definition with seamless playback on elio+.`,
      genres: data.genres || [],
    };
  }

  // Fallback lookup from curated pools (checking both lists)
  const allCurated = [...CURATED_MOVIES, ...CURATED_TV];
  const match = allCurated.find((m) => m.id === numId);

  if (match) {
    const isMatchTv = match.media_type === 'tv' || Boolean(match.name);
    const genresList = isMatchTv ? TV_GENRES : MOVIE_GENRES;
    const itemGenres = (match.genre_ids || [])
      .map((gid) => genresList.find((g) => g.id === gid))
      .filter(Boolean) as { id: number; name: string }[];

    // Default seasons for TV
    const seasonsList: TVSeasonSummary[] = isMatchTv ? [
      { id: 1, name: 'Season 1', overview: 'First season', poster_path: match.poster_path, season_number: 1, episode_count: 8, air_date: '2022-01-01' },
      { id: 2, name: 'Season 2', overview: 'Second season', poster_path: match.poster_path, season_number: 2, episode_count: 8, air_date: '2023-01-01' },
    ] : [];

    return {
      ...match,
      media_type: match.media_type || (isMatchTv ? 'tv' : 'movie'),
      overview: match.overview || `Watch ${match.title || match.name} in high-definition on elio+.`,
      genres: itemGenres.length > 0 ? itemGenres : [{ id: 28, name: 'Featured' }],
      credits: {
        cast: [
          { id: 101, name: 'Lead Actor', character: 'Main Protagonist', profile_path: null, order: 0 },
          { id: 102, name: 'Co-Star', character: 'Supporting Character', profile_path: null, order: 1 },
          { id: 103, name: 'Antagonist', character: 'Villain', profile_path: null, order: 2 },
          { id: 104, name: 'Guest Star', character: 'Key Figure', profile_path: null, order: 3 },
        ],
      },
      recommendations: {
        results: allCurated.filter((m) => m.id !== numId).slice(0, 8),
      },
      seasons: seasonsList,
    };
  }

  // Return generic placeholder for any raw tmdb id
  return {
    id: numId,
    title: type === 'movie' ? `Movie #${numId}` : undefined,
    name: type === 'tv' ? `TV Series #${numId}` : undefined,
    overview: 'High-definition digital media stream with multi-audio and verified streaming playback.',
    poster_path: null,
    backdrop_path: null,
    media_type: type,
    vote_average: 8.0,
    vote_count: 1000,
    popularity: 100,
    genres: [{ id: 28, name: 'Feature Stream' }],
    number_of_seasons: type === 'tv' ? 2 : undefined,
    seasons: type === 'tv' ? [
      { id: 1, name: 'Season 1', overview: 'Season 1 episodes', poster_path: null, season_number: 1, episode_count: 10, air_date: '' },
      { id: 2, name: 'Season 2', overview: 'Season 2 episodes', poster_path: null, season_number: 2, episode_count: 10, air_date: '' }
    ] : undefined
  };
}

// Get Season Details with Episodes
export async function getTVSeasonDetails(tvId: number | string, seasonNumber: number): Promise<TVSeasonDetail | null> {
  const data = await tmdbFetch<TVSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);

  if (data && data.episodes && data.episodes.length > 0) {
    return data;
  }

  // Check fallback episodes map
  const key = `${tvId}-${seasonNumber}`;
  if (FALLBACK_EPISODES[key]) {
    return FALLBACK_EPISODES[key];
  }

  // Generate clean mock episodes for any requested season so UI never breaks
  const generatedEpisodes = Array.from({ length: 10 }).map((_, idx) => ({
    id: Number(`${tvId}${seasonNumber}${idx + 1}`),
    name: `Episode ${idx + 1}`,
    overview: `Episode ${idx + 1} of Season ${seasonNumber}. Stream full HD release with instant playback and high-speed audio/subtitle tracks.`,
    episode_number: idx + 1,
    season_number: seasonNumber,
    still_path: null,
    vote_average: 8.2,
    air_date: '2024-01-01',
    runtime: 50,
  }));

  return {
    id: seasonNumber,
    name: `Season ${seasonNumber}`,
    overview: `Season ${seasonNumber} episodes.`,
    poster_path: null,
    season_number: seasonNumber,
    episodes: generatedEpisodes,
  };
}

// Synchronously retrieve local media details fallback for instant (0ms) loading states
export function getLocalMediaFallback(type: 'movie' | 'tv', id: number | string): MediaDetail {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  const list = type === 'movie' ? CURATED_MOVIES : CURATED_TV;
  const match = list.find((m) => m.id === numId);

  if (match) {
    const genresList = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
    const itemGenres = (match.genre_ids || [])
      .map((gid) => genresList.find((g) => g.id === gid))
      .filter(Boolean) as { id: number; name: string }[];

    const seasonsList: TVSeasonSummary[] = type === 'tv' ? [
      { id: 1, name: 'Season 1', overview: 'First season', poster_path: match.poster_path, season_number: 1, episode_count: 8, air_date: '2022-01-01' },
      { id: 2, name: 'Season 2', overview: 'Second season', poster_path: match.poster_path, season_number: 2, episode_count: 8, air_date: '2023-01-01' },
    ] : [];

    return {
      ...match,
      genres: itemGenres.length > 0 ? itemGenres : [{ id: 28, name: 'Action' }],
      credits: {
        cast: [
          { id: 101, name: 'Lead Actor', character: 'Main Protagonist', profile_path: null, order: 0 },
          { id: 102, name: 'Co-Star', character: 'Supporting Character', profile_path: null, order: 1 },
          { id: 103, name: 'Antagonist', character: 'Villain', profile_path: null, order: 2 },
          { id: 104, name: 'Guest Star', character: 'Key Figure', profile_path: null, order: 3 },
        ],
      },
      recommendations: {
        results: list.filter((m) => m.id !== numId),
      },
      seasons: seasonsList,
    };
  }

  return {
    id: numId,
    title: type === 'movie' ? `Movie #${numId}` : undefined,
    name: type === 'tv' ? `TV Series #${numId}` : undefined,
    overview: 'High-definition digital media stream powered by standard TMDB integration.',
    poster_path: null,
    backdrop_path: null,
    media_type: type,
    vote_average: 8.0,
    vote_count: 1000,
    popularity: 100,
    genres: [{ id: 28, name: 'Feature Stream' }],
    number_of_seasons: type === 'tv' ? 2 : undefined,
    seasons: type === 'tv' ? [
      { id: 1, name: 'Season 1', overview: '', poster_path: null, season_number: 1, episode_count: 10, air_date: '' },
      { id: 2, name: 'Season 2', overview: '', poster_path: null, season_number: 2, episode_count: 10, air_date: '' }
    ] : undefined
  };
}
