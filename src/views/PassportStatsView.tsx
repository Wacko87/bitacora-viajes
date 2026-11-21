import React, { lazy, Suspense } from 'react';
import { Trip, Artifact } from '../types.ts';
import { PRESEEDED_CURRENCIES } from '../lib/currenciesData.ts';
import { Globe, Award, Coins, Calendar, Sparkles } from 'lucide-react';

const WorldMap = lazy(() =>
  import('../components/WorldMap.tsx').then((m) => ({ default: m.WorldMap }))
);

interface Props {
  trips: Trip[];
  artifacts: Artifact[];
  onSelectCountry?: (countryCode: string) => void;
}

export const PassportStatsView: React.FC<Props> = ({ trips, artifacts, onSelectCountry }) => {
  // Compute aggregate stats
  const uniqueCountries = Array.from(new Set(trips.map((t) => t.country_code.toUpperCase())));
  const totalCoins = artifacts.filter((a) => a.category === 'coin').length;
  const totalNotes = artifacts.filter((a) => a.category === 'banknote').length;
  const totalTickets = artifacts.filter((a) => a.category === 'ticket').length;
  const totalCost = trips.reduce((acc, t) => acc + (t.total_cost || 0), 0);

  // Calculate days traveled together
  const totalDays = trips.reduce((acc, t) => {
    try {
      const start = new Date(t.start_date).getTime();
      const end = new Date(t.end_date).getTime();
      const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      return acc + diff;
    } catch {
      return acc + 1;
    }
  }, 0);

  return (
    <div className="page-container max-w-lg mx-auto flex flex-col gap-5">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          🛂 Pasaporte & Estadísticas
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          El mapa de ruta y vitrina de vuestra historia juntos
        </p>
      </div>

      {/* Passport Cover Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-mono font-bold tracking-widest text-amber-300 uppercase">
              PASAPORTE OFICIAL DE PAREJA
            </span>
          </div>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>

        {/* Stats 3-Col Grid */}
        <div className="grid grid-cols-3 gap-3 text-center my-5">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-white font-mono">{uniqueCountries.length}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Países juntos</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-white font-mono">{totalCoins + totalNotes}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Divisas físicas</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-white font-mono">{totalDays}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Días en ruta</span>
          </div>
        </div>

        {/* Secondary counters */}
        <div className="flex items-center justify-around border-t border-zinc-800/80 pt-3 text-xs text-zinc-400 flex-wrap gap-2">
          <span>🪙 {totalCoins} monedas</span>
          <span>•</span>
          <span>💵 {totalNotes} billetes</span>
          <span>•</span>
          <span>🎫 {totalTickets} tickets</span>
          {totalCost > 0 && (
            <>
              <span>•</span>
              <span className="text-emerald-400 font-semibold font-mono">
                💰 {totalCost.toLocaleString('es-ES')} €
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive World Map Component with Lazy Loading */}
      <Suspense
        fallback={
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[280px] animate-pulse">
            <Globe className="w-8 h-8 text-amber-500/50 animate-spin mb-2" />
            <span className="text-xs text-zinc-400 font-medium">Cargando mapamundi interactivo...</span>
          </div>
        }
      >
        <WorldMap
          visitedCountryCodes={uniqueCountries}
          trips={trips}
          artifacts={artifacts}
          onSelectCountry={onSelectCountry}
        />
      </Suspense>

      {/* Visited Countries Stamps Gallery */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
          📍 Sellos de Entrada & Países Recorridos
        </h3>

        {uniqueCountries.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 text-center text-xs text-zinc-500">
            Aún no hay países en vuestro pasaporte. Registra vuestro primer viaje para estampar los sellos y colorear el mapamundi.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {uniqueCountries.map((code) => {
              const config = PRESEEDED_CURRENCIES[code] || {
                countryName: code,
                flag: '🌍',
                currencyCode: 'LOCAL',
              };
              const trip = trips.find((t) => t.country_code.toUpperCase() === code);
              const countArtifacts = artifacts.filter(
                (a) => a.country_code?.toUpperCase() === code || a.trip_id === trip?.id
              ).length;

              return (
                <div
                  key={code}
                  className="relative overflow-hidden bg-zinc-900/80 border-2 border-zinc-800 p-4 rounded-2xl shadow-md flex flex-col items-center text-center gap-1.5 hover:border-amber-500/40 transition-colors"
                >
                  {/* Decorative Postal Stamp Edge Simulation */}
                  <div className="text-3xl mb-0.5">{config.flag}</div>
                  <h4 className="text-sm font-bold text-zinc-100">{config.countryName}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400 border border-zinc-700">
                    {code} • {config.currencyCode}
                  </span>

                  <span className="text-[11px] text-zinc-400 mt-1">
                    {countArtifacts} {countArtifacts === 1 ? 'tesoro' : 'tesoros'} traídos
                  </span>

                  {/* Stamp Circular Watermark */}
                  <div className="w-16 h-16 rounded-full border border-dashed border-amber-500/20 absolute -right-4 -bottom-4 pointer-events-none rotate-12" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
