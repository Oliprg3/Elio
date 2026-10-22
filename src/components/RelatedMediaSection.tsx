import React, { useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { motion } from 'motion/react';
import { TMDBMedia } from '../types/tmdb';
import { MediaCard } from './MediaCard';

interface RelatedMediaSectionProps {
  recommendations: TMDBMedia[];
  similar: TMDBMedia[];
  onSelectMedia: (type: 'movie' | 'tv', id: number) => void;
  onWatchlistChange: () => void;
}

export const RelatedMediaSection: React.FC<RelatedMediaSectionProps> = ({
  recommendations,
  similar,
  onSelectMedia,
  onWatchlistChange,
}) => {
  const [activeTab, setActiveTab] = useState<'related' | 'similar'>('related');

  // Combine and deduplicate items
  const relatedList = recommendations && recommendations.length > 0 ? recommendations : similar;
  const displayItems = activeTab === 'related' ? relatedList : (similar && similar.length > 0 ? similar : relatedList);

  if (!displayItems || displayItems.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      id="related-media-section"
      className="mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="bg-[#0b0c10] border border-white/[0.06] rounded-2xl p-5 sm:p-7 shadow-xl">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-xl font-bold text-white font-display">
                More Like This
              </h3>
            </div>
          </div>

          {/* Subtabs if both exist */}
          {similar && similar.length > 0 && recommendations && recommendations.length > 0 && (
            <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-full p-1 backdrop-blur-md">
              <button
                onClick={() => setActiveTab('related')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'related'
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Recommended
              </button>
              <button
                onClick={() => setActiveTab('similar')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'similar'
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Similar
              </button>
            </div>
          )}
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {displayItems.slice(0, 12).map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              className="w-full"
              onPlay={onSelectMedia}
              onInfo={(m) => onSelectMedia(m.media_type || 'movie', m.id)}
              onWatchlistToggle={onWatchlistChange}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
};
