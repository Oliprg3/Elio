export type MediaType = 'movie' | 'tv' | 'all';

export interface TMDBMedia {
  id: number;
  title?: string;
  name?: string; // For TV shows
  original_title?: string;
  original_name?: string;
  original_language?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: MediaType;
  release_date?: string;
  first_air_date?: string; // For TV shows
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  adult?: boolean;
  runtime?: number; // In minutes for movies
  number_of_seasons?: number; // For TV
  number_of_episodes?: number; // For TV
  status?: string;
  tagline?: string;
  imdb_id?: string;
  external_ids?: {
    imdb_id?: string;
    tvdb_id?: number;
  };
  is_anime?: boolean;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface VideoTrailer {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface MediaDetail extends TMDBMedia {
  genres: { id: number; name: string }[];
  credits?: {
    cast: CastMember[];
  };
  recommendations?: {
    results: TMDBMedia[];
  };
  similar?: {
    results: TMDBMedia[];
  };
  videos?: {
    results: VideoTrailer[];
  };
  seasons?: TVSeasonSummary[];
}

export interface TVSeasonSummary {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string;
}

export interface TVEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  air_date: string;
  runtime?: number;
}

export interface TVSeasonDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episodes: TVEpisode[];
}

export interface Genre {
  id: number;
  name: string;
  mediaType?: 'movie' | 'tv';
}

export interface WatchHistoryItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  year: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  timestamp: number;
  progressPercent?: number;
  watchedSeconds?: number;
  durationSeconds?: number;
  lastStoppedFormatted?: string;
  isCompleted?: boolean;
}

export interface StreamServer {
  id: string;
  name: string;
  badge: string;
  getMovieUrl: (tmdbId: number | string) => string;
  getTvUrl: (tmdbId: number | string, season: number, episode: number) => string;
  getAnimeUrl?: (tmdbId: number | string, season: number, episode: number) => string;
}

export interface DownloadedMedia {
  id: string;
  media: TMDBMedia;
  season?: number;
  episode?: number;
  episodeName?: string;
  quality?: string;
  format?: string;
  downloadedAt: number;
  sizeMB?: number;
  fileSizeBytes?: number;
  status?: 'completed' | 'downloading';
  progress?: number;
}
