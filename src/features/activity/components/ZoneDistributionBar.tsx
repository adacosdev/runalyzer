/**
 * Zone Distribution Bar - Runalyzer
 * 
 * Visualizes time distribution across the 3 metabolic zones.
 */

import { ZoneDistribution } from '../domain/types';

interface ZoneDistributionBarProps {
  distribution: ZoneDistribution;
}

export function ZoneDistributionBar({ distribution }: ZoneDistributionBarProps) {
  const { z1Percent, z2Percent, z3Percent, z1Seconds, z2Seconds, z3Seconds, totalSeconds } = distribution;
  
  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Bar Chart */}
      <div className="h-8 rounded-full overflow-hidden flex">
        {z1Percent > 0 && (
          <div 
            className="bg-zone-1 transition-all duration-300"
            style={{ width: `${z1Percent}%` }}
            title={`Z1: ${z1Percent.toFixed(1)}%`}
          />
        )}
        {z2Percent > 0 && (
          <div 
            className="bg-zone-2 transition-all duration-300"
            style={{ width: `${z2Percent}%` }}
            title={`Z2: ${z2Percent.toFixed(1)}%`}
          />
        )}
        {z3Percent > 0 && (
          <div 
            className="bg-zone-3 transition-all duration-300"
            style={{ width: `${z3Percent}%` }}
            title={`Z3: ${z3Percent.toFixed(1)}%`}
          />
        )}
        {z1Percent === 0 && z2Percent === 0 && z3Percent === 0 && (
          <div className="w-full bg-gray-200" />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <ZoneBadge 
          zone={1} 
          percent={z1Percent} 
          time={formatTime(z1Seconds)}
          color="bg-zone-1"
        />
        <ZoneBadge 
          zone={2} 
          percent={z2Percent} 
          time={formatTime(z2Seconds)}
          color="bg-zone-2"
        />
        <ZoneBadge 
          zone={3} 
          percent={z3Percent} 
          time={formatTime(z3Seconds)}
          color="bg-zone-3"
        />
      </div>

      {/* Verdict */}
      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
        {distribution.verdict}
      </p>

      {/* Estimated Badge */}
      {distribution.isEstimated && (
        <div className="flex items-center gap-2 text-xs text-yellow-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l.175.005h1.32c1.36 0 2.194.823 2.194 1.868v7.183c0 1.044-.834 1.868-2.194 1.868h-1.32l-.175.005c-.765 1.36-2.722 1.36-3.486 0l-.175-.005H5.043c-1.36 0-2.194-.823-2.194-1.868V6.932c0-1.044.834-1.868 2.194-1.868h1.32l.175-.005z" clipRule="evenodd" />
          </svg>
          <span>Zonas estimadas — calibrá para mayor precisión</span>
        </div>
      )}
    </div>
  );
}

interface ZoneBadgeProps {
  zone: number;
  percent: number;
  time: string;
  color: string;
}

function ZoneBadge({ zone, percent, time, color }: ZoneBadgeProps) {
  const zoneNames: Record<number, string> = {
    1: 'Grasas',
    2: 'Umbral',
    3: 'VO2Max',
  };

  return (
    <div className="flex flex-col items-center p-2 rounded bg-gray-50">
      <div className={`w-3 h-3 rounded-full ${color} mb-1`} />
      <span className="text-xs font-medium">Z{zone}</span>
      <span className="text-xs text-gray-500">{zoneNames[zone]}</span>
      <span className="font-semibold">{percent.toFixed(1)}%</span>
      <span className="text-xs text-gray-400">{time}</span>
    </div>
  );
}
