import { TMDBMedia, MediaDetail } from '../types/tmdb';

export interface ReleaseStatus {
  isReleased: boolean;
  badge: 'HD' | 'CAM' | 'Not Released';
  releaseDateText: string;
  statusMessage: string;
}

/**
 * Evaluates whether a movie or show is officially released.
 * Movies released within the last 45 days are marked as 'CAM'.
 */
export function getMediaReleaseStatus(
  item?: Partial<TMDBMedia | MediaDetail> | null
): ReleaseStatus {
  const rawDate = item?.release_date || item?.first_air_date || '';
  const type = item?.media_type || (item as any)?.title ? 'movie' : 'tv';
  
  if (!rawDate) {
    return {
      isReleased: true,
      badge: 'HD',
      releaseDateText: 'Unknown',
      statusMessage: 'Available in HD',
    };
  }

  const releaseDate = new Date(rawDate);
  const now = new Date();
  
  // If it's a future release
  if (releaseDate > now) {
    return {
      isReleased: false,
      badge: 'Not Released',
      releaseDateText: rawDate,
      statusMessage: 'Coming Soon',
    };
  }

  // Calculate days since release
  const diffTime = Math.abs(now.getTime() - releaseDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  // If it's a movie released in the last 45 days, assume CAM quality. 
  // TV shows usually release in HD immediately.
  const isCam = type === 'movie' && diffDays < 45;

  return {
    isReleased: true,
    badge: isCam ? 'CAM' : 'HD',
    releaseDateText: rawDate,
    statusMessage: isCam ? 'Available in CAM' : 'Available in HD',
  };
}
