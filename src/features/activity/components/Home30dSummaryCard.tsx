import type { Home30dSummary } from '../domain';
import { formatDuration, formatPace } from '../domain/math';

interface Home30dSummaryCardProps {
  isLoading: boolean;
  error: Error | null;
  summary?: Home30dSummary;
  onRetry?: () => void;
}

export function Home30dSummaryCard({ isLoading, error, summary, onRetry }: Home30dSummaryCardProps) {
  const minHeightClass = 'min-h-[220px]';

  if (isLoading) {
    return (
      <section
        aria-live="polite"
        className={`mb-4 rounded-xl border border-border bg-bg-card p-4 ${minHeightClass}`}
        data-testid="home-30d-summary-card"
      >
        <p className="mb-4 text-sm text-gray-400">Resumen de 30 dias</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
          <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
          <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
          <div className="h-16 animate-pulse rounded-lg bg-bg-elevated" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-live="assertive"
        className={`mb-4 rounded-xl border border-red-800 bg-red-900/20 p-4 ${minHeightClass}`}
        data-testid="home-30d-summary-card"
      >
        <h2 className="mb-2 text-lg font-semibold text-red-300">No pudimos cargar el resumen de 30 dias</h2>
        <p className="mb-4 text-sm text-red-200">{error.message}</p>
        {onRetry && (
          <button
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-black hover:bg-orange-400"
            onClick={onRetry}
            type="button"
          >
            Reintentar resumen
          </button>
        )}
      </section>
    );
  }

  const safeSummary = summary ?? createEmptySummary();
  const isEmpty = safeSummary.totalRuns === 0;

  return (
    <section
      aria-label="Resumen de carrera ultimos 30 dias"
      className={`mb-4 rounded-xl border border-border bg-bg-card p-4 ${minHeightClass}`}
      data-testid="home-30d-summary-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-orange-500">Resumen de 30 dias</h2>
        <span className="text-xs text-gray-500">{safeSummary.window.windowEnd.toLocaleDateString('es-AR')}</span>
      </div>

      {isEmpty && (
        <p className="mb-4 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-gray-300">
          No hay carreras en los ultimos 30 dias.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Metric label="Corridas" value={String(safeSummary.totalRuns)} />
        <Metric label="Distancia" value={`${safeSummary.totalDistanceKm.toFixed(1)} km`} />
        <Metric label="Duracion" value={formatDuration(safeSummary.totalDurationSec)} />
        <Metric label="Ritmo" value={safeSummary.avgPaceSecPerKm === null ? '--' : `${formatPace(safeSummary.avgPaceSecPerKm)}/km`} />
        <Metric label="FC Promedio" value={safeSummary.avgHeartrateBpm === null ? '--' : `${Math.round(safeSummary.avgHeartrateBpm)} bpm`} />
        <Metric label="Muestras FC" value={String(safeSummary.hrSampleCount)} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-100">{value}</p>
    </div>
  );
}

function createEmptySummary(): Home30dSummary {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - 30);

  return {
    window: {
      windowStart,
      windowEnd: now,
      windowEvaluatedAt: now,
    },
    totalRuns: 0,
    totalDistanceKm: 0,
    totalDurationSec: 0,
    totalMovingTimeSec: 0,
    totalElevationGainM: 0,
    avgPaceSecPerKm: null,
    avgHeartrateBpm: null,
    hrSampleCount: 0,
    includedRunCount: 0,
    excludedByWindowCount: 0,
  };
}
