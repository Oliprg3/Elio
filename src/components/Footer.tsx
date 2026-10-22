import React from 'react';
import { ElioLogo } from './ElioLogo';

interface FooterProps {
  onSelectTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  return (
    <footer className="border-t border-white/[0.06] bg-[#000000] text-zinc-500 text-xs pt-12 pb-16 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <ElioLogo size="sm" />
          <p className="text-zinc-500 text-[11px] text-center md:text-left max-w-sm">
            Instant high-definition streaming for movies and series with intelligent episode tracking.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex items-center flex-wrap justify-center gap-6 text-xs text-zinc-400">
          <button onClick={() => onSelectTab('home')} className="hover:text-white transition-colors cursor-pointer">
            Home
          </button>
          <button onClick={() => onSelectTab('movies')} className="hover:text-white transition-colors cursor-pointer">
            Movies
          </button>
          <button onClick={() => onSelectTab('tv')} className="hover:text-white transition-colors cursor-pointer">
            Shows
          </button>
          <button onClick={() => onSelectTab('trending')} className="hover:text-white transition-colors cursor-pointer">
            Trending
          </button>
          <button onClick={() => onSelectTab('genres')} className="hover:text-white transition-colors cursor-pointer">
            Categories
          </button>
          <button onClick={() => onSelectTab('watchlist')} className="hover:text-white transition-colors cursor-pointer">
            My List
          </button>
        </div>

        {/* TMDB Notice */}
        <div className="text-[10px] text-zinc-600 font-medium tracking-wide text-center md:text-right uppercase">
          <div>Powered by TMDB API</div>
        </div>
      </div>
    </footer>
  );
};
