/**
 * Internal vs External Load Section - Runalyzer
 *
 * Renders the Luis del Águila internal/external load analysis:
 * session summary card + per-interval breakdown.
 */

import { InternalExternalLoad } from '../domain/types';

interface InternalExternalLoadSectionProps {
  load: InternalExternalLoad;
}

function formatPace(secondsPerKm: number): string {
  if (secondsPerKm <= 0) return '—';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

export function InternalExternalLoadSection({ load }: InternalExternalLoadSectionProps) {
  return (
    <div className="space-y-4">
      {/* Session Summary */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-bg-secondary rounded-lg p-3 border border-border">
          <p className="text-gray-500 text-xs uppercase">FC media sesión</p>
          <p className="font-semibold text-white">{load.sessionAvgHR > 0 ? `${load.sessionAvgHR} bpm` : '—'}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-3 border border-border">
          <p className="text-gray-500 text-xs uppercase">Ritmo medio sesión</p>
          <p className="font-semibold text-white">{formatPace(load.sessionAvgPaceMinKm)}</p>
        </div>
      </div>

      {/* Session Verdict */}
      <p className="text-sm text-gray-300 bg-bg-elevated rounded-lg p-3 border border-border">
        {load.sessionVerdict}
      </p>

      {/* Interval Breakdown */}
      {load.intervals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase">Desglose por intervalo</p>
          {load.intervals.map((interval, index) => (
            <div
              key={`${interval.name}-${index}`}
              className="bg-bg-elevated rounded-lg p-3 border border-border text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-200 truncate">{interval.name}</span>
                <span className="text-xs text-gray-500 ml-2 shrink-0">
                  Ef: {interval.hrToPaceEfficiency.toFixed(3)}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400 mb-1">
                <span>FC: <span className="text-gray-200">{interval.avgHR} bpm</span></span>
                <span>Ritmo: <span className="text-gray-200">{formatPace(interval.avgPaceMps)}</span></span>
                {interval.rpe !== undefined && (
                  <span>RPE: <span className="text-gray-200">{interval.rpe}</span></span>
                )}
              </div>
              <p className="text-xs text-gray-400">{interval.verdict}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
