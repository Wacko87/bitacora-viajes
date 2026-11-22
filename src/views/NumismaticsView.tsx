import React, { useState } from 'react';
import { Artifact, ArtifactCategory, Trip } from '../types.ts';
import { CoinFlipCard } from '../components/CoinFlipCard.tsx';
import { Coins, Banknote, Search, Sparkles, X, Globe, Landmark } from 'lucide-react';
import { PRESEEDED_CURRENCIES } from '../lib/currenciesData.ts';

interface Props {
  artifacts: Artifact[];
  trips?: Trip[];
  onOpenQuickCapture: () => void;
  onRefresh: () => void;
  onNavigateToCabinet?: () => void;
}

export const NumismaticsView: React.FC<Props> = ({
  artifacts,
  trips = [],
  onOpenQuickCapture,
  onNavigateToCabinet,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'coin' | 'banknote'>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  // Filter only numismatic pieces (coins & banknotes)
  const numismaticArtifacts = artifacts.filter(
    (a) => a.category === 'coin' || a.category === 'banknote'
  );

  const coinsCount = numismaticArtifacts.filter((a) => a.category === 'coin').length;
  const banknotesCount = numismaticArtifacts.filter((a) => a.category === 'banknote').length;

  // Available countries with numismatic pieces
  const countryCodes = Array.from(
    new Set(numismaticArtifacts.map((a) => a.country_code).filter(Boolean))
  ) as string[];

  const filtered = numismaticArtifacts.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (selectedCountry !== 'all' && a.country_code !== selectedCountry) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchCountry = a.country_code?.toLowerCase().includes(q);
      const matchTrip = a.trip_title?.toLowerCase().includes(q);
      const matchDenom = a.denomination?.toLowerCase().includes(q);
      const matchCurr = a.currency_code?.toLowerCase().includes(q);
      const matchStory = a.story?.toLowerCase().includes(q);
      return matchTitle || matchCountry || matchTrip || matchDenom || matchCurr || matchStory;
    }
    return true;
  });

  return (
    <div className="page-container max-w-lg mx-auto flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            🪙 Monedas y Billetes
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {numismaticArtifacts.length} {numismaticArtifacts.length === 1 ? 'pieza numismática' : 'piezas numismáticas'} ({coinsCount} {coinsCount === 1 ? 'moneda' : 'monedas'} y {banknotesCount} {banknotesCount === 1 ? 'billete' : 'billetes'})
          </p>
        </div>

        {onNavigateToCabinet && (
          <button
            onClick={onNavigateToCabinet}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors"
            title="Ver tickets, postales y souvenirs"
          >
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Ver</span> Vitrina
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar moneda, billete, valor facial, país..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
        />
      </div>

      {/* Filter Tabs & Country Chips */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 border ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Todas ({numismaticArtifacts.length})
          </button>

          <button
            onClick={() => setSelectedCategory('coin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 border ${
              selectedCategory === 'coin'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Monedas ({coinsCount})
          </button>

          <button
            onClick={() => setSelectedCategory('banknote')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 border ${
              selectedCategory === 'banknote'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            Billetes ({banknotesCount})
          </button>
        </div>

        {/* Optional Country Filter Chips */}
        {countryCodes.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCountry('all')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedCountry === 'all'
                  ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                  : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              <Globe className="w-3 h-3" /> Todos los países
            </button>
            {countryCodes.map((code) => {
              const countryInfo = PRESEEDED_CURRENCIES[code.toUpperCase()];
              const flag = countryInfo?.flag || '🌍';
              const name = countryInfo?.countryName || code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedCountry(selectedCountry === code ? 'all' : code)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    selectedCountry === code
                      ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <span>{flag}</span>
                  <span>{name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid of 3D Flip Cards */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 text-center flex flex-col items-center gap-3 mt-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl">
            🪙
          </div>
          <p className="text-sm font-semibold text-zinc-300">No hay monedas o billetes en esta vista</p>
          <p className="text-xs text-zinc-500 max-w-xs">
            Guarda una moneda o billete con el botón "+" inferior para empezar vuestro gabinete numismático.
          </p>
          <button
            onClick={onOpenQuickCapture}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs active:scale-95 transition-all shadow-md shadow-amber-500/20"
          >
            Añadir moneda o billete
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {filtered.map((artifact) => (
            <CoinFlipCard
              key={artifact.id}
              artifact={artifact}
              onSelect={() => setActiveArtifact(artifact)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {activeArtifact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveArtifact(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {activeArtifact.category === 'coin' ? '🪙' : '💵'}
              </span>
              <div>
                <h3 className="text-base font-bold text-white">{activeArtifact.title}</h3>
                <p className="text-xs text-zinc-400">
                  {activeArtifact.trip_title || 'Colección numismática'}
                </p>
              </div>
            </div>

            {/* Display Image Front */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center p-2 shadow-inner">
              <img
                src={activeArtifact.image_front}
                alt={activeArtifact.title}
                className="w-full h-full object-contain drop-shadow-md"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* If Back Image exists */}
            {activeArtifact.image_back && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-zinc-400">Reverso:</span>
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 p-1">
                  <img
                    src={activeArtifact.image_back}
                    alt={`${activeArtifact.title} Reverso`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            )}

            {/* Context Story */}
            {activeArtifact.story && (
              <div className="bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-semibold">Anécdota:</span>
                <p className="text-xs text-zinc-300 italic mt-0.5">"{activeArtifact.story}"</p>
              </div>
            )}

            {/* Metadata info */}
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
              {activeArtifact.denomination && (
                <div className="bg-zinc-800/50 p-2 rounded-lg">
                  <span className="block text-[10px] text-zinc-500">Valor facial:</span>
                  <span className="font-semibold text-zinc-200">
                    {activeArtifact.denomination} {activeArtifact.currency_code}
                  </span>
                </div>
              )}
              {activeArtifact.year && (
                <div className="bg-zinc-800/50 p-2 rounded-lg">
                  <span className="block text-[10px] text-zinc-500">Año de emisión:</span>
                  <span className="font-semibold text-zinc-200">{activeArtifact.year}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
