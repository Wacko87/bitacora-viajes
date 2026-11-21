import React, { useState } from 'react';
import { Trip, Artifact, ArtifactCategory } from '../types.ts';
import { CurrencyPicker } from '../components/CurrencyPicker.tsx';
import { ZenitalCameraModal } from '../components/ZenitalCameraModal.tsx';
import { generateUUIDv7 } from '../lib/id.ts';
import { Camera, X, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTrip: Trip | null;
  onSaveArtifact: (artifact: Artifact, frontBlob?: Blob, backBlob?: Blob) => Promise<void>;
}

export const QuickCaptureModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeTrip,
  onSaveArtifact,
}) => {
  const [category, setCategory] = useState<ArtifactCategory>('coin');
  const [countryCode, setCountryCode] = useState<string>(activeTrip?.country_code || 'JP');
  const [denomination, setDenomination] = useState<string>('500');
  const [currencyCode, setCurrencyCode] = useState<string>('JPY');
  const [title, setTitle] = useState<string>('Moneda de 500 JPY');
  const [story, setStory] = useState<string>('');
  const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
  const [frontDataUrl, setFrontDataUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCurrencySelect = (cat: 'coin' | 'banknote', denom: string, currCode: string) => {
    setCategory(cat);
    setDenomination(denom);
    setCurrencyCode(currCode);
    setTitle(`${cat === 'coin' ? 'Moneda' : 'Billete'} de ${denom} ${currCode}`);
  };

  const handleCaptureFront = (blob: Blob, dataUrl: string) => {
    setFrontBlob(blob);
    setFrontDataUrl(dataUrl);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!frontDataUrl && !frontBlob) {
      alert('Por favor, toma una foto de la moneda o recuerdo.');
      return;
    }

    setIsSaving(true);
    try {
      const newArtifact: Artifact = {
        id: generateUUIDv7(),
        trip_id: activeTrip?.id || null,
        category,
        title: title || `${category} ${denomination}`,
        currency_code: category === 'coin' || category === 'banknote' ? currencyCode : null,
        denomination: category === 'coin' || category === 'banknote' ? denomination : null,
        image_front: frontDataUrl || '',
        story: story || null,
      };

      await onSaveArtifact(newArtifact, frontBlob || undefined);

      // Celebrate with subtle confetti
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#f59e0b', '#3b82f6'],
      });

      onClose();
    } catch (err) {
      console.error('Error saving artifact:', err);
      alert('Error al guardar el recuerdo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative max-h-[88vh] overflow-y-auto mb-[env(safe-area-inset-bottom,0px)] sm:mb-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold">
              ⚡
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Modo Ruta (5 Segundos)</h3>
              <p className="text-[11px] text-zinc-400">Captura rápida en plena calle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
          {(['coin', 'banknote', 'ticket', 'souvenir'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                if (cat === 'ticket') setTitle('Ticket de transporte / entrada');
                if (cat === 'souvenir') setTitle('Recuerdo / Souvenir');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                category === cat
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {cat === 'coin' ? 'Moneda' : cat === 'banknote' ? 'Billete' : cat === 'ticket' ? 'Ticket' : 'Otro'}
            </button>
          ))}
        </div>

        {/* 1. Camera Trigger Box */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-400 font-medium">1. Foto del anverso:</label>
          <div
            onClick={() => setIsCameraOpen(true)}
            className="cursor-pointer relative w-full h-36 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 flex flex-col items-center justify-center gap-2 hover:border-amber-500/60 transition-all overflow-hidden"
          >
            {frontDataUrl ? (
              <img src={frontDataUrl} alt="Vista previa" className="w-full h-full object-cover" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-zinc-300">Tocar para hacer foto con nivel</span>
                <span className="text-[10px] text-zinc-500">Giroscopio cenital sin sombras</span>
              </>
            )}

            {frontDataUrl && (
              <div className="absolute top-2 right-2 bg-emerald-500 text-zinc-950 p-1 rounded-full shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </div>
        </div>

        {/* 2. Visual Currency Picker (for coins and banknotes) */}
        {(category === 'coin' || category === 'banknote') && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">2. Toca el valor de la moneda:</label>
            <CurrencyPicker
              countryCode={countryCode}
              selectedCategory={category}
              selectedDenomination={denomination}
              onSelect={handleCurrencySelect}
              onCountryChange={(code) => setCountryCode(code)}
            />
          </div>
        )}

        {/* Quick Optional Anecdote */}
        <div>
          <label className="text-xs text-zinc-400 font-medium">
            3. Anécdota rápida <span className="text-zinc-600 font-normal">(opcional)</span>:
          </label>
          <input
            type="text"
            placeholder="Ej: Cambio del ramen en Shibuya, propina del taxi..."
            value={story}
            onChange={(e) => setStory(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 mt-1 focus:border-amber-500/60 focus:outline-none"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 mt-1"
        >
          <Sparkles className="w-4 h-4 fill-zinc-950" />
          {isSaving ? 'Guardando en la bitácora...' : 'Guardar Recuerdo (5s)'}
        </button>
      </div>

      {/* Zenital Camera with Level Bubble */}
      <ZenitalCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureFront}
        title={`Captura Cenital: ${category === 'coin' ? 'Moneda' : 'Recuerdo'}`}
        isCircular={category === 'coin'}
      />
    </div>
  );
};
