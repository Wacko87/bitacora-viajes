import React, { useState, useRef } from 'react';
import { TripPhoto } from '../types.ts';
import {
  Camera,
  Plus,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Star,
  MapPin,
  Edit2,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

interface Props {
  tripId: string;
  photos: TripPhoto[];
  coverImage?: string | null;
  onUploadPhotos: (files: FileList) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
  onUpdatePhoto: (photoId: string, caption?: string, location?: string) => Promise<void>;
  onSetCoverPhoto: (photoId: string) => Promise<void>;
}

export const TripPhotoAlbum: React.FC<Props> = ({
  tripId,
  photos,
  coverImage,
  onUploadPhotos,
  onDeletePhoto,
  onUpdatePhoto,
  onSetCoverPhoto,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      await onUploadPhotos(e.target.files);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    const p = photos[index];
    setEditCaption(p.caption || '');
    setEditLocation(p.location || '');
    setIsEditingMeta(false);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
    setIsEditingMeta(false);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex === null) return;
    const nextIdx = selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1;
    openLightbox(nextIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex === null) return;
    const nextIdx = selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0;
    openLightbox(nextIdx);
  };

  const handleSaveMeta = async () => {
    if (!selectedPhoto) return;
    await onUpdatePhoto(selectedPhoto.id, editCaption, editLocation);
    setIsEditingMeta(false);
  };

  const handleDelete = async () => {
    if (!selectedPhoto) return;
    setIsDeleting(true);
    try {
      await onDeletePhoto(selectedPhoto.id);
      if (photos.length <= 1) {
        closeLightbox();
      } else {
        const nextIdx = selectedIndex! >= photos.length - 1 ? photos.length - 2 : selectedIndex!;
        openLightbox(Math.max(0, nextIdx));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">
            Álbum de Recuerdos ({photos.length})
          </h3>
        </div>

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              <span>Subiendo...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Fotos</span>
            </>
          )}
        </button>
      </div>

      {/* Photos Grid or Empty State */}
      {photos.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-900/40 rounded-3xl p-8 text-center flex flex-col items-center gap-3 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-zinc-800/80 flex items-center justify-center text-amber-400">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200">El álbum aún no tiene fotos</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Sube las mejores capturas de vuestro viaje juntos para revivirlas siempre que queráis.
            </p>
          </div>
          <button
            type="button"
            className="mt-1 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-400" /> Seleccionar fotos del carrete
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {photos.map((photo, idx) => {
            const isCover = coverImage === photo.image_url;
            return (
              <div
                key={photo.id}
                onClick={() => openLightbox(idx)}
                className="group relative cursor-pointer aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/80 hover:border-amber-500/50 shadow-md transition-all hover:scale-[1.02]"
              >
                <img
                  src={photo.thumb_url || photo.image_url}
                  srcSet={
                    photo.thumb_url
                      ? `${photo.thumb_url} 400w, ${photo.medium_url || photo.image_url} 800w, ${photo.image_url} 1600w`
                      : undefined
                  }
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px"
                  alt={photo.caption || 'Foto del viaje'}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-105"
                />

                {/* Cover badge */}
                {isCover && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-zinc-950" /> Portada
                  </div>
                )}

                {/* Caption / Location pill on hover / overlay */}
                {(photo.caption || photo.location) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 text-left">
                    {photo.caption && (
                      <p className="text-[11px] font-medium text-white truncate drop-shadow-sm">
                        {photo.caption}
                      </p>
                    )}
                    {photo.location && (
                      <p className="text-[10px] text-amber-400/90 truncate flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        {photo.location}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200"
        >
          {/* Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between text-zinc-300 z-10"
          >
            <div className="text-xs font-mono font-medium text-zinc-400">
              {selectedIndex! + 1} / {photos.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSetCoverPhoto(selectedPhoto.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  coverImage === selectedPhoto.image_url
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-amber-400'
                }`}
                title="Usar como foto de portada del viaje"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    coverImage === selectedPhoto.image_url ? 'fill-zinc-950' : ''
                  }`}
                />
                <span className="hidden sm:inline">Portada</span>
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                title="Eliminar fotografía"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={closeLightbox}
                className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Central High-Res Image View with Navigation */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex-1 flex items-center justify-center min-h-0 my-2"
          >
            <img
              src={selectedPhoto.image_url}
              srcSet={
                selectedPhoto.medium_url
                  ? `${selectedPhoto.medium_url} 800w, ${selectedPhoto.image_url} 1600w`
                  : undefined
              }
              sizes="(max-width: 768px) 100vw, 1600px"
              alt={selectedPhoto.caption || 'Foto del viaje'}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
              decoding="async"
            />

            {/* Left Prev Arrow */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white backdrop-blur-sm transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Right Next Arrow */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white backdrop-blur-sm transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Caption & Location Footer */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 max-w-lg mx-auto w-full z-10"
          >
            {isEditingMeta ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Pie de foto / recuerdo (ej: Atardecer en el Nilo)..."
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Lugar (ej: Luxor, Egipto)..."
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" /> Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMeta(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {selectedPhoto.caption || (
                      <span className="text-zinc-500 italic">Sin pie de foto</span>
                    )}
                  </p>
                  {selectedPhoto.location && (
                    <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {selectedPhoto.location}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingMeta(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium shrink-0 transition-colors"
                >
                  <Edit2 className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px]">Editar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
