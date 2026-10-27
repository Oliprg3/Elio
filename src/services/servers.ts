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

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'vidzee',
    name: 'VidZee',
    badge: '1080p',
    getMovieUrl: (id) => `https://player.vidzee.wtf/embed/movie/${id}?lang=en&sub=en`,
    getTvUrl: (id, s, e) => `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}?lang=en&sub=en`,
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    badge: 'Fast',
    getMovieUrl: (id) => `https://vidfast.vc/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidfast.vc/tv/${id}/${s}/${e}`,
  },
  {
    id: 'vidlink',
    name: 'VidLink',
    badge: 'Backup',
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
];
