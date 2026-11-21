import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Profile, Trip, Artifact, TripLog, TripPhoto } from './types.ts';
import { api } from './api.ts';
import { Navigation } from './components/Navigation.tsx';
import { SyncBadge } from './components/SyncBadge.tsx';
import { LoginView } from './views/LoginView.tsx';
import { CabinetView } from './views/CabinetView.tsx';
import { TripsView } from './views/TripsView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Code-split heavy views (Map, Gyroscope Camera, Trip Details)
const PassportStatsView = lazy(() =>
  import('./views/PassportStatsView.tsx').then((m) => ({ default: m.PassportStatsView }))
);
const QuickCaptureModal = lazy(() =>
  import('./views/QuickCaptureModal.tsx').then((m) => ({ default: m.QuickCaptureModal }))
);
const TripDetailView = lazy(() =>
  import('./views/TripDetailView.tsx').then((m) => ({ default: m.TripDetailView }))
);

const ViewSuspenseFallback: React.FC = () => (
  <div className="page-container max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh] text-zinc-400 gap-3">
    <div className="w-8 h-8 rounded-full border-3 border-amber-500/20 border-t-amber-500 animate-spin" />
    <span className="text-xs font-mono text-zinc-500">Cargando sección...</span>
  </div>
);

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // App data state
  const [currentTab, setCurrentTab] = useState<'cabinet' | 'trips' | 'passport'>('cabinet');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripArtifacts, setTripArtifacts] = useState<Artifact[]>([]);
  const [tripLogs, setTripLogs] = useState<TripLog[]>([]);
  const [tripPhotos, setTripPhotos] = useState<TripPhoto[]>([]);
  const [allArtifacts, setAllArtifacts] = useState<Artifact[]>([]);

  // Quick Capture Modal
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState<boolean>(false);

  // Initial Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { profile } = await api.getMe();
        setCurrentUser(profile);
      } catch {
        // Not logged in, load profiles for login screen
        try {
          const { profiles: profs } = await api.getProfiles();
          setProfiles(profs);
        } catch (e) {
          console.error('Failed to load profiles:', e);
        }
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Load app data when user is authenticated
  const loadAppData = async () => {
    try {
      const [tripsData, active, artifactsData] = await Promise.all([
        api.getTrips(),
        api.getActiveTrip(),
        api.getArtifacts(),
      ]);
      setTrips(tripsData);
      setActiveTrip(active);
      setAllArtifacts(artifactsData);
    } catch (e) {
      console.warn('Error loading app data:', e);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAppData();
    }
  }, [currentUser]);

  // Load specific trip details when selected
  useEffect(() => {
    if (selectedTrip) {
      api
        .getTripDetails(selectedTrip.id)
        .then((details) => {
          setTripArtifacts(details.artifacts);
          setTripLogs(details.logs);
          setTripPhotos(details.photos);
        })
        .catch(console.warn);
    }
  }, [selectedTrip]);

  const handleLogin = async (profileId: string, pin: string) => {
    const res = await api.login(profileId, pin);
    setCurrentUser(res.profile);
    return res.profile;
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setSelectedTrip(null);
    const { profiles: profs } = await api.getProfiles();
    setProfiles(profs);
  };

  const handleSaveTrip = async (trip: Trip) => {
    await api.saveTrip(trip);
    if (selectedTrip && selectedTrip.id === trip.id) {
      setSelectedTrip(trip);
    }
    await loadAppData();
  };

  const handleDeleteTrip = async (tripId: string) => {
    await api.deleteTrip(tripId);
    if (selectedTrip && selectedTrip.id === tripId) {
      setSelectedTrip(null);
    }
    await loadAppData();
  };

  const handleSaveLog = async (log: TripLog) => {
    await api.saveLog(log);
    if (selectedTrip) {
      const details = await api.getTripDetails(selectedTrip.id);
      setTripLogs(details.logs);
    }
    await loadAppData();
  };

  const handleSaveArtifact = async (artifact: Artifact, frontBlob?: Blob, backBlob?: Blob) => {
    await api.saveArtifact(artifact, frontBlob, backBlob);
    await loadAppData();
    if (selectedTrip && artifact.trip_id === selectedTrip.id) {
      const details = await api.getTripDetails(selectedTrip.id);
      setTripArtifacts(details.artifacts);
    }
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    await api.deleteArtifact(artifactId);
    await loadAppData();
    if (selectedTrip) {
      const details = await api.getTripDetails(selectedTrip.id);
      setTripArtifacts(details.artifacts);
    }
  };

  const handleUploadPhotos = async (files: FileList) => {
    if (!selectedTrip) return;
    for (let i = 0; i < files.length; i++) {
      await api.uploadTripPhoto(selectedTrip.id, files[i]);
    }
    const details = await api.getTripDetails(selectedTrip.id);
    setTripPhotos(details.photos);
    await loadAppData();
  };

  const handleDeletePhoto = async (photoId: string) => {
    await api.deleteTripPhoto(photoId);
    if (selectedTrip) {
      const details = await api.getTripDetails(selectedTrip.id);
      setTripPhotos(details.photos);
    }
    await loadAppData();
  };

  const handleUpdatePhoto = async (photoId: string, caption?: string, location?: string) => {
    await api.updateTripPhoto(photoId, caption, location);
    if (selectedTrip) {
      const details = await api.getTripDetails(selectedTrip.id);
      setTripPhotos(details.photos);
    }
  };

  const handleSetCoverPhoto = async (photoId: string) => {
    if (!selectedTrip) return;
    await api.setTripCoverPhoto(selectedTrip.id, photoId);
    const details = await api.getTripDetails(selectedTrip.id);
    setSelectedTrip(details.trip);
    await loadAppData();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
        <span className="text-xs font-mono">Abriendo Bitácora...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <ErrorBoundary fallbackTitle="Error en inicio de sesión">
        <LoginView
          profiles={profiles}
          onLoginSuccess={(p) => setCurrentUser(p)}
          onLogin={handleLogin}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <SyncBadge />

      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => {
          setSelectedTrip(null);
          setCurrentTab(tab);
        }}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        <ErrorBoundary fallbackTitle="Error al mostrar la sección actual">
          {selectedTrip ? (
            <Suspense fallback={<ViewSuspenseFallback />}>
              <TripDetailView
                trip={selectedTrip}
                artifacts={tripArtifacts}
                logs={tripLogs}
                photos={tripPhotos}
                currentUser={currentUser}
                profiles={profiles}
                onBack={() => setSelectedTrip(null)}
                onSaveLog={handleSaveLog}
                onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
                onSaveTrip={handleSaveTrip}
                onDeleteTrip={handleDeleteTrip}
                onUploadPhotos={handleUploadPhotos}
                onDeletePhoto={handleDeletePhoto}
                onUpdatePhoto={handleUpdatePhoto}
                onSetCoverPhoto={handleSetCoverPhoto}
                onSaveArtifact={handleSaveArtifact}
                onDeleteArtifact={handleDeleteArtifact}
              />
            </Suspense>
          ) : (
            <>
              {currentTab === 'cabinet' && (
                <CabinetView
                  artifacts={allArtifacts}
                  onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
                  onRefresh={loadAppData}
                />
              )}

              {currentTab === 'trips' && (
                <TripsView
                  trips={trips}
                  onSelectTrip={(t) => setSelectedTrip(t)}
                  onSaveTrip={handleSaveTrip}
                  onDeleteTrip={handleDeleteTrip}
                />
              )}

              {currentTab === 'passport' && (
                <Suspense fallback={<ViewSuspenseFallback />}>
                  <PassportStatsView trips={trips} artifacts={allArtifacts} />
                </Suspense>
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Modo Ruta Quick Capture Modal (Loaded on-demand) */}
      {isQuickCaptureOpen && (
        <Suspense fallback={null}>
          <QuickCaptureModal
            isOpen={isQuickCaptureOpen}
            onClose={() => setIsQuickCaptureOpen(false)}
            activeTrip={selectedTrip || activeTrip}
            onSaveArtifact={handleSaveArtifact}
          />
        </Suspense>
      )}
    </div>
  );
};
