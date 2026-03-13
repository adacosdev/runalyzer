/**
 * Dashboard Page - Runalyzer
 * 
 * Main page showing list of recent activities.
 */

import { useEffect, useState } from 'react';
import { useAuthStore, useActivitiesStore, useZonesStore } from '../../store';
import { syncActivities } from '../../application';
import { ActivityCard } from '../components';

export function DashboardPage() {
  const { isAuthenticated } = useAuthStore();
  const { activities, isLoading, error, lastFetched } = useActivitiesStore();
  const { zoneConfig } = useZonesStore();
  const [needsSetup, setNeedsSetup] = useState(false);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Runalyzer</h1>
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isLoading ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
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
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏃</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Runalyzer</h1>
        <p className="text-gray-600 mb-6">
          Analizá tus entrenamientos con el método de Luis del Águila.
          Conectá tu cuenta de Intervals.icu para empezar.
        </p>
        <a
          href="#/setup"
          className="block w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Conectar Intervals.icu
        </a>
      </div>
    </div>
  );
}

function SetupPrompt() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚙️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurá tus zonas</h1>
        <p className="text-gray-600 mb-6">
          Para analizar tus entrenamientos, necesitamos configurar tus zonas de frecuencia cardíaca.
        </p>
        <a
          href="#/calibrate"
          className="block w-full py-3 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600"
        >
          Calibrar zonas
        </a>
      </div>
    </div>
  );
}

function EmptyState({ onSync, isLoading }: { onSync: () => void; isLoading: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">📭</span>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        No hay actividades
      </h2>
      <p className="text-gray-500 mb-6">
        Sincronizá con Intervals.icu para ver tus entrenamientos
      </p>
      <button
        onClick={onSync}
        disabled={isLoading}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
      >
        {isLoading ? 'Sincronizando...' : 'Sincronizar ahora'}
      </button>
    </div>
  );
}
