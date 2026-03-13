/**
 * Dashboard Page - Runalyzer
 * 
 * Main page showing list of recent activities.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useActivitiesStore, useZonesStore } from '../../store';
import { syncActivities } from '../../application';
import { ActivityCard } from '../components';

export function DashboardPage() {
  const { isAuthenticated } = useAuthStore();
  const { activities, isLoading, error, lastFetched, isCacheValid } = useActivitiesStore();
  const { zoneConfig } = useZonesStore();
  const [needsSetup, setNeedsSetup] = useState(false);

  // Auto-sync on mount if authenticated and cache is stale
  useEffect(() => {
    if (isAuthenticated && !isCacheValid() && !isLoading && activities.length === 0) {
      syncActivities({ limit: 20 }).catch(console.error);
    }
  }, [isAuthenticated]); // Only run on mount and auth change

  useEffect(() => {
    if (isAuthenticated && !zoneConfig) {
      setNeedsSetup(true);
    }
  }, [isAuthenticated, zoneConfig]);

  const handleSync = async () => {
    try {
      await syncActivities({ limit: 20 });
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  if (!isAuthenticated) {
    return <OnboardingPrompt />;
  }

  if (needsSetup) {
    return <SetupPrompt />;
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="bg-[#111111] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-orange-500">Runalyzer</h1>
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="px-4 py-2 bg-orange-500 text-black text-sm font-medium rounded-lg hover:bg-orange-400 disabled:bg-gray-600"
          >
            {isLoading ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {activities.length === 0 ? (
          <EmptyState onSync={handleSync} isLoading={isLoading} />
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onClick={() => {
                  // Navigate to activity detail
                  window.location.hash = `/activity/${activity.id}`;
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OnboardingPrompt() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111111] rounded-2xl border border-[#2A2A2A] p-8 text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏃</span>
        </div>
        <h1 className="text-2xl font-bold text-orange-500 mb-2">Runalyzer</h1>
        <p className="text-gray-400 mb-6">
          Analiza tus entrenamientos con el metodo de Luis del Águila.
          Conecta tu cuenta de Intervals.icu para empezar.
        </p>
        <button
          onClick={() => navigate('/setup')}
          className="block w-full py-3 bg-orange-500 text-black font-medium rounded-lg hover:bg-orange-400"
        >
          Conectar Intervals.icu
        </button>
      </div>
    </div>
  );
}

function SetupPrompt() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111111] rounded-2xl border border-[#2A2A2A] p-8 text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚙️</span>
        </div>
        <h1 className="text-2xl font-bold text-orange-500 mb-2">Configura tus zonas</h1>
        <p className="text-gray-400 mb-6">
          Para analizar tus entrenamientos, necesitamos configurar tus zonas de frecuencia cardiaca.
        </p>
        <button
          onClick={() => navigate('/calibrate')}
          className="block w-full py-3 bg-orange-500 text-black font-medium rounded-lg hover:bg-orange-400"
        >
          Calibrar zonas
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onSync, isLoading }: { onSync: () => void; isLoading: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">📭</span>
      </div>
      <h2 className="text-lg font-semibold text-orange-500 mb-2">
        No hay actividades
      </h2>
        <p className="text-gray-400 mb-6">
          Sincroniza con Intervals.icu para ver tus entrenamientos
        </p>
      <button
        onClick={onSync}
        disabled={isLoading}
        className="px-6 py-3 bg-orange-500 text-black font-medium rounded-lg hover:bg-orange-400 disabled:bg-gray-600"
      >
        {isLoading ? 'Sincronizando...' : 'Sincronizar ahora'}
      </button>
    </div>
  );
}
