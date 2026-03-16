/**
 * Dashboard Page - Runalyzer
 * 
 * Main page showing list of recent activities.
 */

import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../../shared/store/auth.store';
import { useZonesStore } from '../../shared/store/zones.store';
import { useActivities, useHome30dSummary, syncActivities } from '../../shared/application';
import { ActivityCard, Home30dSummaryCard } from '../../features/activity/components';

export function DashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { zoneConfig } = useZonesStore();
  const needsSetup = isAuthenticated && !zoneConfig;
  const { data: activities = [], isLoading, error, refetch } = useActivities(20);
  const summaryQuery = useHome30dSummary({ enabled: !needsSetup });

  const handleSync = async () => {
    try {
      await syncActivities({ limit: 20 });
      await Promise.allSettled([refetch(), summaryQuery.refetch()]);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  if (!isAuthenticated) {
    return <OnboardingPrompt navigate={navigate} />;
  }

  if (needsSetup) {
    return <SetupPrompt navigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-card border-b border-border sticky top-0 z-10">
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
        <Home30dSummaryCard
          isLoading={summaryQuery.isLoading}
          error={summaryQuery.error ?? null}
          summary={summaryQuery.data?.summary}
          onRetry={() => {
            void summaryQuery.refetch();
          }}
        />

        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error.message}
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
                  navigate({ to: '/activity/$id', params: { id: activity.id } });
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OnboardingPrompt({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-card rounded-2xl border border-border p-8 text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏃</span>
        </div>
        <h1 className="text-2xl font-bold text-orange-500 mb-2">Runalyzer</h1>
        <p className="text-gray-400 mb-6">
          Analiza tus entrenamientos con el metodo de Luis del Águila.
          Conecta tu cuenta de Intervals.icu para empezar.
        </p>
        <button
          onClick={() => navigate({ to: '/setup' })}
          className="block w-full py-3 bg-orange-500 text-black font-medium rounded-lg hover:bg-orange-400"
        >
          Conectar Intervals.icu
        </button>
      </div>
    </div>
  );
}

function SetupPrompt({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-card rounded-2xl border border-border p-8 text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚙️</span>
        </div>
        <h1 className="text-2xl font-bold text-orange-500 mb-2">Configura tus zonas</h1>
        <p className="text-gray-400 mb-6">
          Para analizar tus entrenamientos, necesitamos configurar tus zonas de frecuencia cardiaca.
        </p>
        <button
          onClick={() => navigate({ to: '/calibrate' })}
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
