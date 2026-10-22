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
    id: 'autoembed',
    name: 'AutoEmbed (Anime & Shows HD)',
    badge: 'Anime Top',
    getMovieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`,
    getTvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
  },
  {
    id: 'vidsrc-to',
    name: 'VidSrc.to (Dub & Sub Anime)',
    badge: 'Dub/Sub',
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc.me (Multi-Source Anime)',
    badge: 'Multi-Host',
    getMovieUrl: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: 'vidzee',
    name: 'VidZee Ultra (1080p Cinema)',
    badge: 'Cinema HD',
    getMovieUrl: (id) => `https://player.vidzee.wtf/embed/movie/${id}?lang=en&sub=en`,
    getTvUrl: (id, s, e) => `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}?lang=en&sub=en`,
  },
  {
    id: 'vidsrc-pm',
    name: 'VidSrc PM (Global Stream)',
    badge: 'Ultra HD',
    getMovieUrl: (id) => `https://vidsrc.pm/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: '2embed',
    name: '2Embed (Multi-Source Mirror)',
    badge: 'Reliable',
    getMovieUrl: (id) => `https://2embed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://2embed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'smashystream',
    name: 'SmashyStream (Alternate Edge)',
    badge: 'Backup',
    getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`,
  },
];
