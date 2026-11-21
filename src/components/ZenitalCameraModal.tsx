import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Check, Compass } from 'lucide-react';
import { compressImage } from '../lib/imageCompressor.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob, dataUrl: string) => void;
  title?: string;
  isCircular?: boolean;
}

export const ZenitalCameraModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Captura Cenital de Recuerdo',
  isCircular = true,
}) => {
  const [pitch, setPitch] = useState<number>(0);
  const [roll, setRoll] = useState<number>(0);
  const [isLevel, setIsLevel] = useState<boolean>(false);
  const [hasOrientationSupport, setHasOrientationSupport] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Device orientation listener (Zenital Level)
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        setHasOrientationSupport(true);
        // beta is pitch (-180 to 180), gamma is roll (-90 to 90)
        // Cenital flat on table: beta ~ 0, gamma ~ 0
        const p = Math.abs(e.beta || 0);
        const r = Math.abs(e.gamma || 0);
        setPitch(e.beta || 0);
        setRoll(e.gamma || 0);

        // Level threshold within +/- 8 degrees of flat
        const level = p < 8 && r < 8;
        setIsLevel(level);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { blob, dataUrl } = await compressImage(file, 1600, 0.82);
      onCapture(blob, dataUrl);
      onClose();
    } catch (err) {
      console.error('Failed to process photo', err);
      alert('Error al procesar la imagen.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 safe-top safe-bottom">
      {/* Header */}
      <div className="w-full flex items-center justify-between text-zinc-300 py-2">
        <div className="flex items-center gap-2">
          <Compass className={`w-5 h-5 ${isLevel ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder & Gyroscope Guide */}
      <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
        {/* Reticle / Framing mask */}
        <div
          className={`relative w-64 h-64 flex items-center justify-center transition-all duration-300 ${
            isCircular
              ? 'rounded-full border-2'
              : 'rounded-2xl border-2'
          } ${
            isLevel
              ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.3)] ring-4 ring-emerald-500/20'
              : 'border-zinc-600/70'
          }`}
        >
          {/* Crosshairs */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-8 h-0.5 ${isLevel ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            <div className={`h-8 w-0.5 absolute ${isLevel ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          </div>

          {/* Artificial Horizon Bubble Indicator */}
          {hasOrientationSupport && (
            <div
              className={`w-6 h-6 rounded-full border-2 transition-transform duration-100 ${
                isLevel
                  ? 'bg-emerald-400/80 border-white shadow-lg scale-110'
                  : 'bg-amber-400/50 border-amber-300'
              }`}
              style={{
                transform: `translate(${Math.max(-40, Math.min(40, roll * 3))}px, ${Math.max(-40, Math.min(40, pitch * 3))}px)`,
              }}
            />
          )}

          {/* Guidance Status Pill */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
            {isLevel ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-medium backdrop-blur-sm animate-pulse">
                <Check className="w-3.5 h-3.5" /> ¡Nivel perfecto! Sin sombras
              </span>
            ) : hasOrientationSupport ? (
              <span className="px-3 py-1 bg-zinc-900/90 border border-zinc-700 text-zinc-400 rounded-full text-xs backdrop-blur-sm">
                Coloca el móvil plano sobre la mesa
              </span>
            ) : (
              <span className="px-3 py-1 bg-zinc-900/90 border border-zinc-700 text-zinc-400 rounded-full text-xs backdrop-blur-sm">
                Encuadra la moneda o billete en el centro
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="w-full max-w-sm flex flex-col gap-3 pb-6">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center justify-center gap-4">
          {/* Gallery Picker */}
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
              }
            }}
            className="flex flex-col items-center gap-1 text-xs text-zinc-400 hover:text-white px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800"
          >
            <ImageIcon className="w-5 h-5 text-zinc-300" />
            Galería
          </button>

          {/* Camera Trigger */}
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute('capture', 'environment');
                fileInputRef.current.click();
              }
            }}
            className={`w-18 h-18 rounded-full flex items-center justify-center border-4 transition-transform active:scale-95 shadow-xl ${
              isLevel
                ? 'bg-emerald-500 border-emerald-300 shadow-emerald-500/40'
                : 'bg-amber-500 border-amber-300 shadow-amber-500/30'
            }`}
          >
            <Camera className="w-8 h-8 text-zinc-950" />
          </button>
        </div>
        <p className="text-center text-[11px] text-zinc-500">
          Tip: Apoya la moneda sobre una servilleta o vaso para evitar reflejos.
        </p>
      </div>
    </div>
  );
};
