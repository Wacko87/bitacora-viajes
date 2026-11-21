import React, { useState } from 'react';
import { Artifact, ArtifactCategory } from '../types.ts';
import { CoinFlipCard } from '../components/CoinFlipCard.tsx';
import { Coins, Banknote, Ticket, Mail, Gift, Search, Sparkles, X } from 'lucide-react';

interface Props {
  artifacts: Artifact[];
  onOpenQuickCapture: () => void;
  onRefresh: () => void;
}

export const CabinetView: React.FC<Props> = ({ artifacts, onOpenQuickCapture }) => {
  const [selectedCategory, setSelectedCategory] = useState<ArtifactCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  const categories: { key: ArtifactCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Todo', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'coin', label: 'Monedas', icon: <Coins className="w-3.5 h-3.5" /> },
    { key: 'banknote', label: 'Billetes', icon: <Banknote className="w-3.5 h-3.5" /> },
    { key: 'ticket', label: 'Tickets', icon: <Ticket className="w-3.5 h-3.5" /> },
    { key: 'postcard', label: 'Postales', icon: <Mail className="w-3.5 h-3.5" /> },
    { key: 'souvenir', label: 'Souvenirs', icon: <Gift className="w-3.5 h-3.5" /> },
  ];

  const filtered = artifacts.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchCountry = a.country_code?.toLowerCase().includes(q);
      const matchTrip = a.trip_title?.toLowerCase().includes(q);
      const matchDenom = a.denomination?.toLowerCase().includes(q);
      const matchStory = a.story?.toLowerCase().includes(q);
      return matchTitle || matchCountry || matchTrip || matchDenom || matchStory;
    }
    return true;
  });

  return (
    <div className="page-container max-w-lg mx-auto flex flex-col gap-5">
      {/* Header & Subtitle */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          🏛️ Vitrina de Recuerdos
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          {artifacts.length} {artifacts.length === 1 ? 'tesoro guardado' : 'tesoros guardados'} de vuestros viajes
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por divisa, país, viaje o anécdota..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95 border ${
                isSelected
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Artifacts */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 text-center flex flex-col items-center gap-3 mt-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex items-center justify-center text-amber-400 text-2xl">
            🪙
          </div>
          <p className="text-sm font-medium text-zinc-300">Aún no hay recuerdos en esta categoría</p>
          <p className="text-xs text-zinc-500 max-w-xs">
            Pulsa el botón "+" central para capturar en 5 segundos una moneda o recuerdo de vuestro viaje actual.
          </p>
          <button
            onClick={onOpenQuickCapture}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-semibold text-xs active:scale-95 transition-all shadow-md shadow-amber-500/20"
          >
            Añadir primer recuerdo
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={() => setActiveArtifact(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {activeArtifact.category === 'coin'
                  ? '🪙'
                  : activeArtifact.category === 'banknote'
                  ? '💵'
                  : activeArtifact.category === 'ticket'
                  ? '🎫'
                  : activeArtifact.category === 'postcard'
                  ? '💌'
                  : '🎁'}
              </span>
              <div>
                <h3 className="text-base font-bold text-white">{activeArtifact.title}</h3>
                <p className="text-xs text-zinc-400">
                  {activeArtifact.trip_title || 'Recuerdo independiente'}
                </p>
              </div>
            </div>

            {/* Display Image Front */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center p-2">
              <img
                src={activeArtifact.image_front}
                alt={activeArtifact.title}
                className="w-full h-full object-contain"
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
