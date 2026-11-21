import React, { useState } from 'react';
import { Artifact } from '../types.ts';
import { RotateCw, Sparkles } from 'lucide-react';

interface Props {
  artifact: Artifact;
  onSelect?: () => void;
}

export const CoinFlipCard: React.FC<Props> = ({ artifact, onSelect }) => {
  const [flipped, setFlipped] = useState(false);
  const isCoin = artifact.category === 'coin';
  const hasBack = Boolean(artifact.image_back);

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasBack) {
      setFlipped(!flipped);
    }
  };

  return (
    <div
      onClick={onSelect}
      className="group relative cursor-pointer flex flex-col items-center bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 transition-all duration-300 hover:border-amber-500/40 hover:bg-zinc-900/90 shadow-lg shadow-black/40"
    >
      {/* 3D Container with Perspective */}
      <div
        className="w-full aspect-square relative [perspective:1000px] flex items-center justify-center p-2"
        onClick={handleFlip}
      >
        <div
          className={`w-full h-full relative transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Front Face */}
          <div className="absolute inset-0 [backface-visibility:hidden] flex items-center justify-center">
            {/* Acrylic Capsule Visual Frame */}
            <div
              className={`relative w-full h-full flex items-center justify-center p-2 overflow-hidden ${
                isCoin
                  ? 'rounded-full border-4 border-amber-500/30 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800 shadow-[inset_0_2px_12px_rgba(251,191,36,0.15)] ring-2 ring-white/10'
                  : 'rounded-xl border-2 border-zinc-700 bg-zinc-950 shadow-md ring-1 ring-white/10'
              }`}
            >
              {artifact.image_front ? (
                <img
                  src={artifact.image_front}
                  alt={artifact.title}
                  className={`w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-105 ${
                    isCoin ? 'rounded-full' : 'rounded-lg'
                  }`}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="text-zinc-600 flex flex-col items-center gap-1">
                  <Sparkles className="w-8 h-8 text-amber-500/50" />
                  <span className="text-xs font-mono">Sin foto</span>
                </div>
              )}

              {/* Specular sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded-full" />
            </div>
          </div>

          {/* Back Face (if available) */}
          {hasBack && (
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] flex items-center justify-center">
              <div
                className={`relative w-full h-full flex items-center justify-center p-2 overflow-hidden ${
                  isCoin
                    ? 'rounded-full border-4 border-amber-500/40 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800 shadow-[inset_0_2px_12px_rgba(251,191,36,0.2)] ring-2 ring-white/10'
                    : 'rounded-xl border-2 border-zinc-700 bg-zinc-950 shadow-md ring-1 ring-white/10'
                }`}
              >
                <img
                  src={artifact.image_back!}
                  alt={`${artifact.title} (Reverso)`}
                  className={`w-full h-full object-cover select-none ${isCoin ? 'rounded-full' : 'rounded-lg'}`}
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Flip Hint Icon */}
        {hasBack && (
          <button
            onClick={handleFlip}
            className="absolute bottom-1 right-1 p-1.5 rounded-full bg-zinc-950/80 border border-zinc-700/80 text-amber-400 text-xs shadow-md backdrop-blur-sm hover:scale-110 active:scale-95 transition-all"
            title="Voltear moneda"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Metadata & Labels */}
      <div className="w-full mt-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {artifact.denomination && (
            <span className="font-bold text-amber-400 text-sm tracking-wide">
              {artifact.denomination} {artifact.currency_code}
            </span>
          )}
          {artifact.year && (
            <span className="text-[11px] text-zinc-400 font-mono">
              ({artifact.year})
            </span>
          )}
        </div>

        <h4 className="text-sm font-medium text-zinc-200 truncate mt-0.5" title={artifact.title}>
          {artifact.title}
        </h4>

        {artifact.story && (
          <p className="text-xs text-zinc-500 line-clamp-1 italic mt-0.5">
            "{artifact.story}"
          </p>
        )}
      </div>
    </div>
  );
};
