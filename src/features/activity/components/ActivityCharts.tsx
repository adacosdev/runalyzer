/**
 * Activity Charts - Runalyzer
 *
 * Interactive charts for heart rate and pace over time.
 * Heart rate line is colored by zone: Z1 green, Z2 light orange, Z3 red.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useZonesStore } from '../../../shared/store/zones.store';
import { ActivityStream } from '../domain/activity.types';

interface ActivityChartsProps {
  streams?: ActivityStream[];
}

const ZONE_COLORS = {
  z1: '#10B981', // green
  z2: '#FB923C', // light orange
  z3: '#EF4444', // red
} as const;

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0)
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(secondsPerKm: number | undefined): string {
  if (!secondsPerKm || secondsPerKm === 0) return '--:--';
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function velocityToPace(velocity: number): number {
  if (velocity === 0) return 0;
  return 1000 / velocity;
}

function transformStreamsToChartData(streams?: ActivityStream[]): any[] {
  if (!streams?.length) return [];

  const time = streams.find((s) => s.type === 'time')?.data ?? [];
  const heartrate = streams.find((s) => s.type === 'heartrate')?.data;
  const velocitySmooth = streams.find((s) => s.type === 'velocity_smooth')?.data;

  if (!time.length) return [];

  return time.map((t, i) => ({
    time: t,
    timeLabel: formatTime(t),
    heartrate: heartrate?.[i],
    pace: velocitySmooth?.[i]
      ? velocityToPace(velocitySmooth[i])
      : undefined,
    paceLabel: velocitySmooth?.[i]
      ? formatPace(velocityToPace(velocitySmooth[i]))
      : undefined,
  }));
}

/**
 * Add zone-specific HR keys to each data point.
 * Each key is null when the heart rate is outside that zone,
 * which lets Recharts render disconnected segments per zone.
 */
function addZoneKeys(
  data: any[],
  z1MaxHR: number,
  z2MaxHR: number,
): any[] {
  return data.map((d) => ({
    ...d,
    hrZ1: d.heartrate != null && d.heartrate <= z1MaxHR ? d.heartrate : null,
    hrZ2:
      d.heartrate != null &&
      d.heartrate > z1MaxHR &&
      d.heartrate <= z2MaxHR
        ? d.heartrate
        : null,
    hrZ3: d.heartrate != null && d.heartrate > z2MaxHR ? d.heartrate : null,
  }));
}

/**
 * Tooltip that colors the HR value based on the active zone.
 * Zone is inferred from which zone key is non-null in the data point.
 */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const hr = d?.heartrate;
  const hrColor =
    d?.hrZ3 != null
      ? ZONE_COLORS.z3
      : d?.hrZ2 != null
        ? ZONE_COLORS.z2
        : ZONE_COLORS.z1;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-gray-400 text-sm mb-1">{d?.timeLabel}</p>
      {hr != null && (
        <p style={{ color: hrColor }} className="font-semibold">
          ❤️ {hr} bpm
        </p>
      )}
      {d?.pace && (
        <p className="text-cyan-400 font-semibold">⚡ {d.paceLabel}/km</p>
      )}
    </div>
  );
}

function ZoneLegend({
  z1MaxHR,
  z2MaxHR,
}: {
  z1MaxHR?: number;
  z2MaxHR?: number;
}) {
  const z1 = z1MaxHR || 120;
  const z2 = z2MaxHR || 150;
  return (
    <div className="flex items-center justify-center gap-6 mt-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ZONE_COLORS.z1 }} />
        <span className="text-gray-400">Z1: &lt;{z1}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ZONE_COLORS.z2 }} />
        <span className="text-gray-400">
          Z2: {z1}–{z2}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ZONE_COLORS.z3 }} />
        <span className="text-gray-400">Z3+: &gt;{z2}</span>
      </div>
    </div>
  );
}

export function ActivityCharts({ streams }: ActivityChartsProps) {
  const { zoneConfig } = useZonesStore();
  const z1MaxHR = zoneConfig?.z1MaxHR || 120;
  const z2MaxHR = zoneConfig?.z2MaxHR || 150;

  const chartData = transformStreamsToChartData(streams);
  // Zone keys are added once so both charts can reuse the same data array
  const zoneChartData = addZoneKeys(chartData, z1MaxHR, z2MaxHR);

  const hrData = chartData.filter((d) => d.heartrate !== undefined);
  const hrMin = hrData.length
    ? Math.min(...hrData.map((d) => d.heartrate))
    : 60;
  const hrMax = hrData.length
    ? Math.max(...hrData.map((d) => d.heartrate))
    : 180;

  const paceData = chartData.filter((d) => d.pace && d.pace > 0);
  const paceMin = paceData.length
    ? Math.min(...paceData.map((d) => d.pace))
    : 180;
  const paceMax = paceData.length
    ? Math.max(...paceData.map((d) => d.pace))
    : 360;

  const hasHR = hrData.length > 0;
  const hasPace = paceData.length > 0;

  if (!hasHR && !hasPace) {
    return (
      <div className="card-glow p-8 text-center">
        <p className="text-gray-500">No hay datos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasHR && (
        <div className="card-glow p-4">
          <h3 className="text-orange-500 font-display text-lg mb-4">
            FRECUENCIA CARDÍACA
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            {/*
             * IMPORTANT: Line components MUST be direct children of LineChart.
             * Recharts uses React.Children to discover chart children —
             * wrapping them in a custom component breaks registration.
             */}
            <LineChart
              data={zoneChartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                stroke="#555"
                tick={{ fill: '#555', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[
                  Math.round(hrMin * 0.9),
                  Math.round(hrMax * 1.05),
                ]}
                stroke="#555"
                tick={{ fill: '#555', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="hrZ1"
                stroke={ZONE_COLORS.z1}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="hrZ2"
                stroke={ZONE_COLORS.z2}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="hrZ3"
                stroke={ZONE_COLORS.z3}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <ZoneLegend z1MaxHR={z1MaxHR} z2MaxHR={z2MaxHR} />
        </div>
      )}

      {hasPace && (
        <div className="card-glow p-4">
          <h3 className="text-cyan-400 font-display text-lg mb-4">RITMO</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={zoneChartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                stroke="#555"
                tick={{ fill: '#555', fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[
                  Math.round(paceMax * 1.05),
                  Math.round(paceMin * 0.95),
                ]}
                reversed
                stroke="#555"
                tick={{ fill: '#555', fontSize: 12 }}
                tickFormatter={formatPace}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="pace"
                stroke="#00D4FF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
