import React, { useState } from 'react';
import { Trip } from '../types.ts';
import { Calendar, MapPin, Coins, Plus, ChevronRight, X, Edit2, Trash2, AlertTriangle, Wallet, CheckCircle2, Camera, Thermometer } from 'lucide-react';
import { generateUUIDv7 } from '../lib/id.ts';
import { PRESEEDED_CURRENCIES, getCountriesByRegion } from '../lib/currenciesData.ts';

const COMMON_INCLUSIONS = [
  '✈️ Vuelos',
  '🏨 Hotel / Alojamiento',
  '🍽️ Desayuno / TI',
  '🚗 Coche alquiler',
  '🚆 Tren / Bus',
  '🎟️ Entradas / Tours',
  '⛵ Crucero / Barco',
  '🛡️ Seguro de viaje',
];

interface Props {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onSaveTrip: (trip: Trip) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
}

export const TripsView: React.FC<Props> = ({ trips, onSelectTrip, onSaveTrip, onDeleteTrip }) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [countryCode, setCountryCode] = useState('ES');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'planned'>('completed');
  const [totalCost, setTotalCost] = useState('');
  const [costCurrency, setCostCurrency] = useState('EUR');
  const [inclusions, setInclusions] = useState('');
  const [costNotes, setCostNotes] = useState('');

  const groupedCountries = getCountriesByRegion();

  const toggleInclusionTag = (tag: string) => {
    const lines = inclusions.split('\n').map((l) => l.trim()).filter(Boolean);
    const exists = lines.some((l) => l.includes(tag) || tag.includes(l));
    if (exists) {
      setInclusions(lines.filter((l) => !l.includes(tag) && !tag.includes(l)).join('\n'));
    } else {
      setInclusions(lines.length > 0 ? `${lines.join('\n')}\n• ${tag}` : `• ${tag}`);
    }
  };

  const openCreateModal = () => {
    setEditingTripId(null);
    setTitle('');
    setCountryCode('ES');
    setCity('');
    setStartDate(new Date().toISOString().substring(0, 10));
    setEndDate(new Date().toISOString().substring(0, 10));
    setSummary('');
    setStatus('completed');
    setTotalCost('');
    setCostCurrency('EUR');
    setInclusions('');
    setCostNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (trip: Trip, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTripId(trip.id);
    setTitle(trip.title);
    setCountryCode(trip.country_code);
    setCity(trip.city || '');
    setStartDate(trip.start_date);
    setEndDate(trip.end_date);
    setSummary(trip.summary || '');
    setStatus(trip.status);
    setTotalCost(trip.total_cost != null ? String(trip.total_cost) : '');
    setCostCurrency(trip.cost_currency || 'EUR');
    setInclusions(trip.inclusions || '');
    setCostNotes(trip.cost_notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !title || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const tripData: Trip = {
        id: editingTripId || generateUUIDv7(),
        title,
        country_code: countryCode.toUpperCase(),
        city: city.trim() || null,
        start_date: startDate,
        end_date: endDate,
        status,
        summary: summary.trim() || null,
        total_cost: totalCost ? parseFloat(totalCost) : null,
        cost_currency: costCurrency || 'EUR',
        inclusions: inclusions.trim() || null,
        cost_notes: costNotes.trim() || null,
        cover_image: null,
      };

      await onSaveTrip(tripData);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTrip) return;
    setIsDeleting(true);
    try {
      await onDeleteTrip(deletingTrip.id);
      setDeletingTrip(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeTrip = trips.find((t) => t.status === 'active');

  return (
    <div className="page-container max-w-lg mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            🗺️ Cuaderno de Viajes
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {trips.length} {trips.length === 1 ? 'expedición registrada' : 'expediciones registradas'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Nuevo Viaje
        </button>
      </div>

      {/* Active Trip Highlight Card */}
      {activeTrip && (
        <div
          onClick={() => onSelectTrip(activeTrip)}
          className="cursor-pointer relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border-2 border-amber-500/60 rounded-3xl p-5 shadow-xl shadow-amber-500/10 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              ● En curso ahora
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => openEditModal(activeTrip, e)}
                className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-amber-400 hover:bg-zinc-700 transition-colors"
                title="Editar viaje"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingTrip(activeTrip);
                }}
                className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-rose-400 hover:bg-zinc-700 transition-colors"
                title="Eliminar viaje"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <span className="text-2xl">{PRESEEDED_CURRENCIES[activeTrip.country_code]?.flag || '🌍'}</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">{activeTrip.title}</h3>
          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              {activeTrip.city || PRESEEDED_CURRENCIES[activeTrip.country_code]?.countryName || activeTrip.country_code}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              {activeTrip.start_date}
            </span>
            {activeTrip.total_cost != null && activeTrip.total_cost > 0 && (
              <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Wallet className="w-3.5 h-3.5" />
                {activeTrip.total_cost.toLocaleString('es-ES')} {activeTrip.cost_currency === 'EUR' ? '€' : activeTrip.cost_currency || '€'}
              </span>
            )}
            {(activeTrip.temp_min != null || activeTrip.temp_max != null) && (
              <span className="flex items-center gap-1 text-sky-300 font-medium bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 font-mono">
                <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {activeTrip.temp_min != null ? `${activeTrip.temp_min}°` : ''}
                  {activeTrip.temp_min != null && activeTrip.temp_max != null ? ' / ' : ''}
                  {activeTrip.temp_max != null ? `${activeTrip.temp_max}°C` : ''}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* All Trips List */}
      <div className="flex flex-col gap-3">
        {trips.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
            <span className="text-3xl">🧳</span>
            <p className="text-sm font-semibold text-zinc-300">Aún no hay viajes registrados</p>
            <p className="text-xs text-zinc-500 max-w-xs">
              Registra vuestro primer destino juntos para empezar a coleccionar monedas, billetes y memorias.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs active:scale-95 transition-all shadow-md shadow-amber-500/20"
            >
              Crear vuestro primer viaje
            </button>
          </div>
        ) : (
          trips.map((trip) => {
            const countryInfo = PRESEEDED_CURRENCIES[trip.country_code] || { flag: '🌍', countryName: trip.country_code };
            return (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className="group cursor-pointer bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 p-4 rounded-2xl transition-all shadow-md flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800/90 flex items-center justify-center text-2xl shadow-inner border border-zinc-700/60 shrink-0">
                    {countryInfo.flag}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors truncate">
                      {trip.title}
                    </h4>
                    <div className="flex items-center gap-2.5 text-xs text-zinc-400 mt-1 flex-wrap">
                      <span className="text-zinc-300 font-medium truncate">
                        {trip.city ? `${trip.city}, ${countryInfo.countryName}` : countryInfo.countryName}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {trip.start_date.substring(0, 7)}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-amber-500/90 font-medium shrink-0">
                        <Coins className="w-3 h-3" />
                        {trip.currency_count || 0}
                      </span>
                      {(trip.photo_count || 0) > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium shrink-0">
                          <Camera className="w-3 h-3 text-amber-400/90" />
                          {trip.photo_count}
                        </span>
                      )}
                      {trip.total_cost != null && trip.total_cost > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                          <Wallet className="w-3 h-3" />
                          {trip.total_cost.toLocaleString('es-ES')} {trip.cost_currency === 'EUR' ? '€' : trip.cost_currency || '€'}
                        </span>
                      )}
                      {(trip.temp_min != null || trip.temp_max != null) && (
                        <span className="flex items-center gap-1 text-[11px] text-sky-300 font-medium shrink-0 bg-sky-500/10 px-1.5 py-0.5 rounded-md border border-sky-500/20 font-mono">
                          <Thermometer className="w-3 h-3 text-sky-400" />
                          <span>
                            {trip.temp_min != null ? `${trip.temp_min}°` : ''}
                            {trip.temp_min != null && trip.temp_max != null ? ' / ' : ''}
                            {trip.temp_max != null ? `${trip.temp_max}°C` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => openEditModal(trip, e)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                    title="Editar viaje"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingTrip(trip);
                    }}
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    title="Eliminar viaje"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all ml-0.5" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Unified Create / Edit Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {editingTripId ? '✏️ Modificar Viaje' : '✈️ Registrar Nuevo Viaje'}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-medium">Título del viaje</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Escapada a París, Ruta por Roma, Tokio..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 mt-1 focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">País de destino</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 mt-1 focus:outline-none focus:border-amber-500/60"
                >
                  {Object.entries(groupedCountries).map(([region, countries]) => (
                    <optgroup key={region} label={region} className="bg-zinc-900 text-amber-400 font-bold">
                      {countries.map((c) => (
                        <option key={c.countryCode} value={c.countryCode} className="text-zinc-200 font-normal">
                          {c.flag} {c.countryName} ({c.currencyCode})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">Ciudad / Región</label>
                <input
                  type="text"
                  placeholder="Ej: Roma, París, Florencia, Kioto..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 mt-1 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-100 mt-1 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-100 mt-1 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">Estado del viaje</label>
                <div className="flex gap-2 mt-1">
                  {(['active', 'completed', 'planned'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        status === s
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                          : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {s === 'active' ? 'En curso' : s === 'completed' ? 'Completado' : 'Planeado'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">Resumen / Nota rápida</label>
                <input
                  type="text"
                  placeholder="Ej: Nuestro primer gran viaje juntos..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 mt-1 focus:outline-none"
                />
              </div>

              {/* Cost & Inclusions Section */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Coste total del viaje
                  </label>
                  <span className="text-[10px] text-zinc-500">Opcional</span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Ej: 1450"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-8 py-2 text-xs text-zinc-100 focus:border-amber-500/60 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-zinc-500 font-bold">
                      {costCurrency === 'EUR' ? '€' : costCurrency === 'USD' ? '$' : costCurrency}
                    </span>
                  </div>

                  <select
                    value={costCurrency}
                    onChange={(e) => setCostCurrency(e.target.value)}
                    className="w-24 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="EGP">EGP (E£)</option>
                    <option value="CHF">CHF (Fr)</option>
                  </select>
                </div>

                {/* Comment / Note regarding the price */}
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Comentario sobre el precio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Muy buena oferta de vuelos, todo incluido al 50%, etc."
                    value={costNotes}
                    onChange={(e) => setCostNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none"
                  />
                </div>

                {/* What's included */}
                <div className="mt-1">
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                    ¿Qué ha incluido el viaje? (Toca para marcar o añade notas)
                  </label>

                  {/* Quick toggle chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COMMON_INCLUSIONS.map((tag) => {
                      const isSelected = inclusions.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInclusionTag(tag)}
                          className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold shadow-sm'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          {isSelected ? `✓ ${tag}` : tag}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Detalles de lo incluido (ej: Vuelos directos con maleta, Hotel 4* en régimen TI, crucero con pensión completa...)"
                    value={inclusions}
                    onChange={(e) => setInclusions(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting
                  ? 'Guardando...'
                  : editingTripId
                  ? 'Guardar Cambios'
                  : 'Registrar Viaje'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTrip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">¿Eliminar este viaje?</h3>
                <p className="text-xs text-zinc-400">{deletingTrip.title}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              El viaje se archivará y ya no aparecerá en el cuaderno ni en el mapamundi.
            </p>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setDeletingTrip(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors shadow-md shadow-rose-600/30 active:scale-95"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
