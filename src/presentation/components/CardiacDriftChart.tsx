/**
 * Cardiac Drift Chart Component - Runalyzer
 * 
 * Visualizes heart rate drift between first and second half of activity.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CardiacDriftResult } from '../../domain/analysis/types';

interface CardiacDriftChartProps {
  result: CardiacDriftResult;
  heartRateData?: number[];
}

export function CardiacDriftChart({ result, heartRateData }: CardiacDriftChartProps) {
  if (result.verdict === 'insufficient-data') {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
        <p className="font-medium">Datos insuficientes</p>
        <p className="text-sm">{result.message}</p>
      </div>
    );
  }

  // Prepare data for chart
  const data = heartRateData 
    ? prepareChartData(heartRateData)
    : null;

  const getVerdictColor = () => {
    switch (result.verdict) {
      case 'ok': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'bad': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getVerdictBg = () => {
    switch (result.verdict) {
      case 'ok': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'bad': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className={`p-4 rounded-lg border ${getVerdictBg()}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Cardiac Drift</span>
          <span className={`text-2xl font-bold ${getVerdictColor()}`}>
            {result.driftPercent.toFixed(1)}%
          </span>
        </div>
        <p className="text-sm text-gray-700">{result.message}</p>
        {result.dataQualityWarning && (
          <p className="text-xs text-yellow-600 mt-2">{result.dataQualityWarning}</p>
        )}
      </div>

      {/* Chart */}
      {data && data.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                tickFormatter={(value) => `${Math.floor(value / 60)}m`}
                stroke="#9ca3af"
                fontSize={12}
              />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']}
                stroke="#9ca3af"
                fontSize={12}
              />
              <Tooltip 
                labelFormatter={(value) => `${Math.floor(value / 60)} min`}
                formatter={(value: number) => [`${Math.round(value)} bpm`, 'FC']}
              />
              <ReferenceLine 
                y={result.firstHalfAvgHR} 
                stroke="#10B981" 
                strokeDasharray="5 5" 
                label={{ value: '1ra mitad', fill: '#10B981', fontSize: 10 }}
              />
              <Line 
                type="monotone" 
                dataKey="hr" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <span className="text-gray-500">1ra mitad FC</span>
          <p className="font-semibold">{result.firstHalfAvgHR.toFixed(0)} bpm</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <span className="text-gray-500">2da mitad FC</span>
          <p className="font-semibold">{result.secondHalfAvgHR.toFixed(0)} bpm</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Prepare HR data for chart (downsample if needed)
 */
function prepareChartData(hrData: number[]): { time: number; hr: number }[] {
  // Downsample to max 360 points for performance
  const maxPoints = 360;
  const step = Math.ceil(hrData.length / maxPoints);
  
  const data: { time: number; hr: number }[] = [];
  
  for (let i = 0; i < hrData.length; i += step) {
    if (hrData[i] > 0) {
      data.push({ time: i, hr: hrData[i] });
    }
  }
  
  return data;
}
