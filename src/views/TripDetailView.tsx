import React, { useState } from 'react';
import { Trip, Artifact, TripLog, Profile, TripPhoto } from '../types.ts';
import { CoinFlipCard } from '../components/CoinFlipCard.tsx';
import { TripPhotoAlbum } from '../components/TripPhotoAlbum.tsx';
import { CirculatingSeriesAlbum } from '../components/CirculatingSeriesAlbum.tsx';
import { TripBookExportModal } from '../components/TripBookExportModal.tsx';
import { PRESEEDED_CURRENCIES, getCountriesByRegion } from '../lib/currenciesData.ts';
import { ArrowLeft, Calendar, MapPin, Plus, BookOpen, Coins, X, Edit2, Trash2, AlertTriangle, Wallet, CheckCircle2, Camera, Printer, Thermometer } from 'lucide-react';
import { generateUUIDv7 } from '../lib/id.ts';

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
  trip: Trip;
  artifacts: Artifact[];
  logs: TripLog[];
  photos: TripPhoto[];
  currentUser: Profile | null;
  profiles?: Profile[];
  onBack: () => void;
  onSaveLog: (log: TripLog) => Promise<void>;
  onOpenQuickCapture: () => void;
  onSaveTrip: (trip: Trip) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
  onUploadPhotos: (files: FileList) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
  onUpdatePhoto: (photoId: string, caption?: string, location?: string) => Promise<void>;
  onSetCoverPhoto: (photoId: string) => Promise<void>;
  onSaveArtifact: (artifact: Artifact, frontBlob?: Blob, backBlob?: Blob) => Promise<void>;
  onDeleteArtifact?: (artifactId: string) => Promise<void>;
}

export const TripDetailView: React.FC<Props> = ({
  trip,
  artifacts,
  logs,
  photos,
  currentUser,
  profiles = [],
  onBack,
  onSaveLog,
  onOpenQuickCapture,
  onSaveTrip,
  onDeleteTrip,
  onUploadPhotos,
  onDeletePhoto,
  onUpdatePhoto,
  onSetCoverPhoto,
  onSaveArtifact,
  onDeleteArtifact,
}) => {
  const partner1 = profiles.find((p) => p.role === 'partner_1');
  const partner2 = profiles.find((p) => p.role === 'partner_2');
  const partner1Name = partner1?.name || 'Viajero 1';
  const partner2Name = partner2?.name || 'Viajera 2';
  const [activeTab, setActiveTab] = useState<'chronicle' | 'photos' | 'artifacts'>('chronicle');
  const [artifactsSubTab, setArtifactsSubTab] = useState<'circulating' | 'custom'>('circulating');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [dayNumber, setDayNumber] = useState<number>((logs.length || 0) + 1);
  const [logDate, setLogDate] = useState<string>(trip.start_date);
  const [logTitle, setLogTitle] = useState<string>('');
  const [notesPartner1, setNotesPartner1] = useState<string>('');
  const [notesPartner2, setNotesPartner2] = useState<string>('');

  // Trip Edit Modal state
  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [editTitle, setEditTitle] = useState(trip.title);
  const [editCountryCode, setEditCountryCode] = useState(trip.country_code);
  const [editCity, setEditCity] = useState(trip.city || '');
  const [editStartDate, setEditStartDate] = useState(trip.start_date);
  const [editEndDate, setEditEndDate] = useState(trip.end_date);
  const [editStatus, setEditStatus] = useState<'active' | 'completed' | 'planned'>(trip.status);
  const [editSummary, setEditSummary] = useState(trip.summary || '');
  const [editTotalCost, setEditTotalCost] = useState(trip.total_cost != null ? String(trip.total_cost) : '');
  const [editCostCurrency, setEditCostCurrency] = useState(trip.cost_currency || 'EUR');
  const [editInclusions, setEditInclusions] = useState(trip.inclusions || '');
  const [editCostNotes, setEditCostNotes] = useState(trip.cost_notes || '');

  // Delete Trip Dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const groupedCountries = getCountriesByRegion();
  const flag = PRESEEDED_CURRENCIES[trip.country_code]?.flag || '🌍';

  const toggleEditInclusionTag = (tag: string) => {
    const lines = editInclusions.split('\n').map((l) => l.trim()).filter(Boolean);
    const exists = lines.some((l) => l.includes(tag) || tag.includes(l));
    if (exists) {
      setEditInclusions(lines.filter((l) => !l.includes(tag) && !tag.includes(l)).join('\n'));
    } else {
      setEditInclusions(lines.length > 0 ? `${lines.join('\n')}\n• ${tag}` : `• ${tag}`);
    }
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLog) return;
    setIsSubmittingLog(true);
    try {
      const newLog: TripLog = {
        id: generateUUIDv7(),
        trip_id: trip.id,
        day_number: dayNumber,
        log_date: logDate,
        title: logTitle || `Día ${dayNumber}`,
        notes_partner_1: notesPartner1 || null,
        notes_partner_2: notesPartner2 || null,
      };

      await onSaveLog(newLog);
      setIsAddingLog(false);
      setLogTitle('');
      setNotesPartner1('');
      setNotesPartner2('');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTrip || !editTitle || !editStartDate || !editEndDate) return;

    setIsSubmittingTrip(true);
    try {
      const updatedTrip: Trip = {
        ...trip,
        title: editTitle,
        country_code: editCountryCode.toUpperCase(),
        city: editCity.trim() || null,
        start_date: editStartDate,
        end_date: editEndDate,
        status: editStatus,
        summary: editSummary.trim() || null,
        total_cost: editTotalCost ? parseFloat(editTotalCost) : null,
        cost_currency: editCostCurrency || 'EUR',
        inclusions: editInclusions.trim() || null,
        cost_notes: editCostNotes.trim() || null,
      };

      await onSaveTrip(updatedTrip);
      setIsEditTripOpen(false);
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteTrip(trip.id);
      onBack();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-container max-w-lg mx-auto flex flex-col gap-5">
      {/* Top back navigation and Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a viajes
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsBookModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all shadow-sm"
            title="Exportar libro del viaje en PDF"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Libro PDF</span>
          </button>

          <button
            onClick={() => {
              setEditTitle(trip.title);
              setEditCountryCode(trip.country_code);
              setEditCity(trip.city || '');
              setEditStartDate(trip.start_date);
              setEditEndDate(trip.end_date);
              setEditStatus(trip.status);
              setEditSummary(trip.summary || '');
              setEditTotalCost(trip.total_cost != null ? String(trip.total_cost) : '');
              setEditCostCurrency(trip.cost_currency || 'EUR');
              setEditInclusions(trip.inclusions || '');
              setEditCostNotes(trip.cost_notes || '');
              setIsEditTripOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-400 text-xs font-semibold transition-colors"
            title="Modificar viaje"
          >
            <Edit2 className="w-3.5 h-3.5" /> Editar
          </button>

          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 text-xs font-semibold transition-colors"
            title="Eliminar viaje"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Trip Header Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl shrink-0">{flag}</span>
              <h2 className="text-xl font-bold text-white truncate">{trip.title}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {trip.city ? `${trip.city}, ` : ''}{PRESEEDED_CURRENCIES[trip.country_code]?.countryName || trip.country_code}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {trip.start_date} → {trip.end_date}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                trip.status === 'active'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : trip.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {trip.status === 'active' ? 'En curso' : trip.status === 'completed' ? 'Completado' : 'Planeado'}
              </span>
              {(trip.temp_min != null || trip.temp_max != null) && (
                <span className="flex items-center gap-1 text-[11px] text-sky-300 font-medium bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 font-mono">
                  <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {trip.temp_min != null ? `Mín: ${trip.temp_min}°` : ''}
                    {trip.temp_min != null && trip.temp_max != null ? ' / ' : ''}
                    {trip.temp_max != null ? `Máx: ${trip.temp_max}°C` : ''}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {trip.summary && (
          <p className="text-xs text-zinc-300 italic border-t border-zinc-800/80 pt-2.5 leading-relaxed">
            "{trip.summary}"
          </p>
        )}

        {/* Cost & Inclusions Card */}
        {(trip.total_cost != null && trip.total_cost > 0) || trip.inclusions ? (
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-2.5 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Presupuesto & Lo Incluido
              </span>
              {trip.total_cost != null && trip.total_cost > 0 && (
                <span className="text-sm font-black text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {trip.total_cost.toLocaleString('es-ES')} {trip.cost_currency === 'EUR' ? '€' : trip.cost_currency || '€'}
                </span>
              )}
            </div>

            {trip.cost_notes && (
              <div className="text-[11px] text-zinc-300 italic bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 mt-0.5">
                <span className="text-emerald-400 font-bold not-italic">💬</span>
                <span>{trip.cost_notes}</span>
              </div>
            )}

            {trip.inclusions && (
              <div className="flex flex-col gap-1 border-t border-zinc-800/60 pt-2">
                <span className="text-[10px] text-zinc-500 font-medium">Incluido en el viaje:</span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {trip.inclusions
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item, idx) => (
                      <span
                        key={idx}
                        className="text-xs text-zinc-200 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0" />
                        {item.replace(/^[•\-\*]\s*/, '')}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-zinc-800/60 pt-2 flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-zinc-600" /> Sin coste registrado
            </span>
            <button
              onClick={() => {
                setEditTitle(trip.title);
                setEditCountryCode(trip.country_code);
                setEditCity(trip.city || '');
                setEditStartDate(trip.start_date);
                setEditEndDate(trip.end_date);
                setEditStatus(trip.status);
                setEditSummary(trip.summary || '');
                setEditTotalCost('');
                setEditCostCurrency('EUR');
                setEditInclusions('');
                setEditCostNotes('');
                setIsEditTripOpen(true);
              }}
              className="text-amber-400 hover:text-amber-300 font-medium text-[11px]"
            >
              + Añadir coste e inclusiones
            </button>
          </div>
        )}
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex bg-zinc-900/70 p-1 rounded-2xl border border-zinc-800">
        <button
          onClick={() => setActiveTab('chronicle')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'chronicle'
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Crónica ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'photos'
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> Fotos ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab('artifacts')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'artifacts'
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Coins className="w-3.5 h-3.5" /> Recuerdos ({artifacts.length})
        </button>
      </div>

      {/* Tab: Chronicle Day-by-Day */}
      {activeTab === 'chronicle' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Diario Cronológico
            </span>
            <button
              onClick={() => setIsAddingLog(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-semibold border border-zinc-700 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir Día
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 text-center text-xs text-zinc-500">
              Aún no habéis escrito las notas de este viaje. Pulsa "Añadir Día" para empezar vuestra crónica.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[11px] font-bold">
                      Día {log.day_number || 1}
                    </span>
                    <h4 className="text-sm font-bold text-zinc-100">{log.title}</h4>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">{log.log_date}</span>
                </div>

                {/* Dual Partner Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                      Versión de {partner1Name}:
                    </span>
                    <p className="text-xs text-zinc-200 mt-1 whitespace-pre-wrap">
                      {log.notes_partner_1 || <span className="text-zinc-600 italic">Sin nota aún</span>}
                    </p>
                  </div>

                  <div className="bg-pink-950/20 border border-pink-900/40 rounded-xl p-3">
                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">
                      Versión de {partner2Name}:
                    </span>
                    <p className="text-xs text-zinc-200 mt-1 whitespace-pre-wrap">
                      {log.notes_partner_2 || <span className="text-zinc-600 italic">Sin nota aún</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Photo Album */}
      {activeTab === 'photos' && (
        <TripPhotoAlbum
          tripId={trip.id}
          photos={photos}
          coverImage={trip.cover_image}
          onUploadPhotos={onUploadPhotos}
          onDeletePhoto={onDeletePhoto}
          onUpdatePhoto={onUpdatePhoto}
          onSetCoverPhoto={onSetCoverPhoto}
        />
      )}

      {/* Tab: Artifacts & Currencies */}
      {activeTab === 'artifacts' && (
        <div className="flex flex-col gap-4">
          {/* Sub-view switcher: Serie en Circulación vs Colección Completa */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setArtifactsSubTab('circulating')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  artifactsSubTab === 'circulating'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                Álbum en Circulación
              </button>
              <button
                type="button"
                onClick={() => setArtifactsSubTab('custom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  artifactsSubTab === 'custom'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Todos los Recuerdos ({artifacts.length})
              </button>
            </div>

            <button
              onClick={onOpenQuickCapture}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo Souvenir
            </button>
          </div>

          {artifactsSubTab === 'circulating' ? (
            <CirculatingSeriesAlbum
              trip={trip}
              artifacts={artifacts}
              onSaveArtifact={onSaveArtifact}
              onDeleteArtifact={onDeleteArtifact}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {artifacts.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 text-center text-xs text-zinc-500">
                  No hay recuerdos ni souvenirs guardados de este viaje. Pulsa "Nuevo Souvenir" para añadir el primero.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {artifacts.map((a) => (
                    <CoinFlipCard key={a.id} artifact={a} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Day Modal */}
      {isAddingLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={() => setIsAddingLog(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white">Añadir Crónica del Día</h3>

            <form onSubmit={handleCreateLog} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Nº Día</label>
                  <input
                    type="number"
                    value={dayNumber}
                    onChange={(e) => setDayNumber(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 mt-1 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Fecha</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-100 mt-1 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">Título del día</label>
                <input
                  type="text"
                  placeholder="Ej: Templos de Kioto y cena en callejón"
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 mt-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-blue-400 font-medium">Versión de {partner1Name}</label>
                <textarea
                  rows={2}
                  placeholder="¿Qué fue lo más memorable o divertido para ti hoy?"
                  value={notesPartner1}
                  onChange={(e) => setNotesPartner1(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 mt-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-pink-400 font-medium">Versión de {partner2Name}</label>
                <textarea
                  rows={2}
                  placeholder="¿Cuál fue su plato favorito o momento cumbre?"
                  value={notesPartner2}
                  onChange={(e) => setNotesPartner2(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 mt-1 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingLog}
                className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmittingLog ? 'Guardando...' : 'Guardar Día'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {isEditTripOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditTripOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              ✏️ Modificar Viaje
            </h3>

            <form onSubmit={handleUpdateTrip} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-medium">Título del viaje</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 mt-1 focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">País de destino</label>
                <select
                  value={editCountryCode}
                  onChange={(e) => setEditCountryCode(e.target.value)}
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
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 mt-1 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-100 mt-1 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
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
                      onClick={() => setEditStatus(s)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        editStatus === s
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
                <label className="text-xs text-zinc-400 font-medium">Resumen / Nota</label>
                <input
                  type="text"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
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
                      value={editTotalCost}
                      onChange={(e) => setEditTotalCost(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-8 py-2 text-xs text-zinc-100 focus:border-amber-500/60 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-zinc-500 font-bold">
                      {editCostCurrency === 'EUR' ? '€' : editCostCurrency === 'USD' ? '$' : editCostCurrency}
                    </span>
                  </div>

                  <select
                    value={editCostCurrency}
                    onChange={(e) => setEditCostCurrency(e.target.value)}
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
                    value={editCostNotes}
                    onChange={(e) => setEditCostNotes(e.target.value)}
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
                      const isSelected = editInclusions.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleEditInclusionTag(tag)}
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
                    value={editInclusions}
                    onChange={(e) => setEditInclusions(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/60 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingTrip}
                className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmittingTrip ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">¿Eliminar este viaje?</h3>
                <p className="text-xs text-zinc-400">{trip.title}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              El viaje se archivará y ya no aparecerá en el cuaderno ni en el mapamundi.
            </p>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors shadow-md shadow-rose-600/30 active:scale-95"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photobook Export & Print Modal */}
      {isBookModalOpen && (
        <TripBookExportModal
          trip={trip}
          artifacts={artifacts}
          logs={logs}
          photos={photos}
          currentUser={currentUser}
          partner1Name={partner1Name}
          partner2Name={partner2Name}
          onClose={() => setIsBookModalOpen(false)}
        />
      )}
    </div>
  );
};
