import React, { useState } from 'react';
import { Artifact, ArtifactCategory, Trip } from '../types.ts';
import { Ticket, Mail, Gift, Search, Sparkles, X, Coins, Calendar, MapPin } from 'lucide-react';

interface Props {
  artifacts: Artifact[];
  trips?: Trip[];
  onOpenQuickCapture: () => void;
  onRefresh: () => void;
  onNavigateToNumismatics?: () => void;
}

export const CabinetView: React.FC<Props> = ({
  artifacts,
  onOpenQuickCapture,
  onNavigateToNumismatics,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ticket' | 'postcard' | 'souvenir'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  // Filter only memorabilia (tickets, postcards, souvenirs)
  const memorabiliaArtifacts = artifacts.filter(
    (a) => a.category === 'ticket' || a.category === 'postcard' || a.category === 'souvenir'
  );

  const ticketsCount = memorabiliaArtifacts.filter((a) => a.category === 'ticket').length;
  const postcardsCount = memorabiliaArtifacts.filter((a) => a.category === 'postcard').length;
  const souvenirsCount = memorabiliaArtifacts.filter((a) => a.category === 'souvenir').length;

  const categories: { key: 'all' | 'ticket' | 'postcard' | 'souvenir'; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'Todo', icon: <Sparkles className="w-3.5 h-3.5" />, count: memorabiliaArtifacts.length },
    { key: 'ticket', label: 'Tickets y Entradas', icon: <Ticket className="w-3.5 h-3.5" />, count: ticketsCount },
    { key: 'postcard', label: 'Postales', icon: <Mail className="w-3.5 h-3.5" />, count: postcardsCount },
    { key: 'souvenir', label: 'Souvenirs', icon: <Gift className="w-3.5 h-3.5" />, count: souvenirsCount },
  ];

  const filtered = memorabiliaArtifacts.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchTrip = a.trip_title?.toLowerCase().includes(q);
      const matchStory = a.story?.toLowerCase().includes(q);
      return matchTitle || matchTrip || matchStory;
    }
    return true;
  });

  return (
    <div className="page-container max-w-lg mx-auto flex flex-col gap-4 pb-20">
      {/* Header & Subtitle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            🏛️ Vitrina de Recuerdos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {memorabiliaArtifacts.length} {memorabiliaArtifacts.length === 1 ? 'recuerdo físico' : 'recuerdos físicos'} (tickets, postales y souvenirs)
          </p>
        </div>

        {onNavigateToNumismatics && (
          <button
            onClick={onNavigateToNumismatics}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 hover:text-amber-300 text-xs transition-colors"
            title="Ver colección de monedas y billetes"
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver</span> Monedas
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar ticket, museo, postal o anécdota..."
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 border ${
                isSelected
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {cat.icon}
              {cat.label} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* Grid of Memorabilia Items */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 text-center flex flex-col items-center gap-3 mt-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex items-center justify-center text-amber-400 text-2xl">
            🎟️
          </div>
          <p className="text-sm font-semibold text-zinc-300">Aún no hay recuerdos en esta sección</p>
          <p className="text-xs text-zinc-500 max-w-xs">
            Guarda entradas de monumentos, billetes de tren, postales o posavasos con el botón "+" inferior.
          </p>
          <button
            onClick={onOpenQuickCapture}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs active:scale-95 transition-all shadow-md shadow-amber-500/20"
          >
            Añadir primer souvenir
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {filtered.map((artifact) => {
            const icon =
              artifact.category === 'ticket'
                ? '🎟️'
                : artifact.category === 'postcard'
                ? '✉️'
                : '🎁';

            return (
              <div
                key={artifact.id}
                onClick={() => setActiveArtifact(artifact)}
                className="group cursor-pointer bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-2.5 rounded-2xl transition-all shadow-md flex flex-col gap-2 relative overflow-hidden"
              >
                {/* Image */}
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/60 flex items-center justify-center relative">
                  <img
                    src={artifact.image_front}
                    alt={artifact.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-[10px] text-zinc-200 flex items-center gap-1 font-medium">
                    <span>{icon}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-col min-w-0">
                  <h4 className="text-xs font-bold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                    {artifact.title}
                  </h4>
                  {artifact.trip_title && (
                    <span className="text-[10px] text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      {artifact.trip_title}
                    </span>
                  )}
                  {artifact.story && (
                    <p className="text-[10px] text-zinc-500 line-clamp-1 italic mt-1">
                      "{artifact.story}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
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
                {activeArtifact.category === 'ticket'
                  ? '🎟️'
                  : activeArtifact.category === 'postcard'
                  ? '✉️'
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
            <div className="w-full max-h-80 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center p-2">
              <img
                src={activeArtifact.image_front}
                alt={activeArtifact.title}
                className="w-full h-full object-contain rounded-xl"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* If Back Image exists */}
            {activeArtifact.image_back && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-zinc-400">Reverso:</span>
                <div className="w-full max-h-48 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 p-1 flex items-center justify-center">
                  <img
                    src={activeArtifact.image_back}
                    alt={`${activeArtifact.title} Reverso`}
                    className="w-full h-full object-contain rounded-lg"
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
          </div>
        </div>
      )}
    </div>
  );
};
