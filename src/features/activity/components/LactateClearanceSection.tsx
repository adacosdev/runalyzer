/**
 * Lactate Clearance Section - Runalyzer
 *
 * Renders the Luis del Águila lactate clearance analysis:
 * overall quality badge + per-recovery-interval breakdown.
 */

import { LactateClearanceResult, LactateQuality } from '../domain/types';

interface LactateClearanceSectionProps {
  clearance: LactateClearanceResult;
}

const qualityLabel: Record<LactateQuality, string> = {
  excellent: 'Excelente',
  good: 'Buena',
  poor: 'Limitada',
};

const qualityColor: Record<LactateQuality, string> = {
  excellent: 'text-green-400 bg-green-900/30 border-green-800',
  good: 'text-yellow-400 bg-yellow-900/30 border-yellow-800',
  poor: 'text-red-400 bg-red-900/30 border-red-800',
};

const intervalQualityColor: Record<LactateQuality, string> = {
  excellent: 'text-green-400',
  good: 'text-yellow-400',
  poor: 'text-red-400',
};

export function LactateClearanceSection({ clearance }: LactateClearanceSectionProps) {
  return (
    <div className="space-y-4">
      {/* Overall Quality Badge */}
      <div className={`rounded-lg p-3 border text-sm ${qualityColor[clearance.overallQuality]}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold">{qualityLabel[clearance.overallQuality]}</span>
          {clearance.averageDropPercent > 0 && (
            <span className="font-bold text-lg">{clearance.averageDropPercent.toFixed(1)}%</span>
          )}
        </div>
        <p className="text-xs opacity-90">{clearance.verdict}</p>
      </div>

      {/* Recovery Interval Breakdown */}
      {clearance.intervals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase">Intervalos de recuperación</p>
          {clearance.intervals.map((interval, index) => (
            <div
              key={`${interval.name}-${index}`}
              className="bg-bg-elevated rounded-lg p-3 border border-border text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-200 truncate">{interval.name}</span>
                <span className={`text-xs font-semibold ml-2 shrink-0 ${intervalQualityColor[interval.quality]}`}>
                  {qualityLabel[interval.quality]}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>Pico: <span className="text-gray-200">{interval.peakHR} bpm</span></span>
                <span>+1m: <span className="text-gray-200">{interval.efficiencyEndHR ?? interval.endHR} bpm</span></span>
                <span>+2m: <span className="text-gray-200">{interval.structuralEndHR ?? '-'} bpm</span></span>
                <span>
                  Caída: <span className="text-gray-200">{interval.dropBpm} bpm ({interval.dropPercent.toFixed(1)}%)</span>
                </span>
                {interval.structuralDropPercent != null && (
                  <span>
                    Caída +2m: <span className="text-gray-200">{interval.structuralDropPercent.toFixed(1)}%</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
