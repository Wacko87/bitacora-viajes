import React, { useState, useMemo } from 'react';
import worldData from '@svg-maps/world';
import { PRESEEDED_CURRENCIES } from '../lib/currenciesData.ts';
import { Trip, Artifact } from '../types.ts';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Sparkles, Compass } from 'lucide-react';

interface Props {
  visitedCountryCodes: string[];
  trips?: Trip[];
  artifacts?: Artifact[];
  onSelectCountry?: (countryCode: string) => void;
}

// Regional zoom presets (viewBox coordinates)
const REGION_PRESETS: Record<string, { label: string; flag: string; viewBox: string }> = {
  world: { label: 'Mundo', flag: '🌍', viewBox: '0 0 1010 666' },
  europe: { label: 'Europa', flag: '🇪🇺', viewBox: '430 200 240 200' },
  americas: { label: 'América', flag: '🌎', viewBox: '100 120 400 480' },
  asia: { label: 'Asia', flag: '🇯🇵', viewBox: '580 180 340 280' },
  africa: { label: 'África', flag: '🌍', viewBox: '430 290 280 280' },
};

export const WorldMap: React.FC<Props> = ({
  visitedCountryCodes,
  trips = [],
  artifacts = [],
  onSelectCountry,
}) => {
  const [activeRegion, setActiveRegion] = useState<string>('world');
  const [hoveredCountry, setHoveredCountry] = useState<{
    id: string;
    name: string;
    isVisited: boolean;
  } | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Set of uppercase visited codes for O(1) lookup
  const visitedSet = useMemo(() => {
    return new Set(visitedCountryCodes.map((c) => c.toUpperCase()));
  }, [visitedCountryCodes]);

  const currentViewBox = REGION_PRESETS[activeRegion]?.viewBox || '0 0 1010 666';

  // Helper to get Spanish name & details from ISO code
  const getCountryInfo = (iso2: string, defaultName: string) => {
    const code = iso2.toUpperCase();
    const config = PRESEEDED_CURRENCIES[code];
    return {
      code,
      name: config?.countryName || defaultName,
      flag: config?.flag || '🏳️',
      currency: config ? `${config.currencyCode} (${config.symbol})` : null,
      tripsCount: trips.filter((t) => t.country_code?.toUpperCase() === code).length,
      artifactsCount: artifacts.filter((a) => a.country_code?.toUpperCase() === code).length,
      isVisited: visitedSet.has(code),
    };
  };

  const activeInfo = selectedCountry
    ? getCountryInfo(selectedCountry, selectedCountry)
    : hoveredCountry
    ? getCountryInfo(hoveredCountry.id, hoveredCountry.name)
    : null;

  return (
    <div className="flex flex-col gap-3 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 shadow-2xl overflow-hidden relative">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Mapamundi de Vuestras Rutas
            </h3>
            <span className="text-[11px] text-zinc-400">
              {visitedSet.size} de 256 países explorados ({((visitedSet.size / 256) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-400 bg-zinc-950/60 px-3 py-1.5 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] inline-block" />
            <span className="text-amber-300 font-semibold">Visitado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 inline-block" />
            <span>Por descubrir</span>
          </div>
        </div>
      </div>

      {/* Region Presets Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {Object.entries(REGION_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveRegion(key)}
            className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 border ${
              activeRegion === key
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-sm shadow-amber-500/20'
                : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <span>{preset.flag}</span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* SVG Map Container */}
      <div className="relative w-full aspect-[16/10] min-h-[240px] bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden flex items-center justify-center shadow-inner">
        {/* Subtle Map Grid/Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        <svg
          viewBox={currentViewBox}
          className="w-full h-full transition-all duration-500 ease-out cursor-grab active:cursor-grabbing"
          style={{ maxHeight: '100%' }}
        >
          <g>
            {(worldData as { locations: Array<{ id: string; name: string; path: string }> }).locations.map((loc) => {
              const code = loc.id.toUpperCase();
              const isVisited = visitedSet.has(code);
              const isSelected = selectedCountry === code;

              return (
                <path
                  key={loc.id}
                  id={loc.id}
                  d={loc.path}
                  onClick={() => {
                    setSelectedCountry(code === selectedCountry ? null : code);
                    if (onSelectCountry) onSelectCountry(code);
                  }}
                  onMouseEnter={() =>
                    setHoveredCountry({
                      id: loc.id,
                      name: loc.name,
                      isVisited,
                    })
                  }
                  onMouseLeave={() => setHoveredCountry(null)}
                  className={`transition-colors duration-200 outline-none cursor-pointer ${
                    isVisited
                      ? 'fill-amber-400 stroke-amber-200 hover:fill-amber-300'
                      : 'fill-zinc-800/80 stroke-zinc-900 hover:fill-zinc-700'
                  } ${isSelected ? 'stroke-white stroke-[1.5]' : 'stroke-[0.4]'}`}
                  style={{
                    filter: isVisited
                      ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.45))'
                      : undefined,
                  }}
                >
                  <title>{loc.name}</title>
                </path>
              );
            })}
          </g>
        </svg>

        {/* Zoom quick floating hint */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl shadow-lg">
          <button
            type="button"
            onClick={() => setActiveRegion('europe')}
            title="Zoom Europa"
            className="p-1 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 text-xs"
          >
            🇪🇺
          </button>
          <button
            type="button"
            onClick={() => setActiveRegion('world')}
            title="Ver Mundo completo"
            className="p-1 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 text-xs"
          >
            🌍
          </button>
        </div>
      </div>

      {/* Selected or Hovered Country Interactive Info Card */}
      {activeInfo ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-950 border border-amber-500/30 p-3 rounded-2xl animate-fade-in gap-2.5">
          <div className="flex items-center gap-3">
            <span className="text-3xl shrink-0">{activeInfo.flag}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white truncate">{activeInfo.name}</h4>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                  {activeInfo.code}
                </span>
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 flex-wrap">
                {activeInfo.currency && <span>Moneda: {activeInfo.currency}</span>}
                {activeInfo.isVisited ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 inline" /> ¡Visitado juntos!
                  </span>
                ) : (
                  <span className="text-zinc-500">Pendiente en vuestro bucket list</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 border-zinc-800/60 pt-2 sm:pt-0 shrink-0">
            {activeInfo.isVisited ? (
              <div className="text-xs">
                <span className="font-bold text-amber-400 font-mono">
                  {activeInfo.tripsCount}
                </span>{' '}
                <span className="text-zinc-400">{activeInfo.tripsCount === 1 ? 'viaje' : 'viajes'}</span>
                <div className="text-[11px] text-zinc-400">
                  {activeInfo.artifactsCount} {activeInfo.artifactsCount === 1 ? 'tesoro' : 'tesoros'}
                </div>
              </div>
            ) : (
              <span className="text-xs text-zinc-500 italic">Por recorrer ✈️</span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-xs text-zinc-500">
          Toca o pasa por encima de cualquier país del mapa para explorar sus datos y viajes
        </div>
      )}
    </div>
  );
};
