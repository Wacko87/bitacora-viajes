import { Profile, Trip, Artifact, TripLog, TripPhoto } from './types.ts';
import { offlineQueue } from './lib/offlineQueue.ts';

export const api = {
  // --- Auth ---
  async getMe(): Promise<{ profile: Profile }> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  async getProfiles(): Promise<{ profiles: Profile[] }> {
    const res = await fetch('/api/auth/profiles');
    if (!res.ok) throw new Error('Failed to load profiles');
    return res.json();
  },

  async login(profileId: string, pin: string): Promise<{ success: boolean; profile: Profile }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, pin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al iniciar sesión');
    }
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
  },

  async changePin(currentPin: string, newPin: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Error al cambiar PIN');
    }
    return data;
  },

  // --- Trips ---
  async getTrips(): Promise<Trip[]> {
    try {
      const res = await fetch('/api/trips');
      if (res.ok) {
        const data = await res.json();
        await offlineQueue.setCache('trips_list', data.trips);
        return data.trips;
      }
    } catch {
      // Network failed, try local cache
    }
    const cached = await offlineQueue.getCache<Trip[]>('trips_list');
    return cached || [];
  },

  async getActiveTrip(): Promise<Trip | null> {
    try {
      const res = await fetch('/api/trips/current');
      if (res.ok) {
        const data = await res.json();
        return data.trip;
      }
    } catch {
      // offline fallback
    }
    const all = await this.getTrips();
    return all.find((t) => t.status === 'active') || null;
  },

  async getTripDetails(id: string): Promise<{ trip: Trip; artifacts: Artifact[]; logs: TripLog[]; photos: TripPhoto[] }> {
    try {
      const res = await fetch(`/api/trips/${id}`);
      if (res.ok) {
        const data = await res.json();
        const normalized = {
          trip: data.trip,
          artifacts: data.artifacts || [],
          logs: data.logs || [],
          photos: data.photos || [],
        };
        await offlineQueue.setCache(`trip_${id}`, normalized);
        return normalized;
      }
    } catch {
      // offline fallback
    }
    const cached = await offlineQueue.getCache<{ trip: Trip; artifacts: Artifact[]; logs: TripLog[]; photos: TripPhoto[] }>(`trip_${id}`);
    if (cached) return cached;
    throw new Error('Trip details unavailable offline');
  },

  // --- Photos Album ---
  async getTripPhotos(tripId: string): Promise<TripPhoto[]> {
    try {
      const res = await fetch(`/api/photos?trip_id=${tripId}`);
      if (res.ok) {
        const data = await res.json();
        return data.photos || [];
      }
    } catch {
      // offline fallback
    }
    return [];
  },

  async uploadTripPhoto(tripId: string, file: Blob, caption?: string, location?: string): Promise<TripPhoto> {
    const formData = new FormData();
    formData.append('trip_id', tripId);
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    if (location) formData.append('location', location);

    const res = await fetch('/api/photos/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al subir la fotografía');
    }

    const data = await res.json();
    return data.photo;
  },

  async updateTripPhoto(photoId: string, caption?: string, location?: string): Promise<void> {
    const res = await fetch(`/api/photos/${photoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption, location }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar foto');
    }
  },

  async deleteTripPhoto(photoId: string): Promise<void> {
    const res = await fetch(`/api/photos/${photoId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar foto');
    }
  },

  async setTripCoverPhoto(tripId: string, photoId: string): Promise<void> {
    const res = await fetch(`/api/photos/${photoId}/cover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: tripId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al establecer portada');
    }
  },

  async saveTrip(trip: Partial<Trip> & { id: string; title: string; country_code: string; start_date: string; end_date: string }): Promise<void> {
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trip),
        });
        if (res.ok) return;
      } catch {
        // Enqueue if network drop
      }
    }

    await offlineQueue.enqueue({
      id: trip.id,
      entity: 'trip',
      action: 'upsert',
      data: trip,
      timestamp: Date.now(),
    });
  },

  async refreshTripWeather(tripId: string): Promise<Trip> {
    const res = await fetch(`/api/trips/${tripId}/weather`, { method: 'POST' });
    if (!res.ok) {
      throw new Error('No se pudo actualizar el tiempo');
    }
    const data = await res.json();
    return data.trip;
  },

  async deleteTrip(id: string): Promise<void> {
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
        if (res.ok) {
          const cached = await offlineQueue.getCache<Trip[]>('trips_list');
          if (cached) {
            await offlineQueue.setCache('trips_list', cached.filter((t) => t.id !== id));
          }
          return;
        }
      } catch {
        // Enqueue offline delete
      }
    }

    await offlineQueue.enqueue({
      id,
      entity: 'trip',
      action: 'delete',
      data: { id },
      timestamp: Date.now(),
    });
  },

  // --- Artifacts ---
  async getArtifacts(tripId?: string, category?: string): Promise<Artifact[]> {
    const params = new URLSearchParams();
    if (tripId) params.append('trip_id', tripId);
    if (category) params.append('category', category);

    const cacheKey = `artifacts_${tripId || 'all'}_${category || 'all'}`;

    try {
      const res = await fetch(`/api/artifacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        await offlineQueue.setCache(cacheKey, data.artifacts);
        return data.artifacts;
      }
    } catch {
      // fallback
    }

    const cached = await offlineQueue.getCache<Artifact[]>(cacheKey);
    return cached || [];
  },

  async saveArtifact(
    artifact: Partial<Artifact> & { id: string; category: Artifact['category']; title: string },
    imageBlobFront?: Blob,
    imageBlobBack?: Blob
  ): Promise<void> {
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/artifacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(artifact),
        });

        if (res.ok) {
          if (imageBlobFront) {
            const formData = new FormData();
            formData.append('file', imageBlobFront, 'front.webp');
            await fetch(`/api/artifacts/${artifact.id}/upload?side=front`, {
              method: 'POST',
              body: formData,
            });
          }
          if (imageBlobBack) {
            const formData = new FormData();
            formData.append('file', imageBlobBack, 'back.webp');
            await fetch(`/api/artifacts/${artifact.id}/upload?side=back`, {
              method: 'POST',
              body: formData,
            });
          }
          return;
        }
      } catch {
        // network dropped, enqueue
      }
    }

    // Enqueue mutation for offline upload
    await offlineQueue.enqueue({
      id: artifact.id,
      entity: 'artifact',
      action: 'upsert',
      data: artifact,
      imageBlobFront,
      imageBlobBack,
      timestamp: Date.now(),
    });
  },

  async deleteArtifact(id: string): Promise<void> {
    if (navigator.onLine) {
      try {
        const res = await fetch(`/api/artifacts/${id}`, { method: 'DELETE' });
        if (res.ok) return;
      } catch {
        // network dropped, fallback to offline queue
      }
    }

    await offlineQueue.enqueue({
      id,
      entity: 'artifact',
      action: 'delete',
      data: { id },
      timestamp: Date.now(),
    });
  },

  // --- Trip Logs ---
  async saveLog(log: Partial<TripLog> & { id: string; trip_id: string; log_date: string }): Promise<void> {
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log),
        });
        if (res.ok) return;
      } catch {
        // enqueue
      }
    }

    await offlineQueue.enqueue({
      id: log.id,
      entity: 'log',
      action: 'upsert',
      data: log,
      timestamp: Date.now(),
    });
  },
};
