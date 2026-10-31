import { StreamServer } from '../types/tmdb';

export interface StreamQualityOption {
  id: 'auto' | '1080p' | '4k' | '720p';
  label: string;
  badge: string;
  bitrateNote: string;
}

export const STREAM_QUALITIES: StreamQualityOption[] = [
  { id: '1080p', label: 'HD 1080p', badge: 'HD', bitrateNote: 'Direct High Definition' },
  { id: '4k', label: 'Ultra HD', badge: 'UHD', bitrateNote: 'Maximum Bitrate' },
  { id: '720p', label: 'Fast HD', badge: '720p', bitrateNote: 'Fast Loading' },
  { id: 'auto', label: 'Auto', badge: 'Auto', bitrateNote: 'Adaptive' },
];

// Single provider setup: VidZee only. Earlier the app rotated through
// CinemaOS/VidFast/VidLink, but saved preferences and auto-switching kept
// landing users on broken providers. VidZee is the one that plays.
export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidzee',
    name: 'VidZee',
    badge: '1080p',
    getMovieUrl: (id) => `https://player.vidzee.wtf/embed/movie/${id}?lang=en&sub=en`,
    getTvUrl: (id, s, e) => `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}?lang=en&sub=en`,
  },
];
