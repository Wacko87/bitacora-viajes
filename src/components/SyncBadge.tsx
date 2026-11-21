import React, { useState, useEffect } from 'react';
import { offlineQueue } from '../lib/offlineQueue.ts';
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SyncBadge: React.FC = () => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    offlineQueue.onCountChange((count) => setPendingCount(count));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Sin conexión a Internet. Se sincronizará automáticamente cuando te conectes al Wi-Fi o datos.');
      return;
    }
    setIsSyncing(true);
    await offlineQueue.sync();
    setIsSyncing(false);
  };

  if (pendingCount === 0 && isOnline) {
    return null; // clean UI when everything is in sync
  }

  return (
    <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] left-0 right-0 z-25 bg-zinc-900/95 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs backdrop-blur-md shadow-lg">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <CloudOff className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-300 font-medium">
              Modo sin conexión {pendingCount > 0 ? `(${pendingCount} pendientes)` : ''}
            </span>
          </>
        ) : (
          <>
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-zinc-300 font-medium">
              {pendingCount} {pendingCount === 1 ? 'recuerdo pendiente' : 'recuerdos pendientes'}
            </span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1 active:scale-95 transition-all"
        >
          {isSyncing ? 'Subiendo...' : 'Sincronizar ahora'}
        </button>
      )}
    </div>
  );
};
