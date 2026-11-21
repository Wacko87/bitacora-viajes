import React, { useState } from 'react';
import { Profile } from '../types.ts';
import { Lock, User } from 'lucide-react';

interface Props {
  profiles: Profile[];
  onLoginSuccess: (profile: Profile) => void;
  onLogin: (profileId: string, pin: string) => Promise<Profile>;
}

export const LoginView: React.FC<Props> = ({ profiles, onLoginSuccess, onLogin }) => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(profiles[0] || null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (!selectedProfile && profiles.length > 0) {
      setSelectedProfile(profiles[0]);
    }
  }, [profiles, selectedProfile]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4 && selectedProfile) {
        submitLogin(selectedProfile.id, newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  const submitLogin = async (profileId: string, pinCode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await onLogin(profileId, pinCode);
      onLoginSuccess(profile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al verificar PIN');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 safe-top safe-bottom text-zinc-100">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Brand Icon */}
        <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/20 border-2 border-amber-500/40 bg-zinc-900 p-1">
          <img
            src="/logo.webp"
            alt="Bitácora de Viajes"
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Nuestra Bitácora</h1>
          <p className="text-sm text-zinc-400 mt-1">Gabinete de Recuerdos y Numismática</p>
        </div>

        {/* Profile Selector */}
        <div className="w-full flex gap-3 justify-center">
          {profiles.map((p) => {
            const isSelected = selectedProfile?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProfile(p);
                  setPin('');
                  setError(null);
                }}
                className={`flex-1 flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-zinc-900 border-amber-500/80 shadow-lg shadow-amber-500/10'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-inner"
                  style={{ backgroundColor: p.avatar_color }}
                >
                  <User className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold">{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* PIN Indicators */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Introduce tu PIN de 4 dígitos
          </span>

          <div className="flex gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > i
                    ? 'bg-amber-400 border-amber-300 scale-110 shadow-md shadow-amber-400/40'
                    : 'border-zinc-700 bg-zinc-900'
                }`}
              />
            ))}
          </div>

          {error && <span className="text-xs text-rose-400 font-medium animate-shake">{error}</span>}
        </div>

        {/* Numeric Keypad */}
        <div className="w-full grid grid-cols-3 gap-3 max-w-xs mt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              disabled={isLoading}
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 text-xl font-bold font-mono text-zinc-100 flex items-center justify-center active:scale-90 transition-all shadow-md"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            disabled={isLoading}
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 text-xl font-bold font-mono text-zinc-100 flex items-center justify-center active:scale-90 transition-all shadow-md"
          >
            0
          </button>
          <button
            disabled={isLoading}
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 text-sm font-semibold text-zinc-400 flex items-center justify-center active:scale-90 transition-all"
          >
            Borrar
          </button>
        </div>

        <p className="text-[11px] text-zinc-600 text-center">
          PIN por defecto inicial: <span className="font-mono text-zinc-500">1234</span>
        </p>
      </div>
    </div>
  );
};
