import React from 'react';

export interface ProviderInfo {
  id: number;
  key: string;
  name: string;
  shortName: string;
  tagline: string;
  accentColor: string;
  bgGradient: string;
  borderHover: string;
  glowColor: string;
  badgeBg: string;
}

export const STREAMING_PROVIDERS: ProviderInfo[] = [
  {
    id: 8,
    key: 'netflix',
    name: 'Netflix',
    shortName: 'Netflix',
    tagline: 'Originals & Movies',
    accentColor: '#E50914',
    bgGradient: 'from-[#E50914]/25 via-[#180506] to-[#0d0d0f]',
    borderHover: 'hover:border-[#E50914]/70',
    glowColor: 'rgba(229, 9, 20, 0.45)',
    badgeBg: 'bg-[#E50914] text-white',
  },
  {
    id: 384,
    key: 'hbomax',
    name: 'HBO Max',
    shortName: 'Max',
    tagline: 'Prestige Series & DC',
    accentColor: '#5822B4',
    bgGradient: 'from-[#5822B4]/30 via-[#130b24] to-[#0d0d0f]',
    borderHover: 'hover:border-[#7A3EED]/70',
    glowColor: 'rgba(122, 62, 237, 0.45)',
    badgeBg: 'bg-[#7A3EED] text-white',
  },
  {
    id: 337,
    key: 'disney',
    name: 'Disney+',
    shortName: 'Disney+',
    tagline: 'Marvel, Star Wars & Pixar',
    accentColor: '#0063E5',
    bgGradient: 'from-[#0063E5]/30 via-[#071329] to-[#0d0d0f]',
    borderHover: 'hover:border-[#0063E5]/70',
    glowColor: 'rgba(0, 99, 229, 0.45)',
    badgeBg: 'bg-[#0063E5] text-white',
  },
  {
    id: 350,
    key: 'appletv',
    name: 'Apple TV+',
    shortName: 'Apple TV+',
    tagline: 'Award-Winning Originals',
    accentColor: '#FFFFFF',
    bgGradient: 'from-white/20 via-[#1c1c1f] to-[#0d0d0f]',
    borderHover: 'hover:border-white/70',
    glowColor: 'rgba(255, 255, 255, 0.35)',
    badgeBg: 'bg-white text-black',
  },
  {
    id: 119,
    key: 'prime',
    name: 'Prime Video',
    shortName: 'Prime Video',
    tagline: 'Amazon Originals & Hits',
    accentColor: '#00A8E1',
    bgGradient: 'from-[#00A8E1]/30 via-[#061824] to-[#0d0d0f]',
    borderHover: 'hover:border-[#00A8E1]/70',
    glowColor: 'rgba(0, 168, 225, 0.45)',
    badgeBg: 'bg-[#00A8E1] text-white',
  },
  {
    id: 15,
    key: 'hulu',
    name: 'Hulu',
    shortName: 'Hulu',
    tagline: 'Originals & Next-Day TV',
    accentColor: '#FFFFFF',
    bgGradient: 'from-white/10 via-[#0a0a0c] to-[#000000]',
    borderHover: 'hover:border-white/50',
    glowColor: 'rgba(255, 255, 255, 0.2)',
    badgeBg: 'bg-white text-black',
  },
  {
    id: 531,
    key: 'paramount',
    name: 'Paramount+',
    shortName: 'Paramount+',
    tagline: 'A Mountain of Movies',
    accentColor: '#0064FF',
    bgGradient: 'from-[#0064FF]/30 via-[#07132e] to-[#0d0d0f]',
    borderHover: 'hover:border-[#0064FF]/70',
    glowColor: 'rgba(0, 100, 255, 0.45)',
    badgeBg: 'bg-[#0064FF] text-white',
  },
  {
    id: 283,
    key: 'crunchyroll',
    name: 'Crunchyroll',
    shortName: 'Crunchyroll',
    tagline: 'World of Anime',
    accentColor: '#F47521',
    bgGradient: 'from-[#F47521]/30 via-[#231206] to-[#0d0d0f]',
    borderHover: 'hover:border-[#F47521]/70',
    glowColor: 'rgba(244, 117, 33, 0.45)',
    badgeBg: 'bg-[#F47521] text-white',
  },
];

// Pristine vector brand marks rendered directly for 100% reliability on dark backgrounds
export function ProviderLogo({
  providerKey,
  className = "h-7 max-h-8 w-auto object-contain",
}: {
  providerKey: string;
  className?: string;
}) {
  switch (providerKey) {
    case 'netflix':
      return (
        <img
          src="https://image.tmdb.org/t/p/w300/wwemzKWzjKYJFfCeiB57q3r4Bcm.png"
          alt="Netflix"
          className={`${className} object-contain drop-shadow-md`}
        />
      );

    case 'hbomax':
      return (
        <img
          src="https://image.tmdb.org/t/p/w300/nmU0UMDJB3dRRQSTUqawzF2Od1a.png"
          alt="HBO Max"
          className={`${className} object-contain drop-shadow-md brightness-0 invert opacity-90`}
          style={{ height: '70%', filter: 'brightness(0) invert(1)' }}
        />
      );

    case 'disney':
      return (
        <img
          src="https://image.tmdb.org/t/p/w300/1edZOYAfoyZyZ3rklNSiUpXX30Q.png"
          alt="Disney+"
          className={`${className} object-contain drop-shadow-md `}
          style={{ height: '90%' }}
        />
      );

    case 'appletv':
      return (
        <img
          src="https://image.tmdb.org/t/p/w300/bngHRFi794mnMq34gfVcm9nDxN1.png"
          alt="Apple TV+"
          className={`${className} object-contain drop-shadow-md brightness-0 invert opacity-90`}
          style={{ height: '75%', filter: 'brightness(0) invert(1)' }}
        />
      );

    case 'prime':
      return (
        <img
          src="https://image.tmdb.org/t/p/w300/w7HfLNm9CWwRmAMU58udl2L7We7.png"
          alt="Prime Video"
          className={`${className} object-contain drop-shadow-md `}
          style={{ height: '80%' }}
        />
      );

    case 'hulu':
      return (
        <img
          src="https://image.tmdb.org/t/p/w300/pqUTCleNUiTLAVlelGxUgWn1ELh.png"
          alt="Hulu"
          className={`${className} object-contain drop-shadow-md `}
          style={{ height: '75%' }}
        />
      );

    case 'paramount':
      return (
        <img
          src="https://image.tmdb.org/t/p/w300/fi83B1oztoS47xxcemFdPMhIzK.png"
          alt="Paramount+"
          className={`${className} object-contain drop-shadow-md `}
          style={{ height: '95%' }}
        />
      );

    case 'crunchyroll':
      return (
        <img
          src="https://image.tmdb.org/t/p/w300/qqyXcZlJQKlRmAD1TCKV7mGLQlt.png"
          alt="Crunchyroll"
          className={`${className} object-contain drop-shadow-md `}
        />
      );

    default:
      return <span className="text-white font-bold">{providerKey}</span>;
  }
}

interface BrandHubProps {
  selectedProviderId: number | null;
  onSelectProvider: (provider: ProviderInfo | null) => void;
}

export const BrandHub: React.FC<BrandHubProps> = ({
  selectedProviderId,
  onSelectProvider,
}) => {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-8">
      {selectedProviderId && (
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={() => onSelectProvider(null)}
            className="text-xs font-semibold text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
          >
            Clear Filter (Show All)
          </button>
        </div>
      )}

      {/* Interactive Network Brand Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-3.5">
        {STREAMING_PROVIDERS.map((provider) => {
          const isSelected = selectedProviderId === provider.id;
          return (
            <button
              key={provider.key}
              id={`brand-tile-${provider.key}`}
              data-is-logo="true"
              onClick={() => onSelectProvider(isSelected ? null : provider)}
              style={{
                boxShadow: isSelected
                  ? `0 0 25px ${provider.glowColor}, inset 0 0 15px ${provider.glowColor}`
                  : undefined,
              }}
              className={`group relative flex flex-col items-center justify-center h-24 sm:h-28 rounded-2xl p-3 text-center transition-all duration-300 transform active:scale-95 cursor-pointer overflow-hidden border ${
                isSelected
                  ? `border-white scale-[1.03] bg-gradient-to-b ${provider.bgGradient} ring-2 ring-white/40`
                  : `border-white/10 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 hover:scale-[1.03] ${provider.borderHover} hover:shadow-xl`
              }`}
            >
              {/* Background ambient glow on hover */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b ${provider.bgGradient} pointer-events-none`}
              />

              {/* Vector Logo */}
              <div className="relative z-10 flex items-center justify-center h-10 w-full mb-1.5 transition-transform duration-300 group-hover:scale-105">
                <ProviderLogo providerKey={provider.key} />
              </div>

              {/* Tagline / Subtitle */}
              <span className="relative z-10 text-[10px] text-neutral-400 font-medium tracking-tight truncate w-full group-hover:text-neutral-200 transition-colors">
                {provider.tagline}
              </span>

              {/* Selection indicator bar */}
              {isSelected && (
                <div
                  className="absolute bottom-0 inset-x-0 h-1 rounded-b-2xl"
                  style={{ backgroundColor: provider.accentColor }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
