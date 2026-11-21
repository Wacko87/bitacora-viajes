import React, { useState } from 'react';
import { Trip, Artifact } from '../types.ts';
import {
  CirculatingPiece,
  getCirculatingCurrenciesForTrip,
  matchesDenomination,
} from '../lib/circulatingCurrencies.ts';
import {
  Coins,
  CheckCircle2,
  Lock,
  Plus,
  Camera,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { generateUUIDv7 } from '../lib/id.ts';

interface Props {
  trip: Trip;
  artifacts: Artifact[];
  onSaveArtifact: (artifact: Artifact, frontBlob?: Blob, backBlob?: Blob) => Promise<void>;
  onDeleteArtifact?: (artifactId: string) => Promise<void>;
}

export const CirculatingSeriesAlbum: React.FC<Props> = ({
  trip,
  artifacts,
  onSaveArtifact,
  onDeleteArtifact,
}) => {
  const [filter, setFilter] = useState<'all' | 'coins' | 'banknotes' | 'collected' | 'pending'>('all');
  const [selectedPiece, setSelectedPiece] = useState<CirculatingPiece | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const tripYear = trip.start_date ? new Date(trip.start_date).getFullYear() : undefined;
  const series = getCirculatingCurrenciesForTrip(trip.country_code, tripYear);

  // Map which pieces have been collected by the couple for this trip
  const tripArtifacts = artifacts.filter(
    (a) => a.trip_id === trip.id || a.country_code === trip.country_code
  );

  const getMatchedArtifact = (piece: CirculatingPiece): Artifact | undefined => {
    return tripArtifacts.find((a) => {
      if (a.category !== piece.category) return false;
      // Coincidencia directa por ID de pieza si se guardó desde el álbum
      if (a.story && a.story.includes(`[piece:${piece.id}]`)) return true;
      // Coincidencia no solapada de denominación y título
      return (
        matchesDenomination(a.denomination, piece.denomination) ||
        matchesDenomination(a.title, piece.denomination)
      );
    });
  };

  const collectedCount = series.filter((p) => Boolean(getMatchedArtifact(p))).length;
  const progressPercent = series.length > 0 ? Math.round((collectedCount / series.length) * 100) : 0;

  const filteredSeries = series.filter((piece) => {
    const isCollected = Boolean(getMatchedArtifact(piece));
    if (filter === 'coins') return piece.category === 'coin';
    if (filter === 'banknotes') return piece.category === 'banknote';
    if (filter === 'collected') return isCollected;
    if (filter === 'pending') return !isCollected;
    return true;
  });

  const handleOpenPiece = (piece: CirculatingPiece) => {
    const matched = getMatchedArtifact(piece);
    setSelectedPiece(piece);
    setSelectedArtifact(matched || null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleCloseModal = () => {
    setSelectedPiece(null);
    setSelectedArtifact(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Quick mark as collected or upload photo
  const handleToggleCollected = async () => {
    if (!selectedPiece || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (selectedArtifact) {
        // If already collected and user wants to unmark / delete
        if (onDeleteArtifact) {
          await onDeleteArtifact(selectedArtifact.id);
        }
        handleCloseModal();
      } else {
        // Mark as collected
        const newArtifact: Artifact = {
          id: generateUUIDv7(),
          trip_id: trip.id,
          category: selectedPiece.category,
          title: selectedPiece.name,
          denomination: selectedPiece.denomination,
          currency_code: selectedPiece.currencyCode,
          year: tripYear || new Date().getFullYear(),
          image_front: photoPreview || '',
          story: `Conseguido durante el viaje a ${trip.title} [piece:${selectedPiece.id}]`,
        };

        await onSaveArtifact(newArtifact, photoFile || undefined);
        handleCloseModal();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Album Header & Collection Progress */}
      <div className="bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Serie Oficial en Circulación {tripYear ? `(${tripYear})` : ''}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Divisas legales que podíais encontrar en las calles durante vuestro viaje
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-base font-black text-amber-400 font-mono">
              {collectedCount} / {series.length}
            </span>
            <span className="text-[10px] text-zinc-500 block">conseguidas</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-950/80 rounded-full h-2.5 mt-3 overflow-hidden border border-zinc-800">
          <div
            className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1.5 font-medium">
          <span>Progreso de la colección</span>
          <span className="text-amber-400 font-bold">{progressPercent}% completado</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { key: 'all', label: `Todas (${series.length})` },
          { key: 'coins', label: `🪙 Monedas` },
          { key: 'banknotes', label: `💵 Billetes` },
          { key: 'collected', label: `✓ Conseguidas (${collectedCount})` },
          { key: 'pending', label: `🔒 Pendientes (${series.length - collectedCount})` },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key as any)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid of Circulating Currencies */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filteredSeries.map((piece) => {
          const matched = getMatchedArtifact(piece);
          const isCollected = Boolean(matched);
          const isCoin = piece.category === 'coin';

          return (
            <div
              key={piece.id}
              onClick={() => handleOpenPiece(piece)}
              className={`group relative cursor-pointer flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 shadow-md ${
                isCollected
                  ? 'bg-gradient-to-tr from-zinc-900 via-zinc-900 to-amber-950/20 border-amber-500/50 hover:border-amber-400 ring-1 ring-amber-500/20 shadow-amber-500/5 hover:scale-[1.02]'
                  : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 opacity-50 hover:opacity-85'
              }`}
            >
              {/* Badge: Conseguido vs Pendiente */}
              <div className="w-full flex items-center justify-between mb-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isCollected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  {isCollected ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5 text-amber-400" />
                      Conseguida
                    </>
                  ) : (
                    <>
                      <Lock className="w-2.5 h-2.5" />
                      Pendiente
                    </>
                  )}
                </span>

                <span className="text-[10px] text-zinc-500 font-mono">
                  {isCoin ? '🪙 Moneda' : '💵 Billete'}
                </span>
              </div>

              {/* Visual Token (Coin or Banknote) */}
              <div className="w-full aspect-square flex items-center justify-center p-2 relative">
                {isCoin ? (
                  /* Coin Representation */
                  <div
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                      isCollected
                        ? 'border-4 border-amber-400/70 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-amber-950 shadow-[inset_0_2px_12px_rgba(251,191,36,0.3)] ring-2 ring-white/10'
                        : 'border-2 border-dashed border-zinc-700 bg-zinc-900/60 filter grayscale'
                    }`}
                  >
                    {matched?.image_front ? (
                      <img
                        src={matched.image_front}
                        alt={piece.name}
                        className="w-full h-full object-cover rounded-full"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-1">
                        <span
                          className={`font-black tracking-tight leading-none ${
                            isCollected ? 'text-amber-300 text-lg' : 'text-zinc-500 text-base'
                          }`}
                        >
                          {piece.denomination}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase ${
                            isCollected ? 'text-amber-400/80' : 'text-zinc-600'
                          }`}
                        >
                          {piece.currencySymbol || piece.currencyCode}
                        </span>
                      </div>
                    )}

                    {/* Specular sheen effect on collected coin */}
                    {isCollected && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded-full" />
                    )}
                  </div>
                ) : (
                  /* Banknote Representation */
                  <div
                    className={`w-full h-16 rounded-xl flex items-center justify-between p-2.5 border transition-all ${
                      isCollected
                        ? `bg-gradient-to-r ${piece.gradient || 'from-zinc-900 to-amber-950/30'} border-amber-400/60 shadow-md ring-1 ring-white/10`
                        : 'bg-zinc-900/60 border-dashed border-zinc-700 filter grayscale'
                    }`}
                  >
                    {matched?.image_front ? (
                      <img
                        src={matched.image_front}
                        alt={piece.name}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <>
                        <div className="flex flex-col text-left">
                          <span
                            className={`text-sm font-black font-mono leading-none ${
                              isCollected ? 'text-white' : 'text-zinc-500'
                            }`}
                          >
                            {piece.denomination}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-bold ${
                              isCollected ? 'text-amber-400' : 'text-zinc-600'
                            }`}
                          >
                            {piece.currencySymbol || piece.currencyCode}
                          </span>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-full border border-dashed flex items-center justify-center text-xs ${
                            isCollected ? 'border-amber-400/40 text-amber-300' : 'border-zinc-700 text-zinc-600'
                          }`}
                        >
                          🏛️
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Motif */}
              <div className="w-full text-center mt-2">
                <h4
                  className={`text-xs font-bold truncate ${
                    isCollected ? 'text-zinc-100 group-hover:text-amber-400' : 'text-zinc-500'
                  }`}
                  title={piece.name}
                >
                  {piece.displayValue}
                </h4>
                <p className="text-[10px] text-zinc-500 line-clamp-1 italic mt-0.5">
                  {piece.motif || piece.name}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Piece Detail / Quick Mark Modal */}
      {selectedPiece && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold border shadow-inner ${
                  selectedArtifact
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
                }`}
              >
                {selectedPiece.category === 'coin' ? '🪙' : '💵'}
              </div>
              <div className="min-w-0">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    selectedArtifact
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {selectedArtifact ? '✓ Conseguida en vuestro viaje' : 'Pendiente de conseguir'}
                </span>
                <h3 className="text-sm font-bold text-white truncate mt-1">
                  {selectedPiece.name}
                </h3>
              </div>
            </div>

            {/* Official numismatic details */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                <span className="text-zinc-400">Valor facial:</span>
                <span className="text-white font-bold font-mono">
                  {selectedPiece.displayValue}
                </span>
              </div>
              {selectedPiece.motif && (
                <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                  <span className="text-zinc-400">Motivo / Grabado:</span>
                  <span className="text-zinc-200 text-right max-w-[180px] truncate">
                    {selectedPiece.motif}
                  </span>
                </div>
              )}
              {selectedPiece.material && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Composición:</span>
                  <span className="text-zinc-300 text-right max-w-[180px] truncate">
                    {selectedPiece.material}
                  </span>
                </div>
              )}
            </div>

            {/* Photo preview or upload if marking */}
            {!selectedArtifact && (
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-amber-400" /> Foto de vuestra pieza (Opcional)
                </label>
                {photoPreview ? (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    <img
                      src={photoPreview}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer border-2 border-dashed border-zinc-800 hover:border-amber-500/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <Camera className="w-5 h-5 text-amber-400" />
                    <span className="text-xs">Adjuntar foto del viaje</span>
                    <span className="text-[10px] text-zinc-500">Puedes marcarla ahora y subir foto más tarde</span>
                  </label>
                )}
              </div>
            )}

            {/* If already collected: show current photo if available */}
            {selectedArtifact?.image_front && (
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center p-1">
                <img
                  src={selectedArtifact.image_front}
                  alt={selectedArtifact.title}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cerrar
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleToggleCollected}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  selectedArtifact
                    ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                }`}
              >
                {isSubmitting ? (
                  <span>Guardando...</span>
                ) : selectedArtifact ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" /> Desmarcar
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Marcar Conseguida
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
