import React from 'react';
import { getCurrencyForCountry, getCountriesByRegion } from '../lib/currenciesData.ts';
import { Coins, Banknote } from 'lucide-react';

interface Props {
  countryCode: string;
  selectedDenomination?: string;
  selectedCategory?: 'coin' | 'banknote';
  onSelect: (category: 'coin' | 'banknote', denomination: string, currencyCode: string) => void;
  onCountryChange?: (newCode: string) => void;
}

export const CurrencyPicker: React.FC<Props> = ({
  countryCode,
  selectedDenomination,
  selectedCategory,
  onSelect,
  onCountryChange,
}) => {
  const config = getCurrencyForCountry(countryCode);
  const groupedCountries = getCountriesByRegion();

  return (
    <div className="flex flex-col gap-3 bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl">
      {/* Country & Currency Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{config.flag}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5 truncate">
              {config.countryName}
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono shrink-0">
                {config.currencyCode} ({config.symbol})
              </span>
            </div>
            <div className="text-xs text-zinc-400 truncate">{config.currencyName}</div>
          </div>
        </div>

        {onCountryChange && (
          <select
            value={countryCode}
            onChange={(e) => onCountryChange(e.target.value)}
            className="bg-zinc-800 text-xs text-zinc-300 rounded-lg px-2 py-1 border border-zinc-700 outline-none max-w-[130px] shrink-0"
          >
            {Object.entries(groupedCountries).map(([region, countries]) => (
              <optgroup key={region} label={region} className="bg-zinc-900 text-amber-400 font-semibold">
                {countries.map((c) => (
                  <option key={c.countryCode} value={c.countryCode} className="text-zinc-200 font-normal">
                    {c.flag} {c.countryName}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>

      {/* Circulating Coins Row */}
      {config.coins.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" /> Monedas habituales de {config.countryName}:
          </span>
          <div className="flex flex-wrap gap-2">
            {config.coins.map((coin) => {
              const isSelected = selectedCategory === 'coin' && selectedDenomination === coin;
              return (
                <button
                  key={`coin-${coin}`}
                  type="button"
                  onClick={() => onSelect('coin', coin, config.currencyCode)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all border-2 active:scale-95 shadow-sm ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950 border-amber-300 scale-105 shadow-amber-500/30'
                      : 'bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800'
                  }`}
                >
                  {coin}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Circulating Banknotes Row */}
      {config.banknotes.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Billetes habituales de {config.countryName}:
          </span>
          <div className="flex flex-wrap gap-2">
            {config.banknotes.map((note) => {
              const isSelected = selectedCategory === 'banknote' && selectedDenomination === note;
              return (
                <button
                  key={`note-${note}`}
                  type="button"
                  onClick={() => onSelect('banknote', note, config.currencyCode)}
                  className={`h-8 px-3 rounded-lg flex items-center justify-center text-xs font-semibold font-mono transition-all border-2 active:scale-95 shadow-sm ${
                    isSelected
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-300 scale-105 shadow-emerald-500/30'
                      : 'bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800'
                  }`}
                >
                  {note}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
