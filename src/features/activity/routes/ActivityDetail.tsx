/**
 * Activity Detail Page - Runalyzer
 *
 * Shows complete analysis of a single activity.
 */

import { useParams, useNavigate } from '@tanstack/react-router';
import { useActivityDetail, useActivityStreams } from '../../../shared/application';
import { useZonesStore } from '../../../shared/store/zones.store';
import { analyzeActivity } from '../domain';
import { ActivityAnalysis } from '../domain/types';
import {
  CardiacDriftChart,
  ZoneDistributionBar,
  ActionableFeedbackList,
  ActivityCharts,
  InternalExternalLoadSection,
  LactateClearanceSection,
} from '../components';

type RouteViewState = 'error' | 'loading' | 'not-found' | 'ready';

type QueryLike<T> = {
  data?: T;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  isPending?: boolean;
};

function resolveRouteViewState<TActivity, TStreams>(
  activityQuery: QueryLike<TActivity>,
  streamsQuery: QueryLike<TStreams>
): RouteViewState {
  if (activityQuery.isError || streamsQuery.isError) {
    return 'error';
  }

  if (
    activityQuery.isLoading ||
    streamsQuery.isLoading ||
    activityQuery.isPending ||
    streamsQuery.isPending
  ) {
    return 'loading';
  }

  if (!activityQuery.data) {
    return 'not-found';
  }

  return 'ready';
}

export function ActivityDetailPage() {
  const { id } = useParams({ from: '/activity/$id' });
  const navigate = useNavigate();
  const zoneConfig = useZonesStore((state) => state.zoneConfig);

  const activityQuery = useActivityDetail(id || '');
  const streamsQuery = useActivityStreams(
    id || '',
    ['time', 'heartrate', 'velocity_smooth', 'distance', 'altitude']
  );

  if (!id) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="bg-bg-card border border-border p-8 rounded-2xl text-center">
          <p className="text-orange-500">Actividad no encontrada</p>
          <button 
            onClick={() => navigate({ to: '/' })} 
            className="mt-4 px-4 py-2 bg-orange-500 text-black rounded-lg hover:bg-orange-400"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const viewState = resolveRouteViewState(activityQuery, streamsQuery);

  if (viewState === 'error') {
    const message = activityQuery.error?.message ?? streamsQuery.error?.message ?? 'No se pudo cargar la actividad';

    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="bg-bg-card border border-red-800 p-8 rounded-2xl text-center max-w-md">
          <p className="text-red-400">Error al cargar la actividad</p>
          <p className="text-gray-400 mt-2 text-sm">{message}</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="mt-4 px-4 py-2 bg-orange-500 text-black rounded-lg hover:bg-orange-400"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'loading') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="bg-bg-card border border-border p-8 rounded-2xl text-center">
          <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-orange-500">Analizando entrenamiento...</p>
        </div>
      </div>
    );
  }

  if (viewState === 'not-found') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="bg-bg-card border border-border p-8 rounded-2xl text-center">
          <p className="text-orange-500">Actividad no encontrada</p>
          <button
            onClick={() => navigate({ to: '/' })}
            className="mt-4 px-4 py-2 bg-orange-500 text-black rounded-lg hover:bg-orange-400"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const activity = activityQuery.data as NonNullable<typeof activityQuery.data>;
  const streams = streamsQuery.data ?? [];
  const hasIntervals = activity.icuIntervals.length > 0;
  const hasStreams = streams.length > 0;

  let analysis: ActivityAnalysis | null = null;
  let analysisError: string | null = null;

  try {
    analysis = analyzeActivity(activity, streams, zoneConfig);
  } catch (err) {
    analysisError = err instanceof Error ? err.message : 'No se pudo analizar la actividad';
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate({ to: '/' })}
            className="p-2 hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-orange-500 text-lg truncate">
              {activity.name || `Actividad ${id}`}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {analysisError && (
          <div className="bg-bg-card border border-red-800 p-4 text-red-400">
            {analysisError}
          </div>
        )}

        {/* Activity Stats */}
        <section className="bg-bg-card border border-border p-4">
          <h2 className="text-orange-500 text-sm mb-4">DATOS DE LA ACTIVIDAD</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatItem label="ID" value={activity.id} />
            <StatItem label="Streams" value={hasStreams ? 'Cargados' : 'Sin datos'} />
            <StatItem label="Intervalos" value={hasIntervals ? 'Disponibles' : 'No disponibles'} />
            <StatItem label="Distancia" value={`${(activity.distance / 1000).toFixed(2)} km`} />
          </div>
        </section>

        {/* Charts - Heart Rate & Pace */}
        <section>
          <h2 className="text-gray-400 text-sm mb-4">GRÁFICOS</h2>
          {hasStreams ? (
            <ActivityCharts streams={streams} />
          ) : (
            <div className="bg-bg-card border border-border p-8 text-center text-gray-500">
              No hay streams disponibles para esta actividad
            </div>
          )}
        </section>

        {!hasIntervals && (
          <section className="bg-bg-card border border-border p-4 text-gray-300">
            <h2 className="text-orange-500 text-sm mb-2">ANÁLISIS POR INTERVALOS</h2>
            <p className="text-sm">Esta actividad no tiene intervalos estructurados, por lo que este análisis no está disponible.</p>
          </section>
        )}

        {/* Cardiac Drift */}
        {analysis?.cardiacDrift && (
          <section className="bg-bg-card border border-border p-4">
            <h2 className="text-orange-500 text-sm mb-4">DRIFT CARDÍACO</h2>
            <CardiacDriftChart result={analysis.cardiacDrift} />
          </section>
        )}

        {/* Zone Distribution */}
        {analysis?.zoneDistribution && (
          <section className="bg-bg-card border border-border p-4">
            <h2 className="text-orange-500 text-sm mb-4">DISTRIBUCIÓN DE ZONAS</h2>
            <ZoneDistributionBar distribution={analysis.zoneDistribution} />
          </section>
        )}

        {/* Internal vs External Load */}
        {analysis?.internalExternalLoad && (
          <section className="bg-bg-card border border-border p-4">
            <h2 className="text-orange-500 text-sm mb-4">CARGA INTERNA VS EXTERNA</h2>
            <InternalExternalLoadSection load={analysis.internalExternalLoad} />
          </section>
        )}

        {/* Lactate Clearance */}
        {analysis?.lactateClearance && (
          <section className="bg-bg-card border border-border p-4">
            <h2 className="text-orange-500 text-sm mb-4">ELIMINACIÓN DE LACTATO</h2>
            <LactateClearanceSection clearance={analysis.lactateClearance} />
          </section>
        )}

        {/* Actionable Feedback */}
        {analysis?.actionableFeedback && analysis.actionableFeedback.length > 0 && (
          <section className="bg-bg-card border border-border p-4">
            <h2 className="text-orange-500 text-sm mb-4">FEEDBACK</h2>
            <ActionableFeedbackList insights={analysis.actionableFeedback} />
          </section>
        )}
      </main>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-secondary rounded-lg p-3 border border-border">
      <p className="text-gray-500 text-xs uppercase">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}
