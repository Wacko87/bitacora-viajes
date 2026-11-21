import React, { useState } from 'react';
import { Landmark, Compass, Award, Plus, LogOut, User, KeyRound, X, Check } from 'lucide-react';
import { Profile } from '../types.ts';
import { api } from '../api.ts';

interface Props {
  currentTab: 'cabinet' | 'trips' | 'passport';
  onTabChange: (tab: 'cabinet' | 'trips' | 'passport') => void;
  onOpenQuickCapture: () => void;
  currentUser: Profile | null;
  onLogout: () => void;
}

export const Navigation: React.FC<Props> = ({
  currentTab,
  onTabChange,
  onOpenQuickCapture,
  currentUser,
  onLogout,
}) => {
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('El nuevo PIN debe ser exactamente de 4 dígitos numéricos');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('La confirmación del nuevo PIN no coincide');
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await api.changePin(currentPin, newPin);
      setPinSuccess(res.message || '¡PIN actualizado con éxito!');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => {
        setIsPinModalOpen(false);
        setPinSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : 'Error al cambiar PIN');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  return (
    <>
      {/* Header bar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 px-4 pb-2.5 safe-top flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/40 shadow-md shadow-amber-500/20 bg-zinc-900 shrink-0">
            <img
              src="/logo-thumb.webp"
              alt="Logo Bitácora"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 tracking-tight">Bitácora de Viajes</h1>
            <p className="text-[10px] text-zinc-400 font-mono">Gabinete Numismático</p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: `${currentUser.avatar_color}15`,
                borderColor: `${currentUser.avatar_color}40`,
                color: currentUser.avatar_color,
              }}
            >
              <User className="w-3.5 h-3.5" />
              <span>{currentUser.name}</span>
            </div>

            <button
              onClick={() => {
                setPinError(null);
                setPinSuccess(null);
                setCurrentPin('');
                setNewPin('');
                setConfirmPin('');
                setIsPinModalOpen(true);
              }}
              className="p-1.5 rounded-full text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 transition-colors"
              title="Cambiar PIN de seguridad"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Bottom Nav Bar (Mobile Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800/80 px-4 pt-1.5 safe-bottom flex items-center justify-around shadow-2xl">
        <button
          onClick={() => onTabChange('cabinet')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'cabinet' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Landmark className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Vitrina</span>
        </button>

        {/* Central Modo Ruta Action Button */}
        <button
          onClick={onOpenQuickCapture}
          className="relative -top-4 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-4 border-zinc-950 active:scale-95 transition-transform"
          title="Captura Rápida en Ruta (5s)"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>

        <button
          onClick={() => onTabChange('trips')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'trips' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Viajes</span>
        </button>

        <button
          onClick={() => onTabChange('passport')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            currentTab === 'passport' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Award className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight">Pasaporte</span>
        </button>
      </nav>

      {/* Change PIN Security Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={() => setIsPinModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cambiar PIN de Acceso</h3>
                <p className="text-[11px] text-zinc-400">Perfil: {currentUser?.name}</p>
              </div>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {pinError}
              </div>
            )}

            {pinSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {pinSuccess}
              </div>
            )}

            <form onSubmit={handleUpdatePin} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-medium">PIN actual (4 dígitos)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-center tracking-widest text-base text-zinc-100 mt-1 focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">Nuevo PIN (4 dígitos)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-center tracking-widest text-base text-zinc-100 mt-1 focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium">Confirmar nuevo PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-center tracking-widest text-base text-zinc-100 mt-1 focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPin}
                className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isUpdatingPin ? 'Actualizando PIN...' : 'Guardar Nuevo PIN'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
