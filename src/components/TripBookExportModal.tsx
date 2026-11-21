import React from 'react';
import { Trip, Artifact, TripLog, TripPhoto, Profile } from '../types.ts';
import { PRESEEDED_CURRENCIES } from '../lib/currenciesData.ts';
import {
  Printer,
  X,
  Calendar,
  MapPin,
  Coins,
  BookOpen,
  Camera,
  Heart,
  Wallet,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface Props {
  trip: Trip;
  artifacts: Artifact[];
  logs: TripLog[];
  photos: TripPhoto[];
  currentUser: Profile | null;
  partner1Name?: string;
  partner2Name?: string;
  onClose: () => void;
}

export const TripBookExportModal: React.FC<Props> = ({
  trip,
  artifacts,
  logs,
  photos,
  currentUser,
  partner1Name = 'Viajero 1',
  partner2Name = 'Viajera 2',
  onClose,
}) => {
  const countryConfig = PRESEEDED_CURRENCIES[trip.country_code.toUpperCase()];
  const flag = countryConfig?.flag || '🌍';
  const countryName = countryConfig?.countryName || trip.country_code;

  // Format dates
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const collectedArtifacts = artifacts.filter(
    (a) => a.category === 'coin' || a.category === 'banknote'
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex flex-col items-center p-2 sm:p-6 print:p-0 print:bg-white print:overflow-visible print:static">
      {/* Print styles injected for clean A4 printing */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #18181b !important;
          }
          nav, header, .no-print, button {
            display: none !important;
          }
          .print-book-container {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #18181b !important;
          }
          .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          .print-card-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="no-print sticky top-2 z-50 max-w-4xl w-full bg-zinc-900/95 border border-amber-500/30 rounded-2xl p-3 mb-4 shadow-2xl flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Libro de Viaje Editorial</h3>
            <p className="text-[11px] text-zinc-400">
              Vista previa para imprimir o guardar como PDF en A4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Guardar en PDF / Imprimir</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Book Container */}
      <div className="print-book-container max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col gap-8 text-zinc-100 print:text-zinc-900 print:bg-white print:border-none print:shadow-none">
        
        {/* === SECCIÓN 1: PORTADA DE LUJO === */}
        <section className="print-card-break flex flex-col items-center text-center border-b border-zinc-800/80 print:border-zinc-300 pb-8">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-wider uppercase mb-3 print:border-amber-700 print:text-amber-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bitácora de Viajes en Pareja</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white print:text-zinc-950 mb-2 font-serif">
            {trip.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400 print:text-zinc-600 mb-6 font-medium">
            <span className="flex items-center gap-1">
              <span className="text-base">{flag}</span>
              {trip.city ? `${trip.city}, ${countryName}` : countryName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400 print:text-zinc-700" />
              {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
            </span>
            {(trip.temp_min != null || trip.temp_max != null) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-sky-400 print:text-sky-800 font-semibold">
                  🌡️ {trip.temp_min != null ? `${trip.temp_min}°C` : ''}
                  {trip.temp_min != null && trip.temp_max != null ? ' a ' : ''}
                  {trip.temp_max != null ? `${trip.temp_max}°C` : ''}
                </span>
              </>
            )}
          </div>

          {/* Cover Photo Frame */}
          {trip.cover_image && (
            <div className="w-full max-h-[380px] rounded-2xl overflow-hidden border border-zinc-800 shadow-xl mb-6 print:border-zinc-300">
              <img
                src={trip.cover_image}
                alt={trip.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Summary Quote */}
          {trip.summary && (
            <blockquote className="italic text-sm text-zinc-300 print:text-zinc-700 max-w-xl border-l-2 border-amber-500 pl-4 py-1 my-2 text-left">
              "{trip.summary}"
            </blockquote>
          )}

          {/* Cost & Inclusions Card */}
          {trip.total_cost != null && trip.total_cost > 0 && (
            <div className="w-full mt-4 bg-zinc-900/60 print:bg-zinc-50 border border-zinc-800 print:border-zinc-300 rounded-2xl p-4 text-left grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider block">
                  Inversión del Viaje
                </span>
                <span className="text-xl font-black text-emerald-400 print:text-emerald-700 font-mono">
                  {trip.total_cost.toLocaleString('es-ES')} {trip.cost_currency || 'EUR'}
                </span>
                {trip.cost_notes && (
                  <p className="text-[11px] text-zinc-400 print:text-zinc-600 mt-1">
                    {trip.cost_notes}
                  </p>
                )}
              </div>

              {trip.inclusions && (
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider block mb-1">
                    Servicios Incluidos
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {trip.inclusions.split(',').map((inc, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-zinc-800 print:bg-zinc-200 text-zinc-300 print:text-zinc-800 text-[10px] font-medium"
                      >
                        {inc.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* === SECCIÓN 2: CRÓNICA DÍA A DÍA === */}
        {logs.length > 0 && (
          <section className="flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 print:border-zinc-300 pb-2">
              <BookOpen className="w-4 h-4 text-amber-400 print:text-amber-800" />
              <h2 className="text-base font-bold text-white print:text-zinc-900 uppercase tracking-wider font-serif">
                Crónica de la Aventura
              </h2>
            </div>

            <div className="flex flex-col gap-5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="print-card-break bg-zinc-900/40 print:bg-zinc-50 border border-zinc-800/80 print:border-zinc-300 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/50 print:border-zinc-200 pb-2">
                    <span className="text-xs font-black text-amber-400 print:text-amber-800 uppercase font-mono">
                      Día {log.day_number || '•'} — {log.title || 'Jornada'}
                    </span>
                    <span className="text-[10px] text-zinc-400 print:text-zinc-600 font-mono">
                      {formatDate(log.log_date)}
                    </span>
                  </div>

                  {/* Dual chronicle comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                    {/* Partner 1 */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-zinc-950/60 print:bg-white border border-zinc-800/60 print:border-zinc-200">
                      <span className="text-[10px] font-bold text-blue-400 print:text-blue-800 uppercase flex items-center gap-1">
                        {partner1Name}
                      </span>
                      <p className="text-zinc-300 print:text-zinc-800 whitespace-pre-line">
                        {log.notes_partner_1 || <span className="italic text-zinc-600 print:text-zinc-400">Sin notas registradas</span>}
                      </p>
                    </div>

                    {/* Partner 2 */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-zinc-950/60 print:bg-white border border-zinc-800/60 print:border-zinc-200">
                      <span className="text-[10px] font-bold text-rose-400 print:text-rose-800 uppercase flex items-center gap-1">
                        {partner2Name}
                      </span>
                      <p className="text-zinc-300 print:text-zinc-800 whitespace-pre-line">
                        {log.notes_partner_2 || <span className="italic text-zinc-600 print:text-zinc-400">Sin notas registradas</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* === SECCIÓN 3: ÁLBUM DE FOTOGRAFÍAS === */}
        {photos.length > 0 && (
          <section className="print-page-break flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 print:border-zinc-300 pb-2">
              <Camera className="w-4 h-4 text-amber-400 print:text-amber-800" />
              <h2 className="text-base font-bold text-white print:text-zinc-900 uppercase tracking-wider font-serif">
                Fotografías del Viaje ({photos.length})
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="print-card-break rounded-xl overflow-hidden border border-zinc-800 print:border-zinc-300 bg-zinc-900/60 print:bg-white shadow-sm flex flex-col"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={photo.medium_url || photo.image_url}
                      alt={photo.caption || 'Foto'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {(photo.caption || photo.location) && (
                    <div className="p-2 text-left">
                      {photo.caption && (
                        <p className="text-[11px] font-medium text-white print:text-zinc-900 truncate">
                          {photo.caption}
                        </p>
                      )}
                      {photo.location && (
                        <p className="text-[9px] text-amber-400 print:text-amber-800 truncate flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          {photo.location}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* === SECCIÓN 4: COLECCIÓN NUMISMÁTICA DEL VIAJE === */}
        {collectedArtifacts.length > 0 && (
          <section className="print-page-break flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 print:border-zinc-300 pb-2">
              <Coins className="w-4 h-4 text-amber-400 print:text-amber-800" />
              <h2 className="text-base font-bold text-white print:text-zinc-900 uppercase tracking-wider font-serif">
                Colección Numismática Conseguida ({collectedArtifacts.length})
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {collectedArtifacts.map((a) => (
                <div
                  key={a.id}
                  className="print-card-break p-3 rounded-xl border border-zinc-800 print:border-zinc-300 bg-zinc-900/40 print:bg-zinc-50 flex flex-col items-center text-center gap-2"
                >
                  {/* Photo or Icon */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-950 border-2 border-amber-500/40 print:border-amber-700 flex items-center justify-center">
                    {a.image_front ? (
                      <img
                        src={a.image_front}
                        alt={a.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-amber-400 print:text-amber-800 text-sm font-mono">
                        {a.denomination || '🪙'}
                      </span>
                    )}
                  </div>

                  <div className="w-full">
                    <span className="text-[10px] font-bold text-white print:text-zinc-900 block truncate">
                      {a.title}
                    </span>
                    <span className="text-[9px] text-zinc-400 print:text-zinc-600 font-mono block">
                      {a.category === 'coin' ? 'Moneda' : 'Billete'} • {a.currency_code || ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer Editorial Colophon */}
        <footer className="print-card-break border-t border-zinc-800/60 print:border-zinc-300 pt-6 mt-4 text-center text-xs text-zinc-500 print:text-zinc-600 flex items-center justify-center gap-1.5 font-medium">
          <span>Bitácora de Viajes</span>
          <span>•</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>{partner1Name} &amp; {partner2Name}</span>
        </footer>

      </div>
    </div>
  );
};
