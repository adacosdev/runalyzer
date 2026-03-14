/**
 * Activity Detail Page - Runalyzer
 * 
 * Shows complete analysis of a single activity.
 * Dark theme with orange accents.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useActivityStreams } from '../../../shared/application';
import { analyzeActivity } from '../domain';
import { DomainActivity } from '../domain/activity.types';
import { 
  CardiacDriftChart, 
  ZoneDistributionBar, 
  ActionableFeedbackList,
  ActivityCharts,
} from '../components';

// TODO: Fix types - these should come from domain analysis
type ActivityAnalysis = any;

export function ActivityDetailPage() {
  const { id } = useParams({ from: '/activity/$id' });
  const navigate = useNavigate();
  
  const [analysis, setAnalysis] = useState<ActivityAnalysis | null>(null);
  const [activity, setActivity] = useState<DomainActivity | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: streams, isLoading: loadingStreams, error } = useActivityStreams(
    id || '',
    ['time', 'heartrate', 'velocity_smooth', 'distance', 'altitude']
  );

  useEffect(() => {
    if (!id || !streams) return;
    
    setAnalyzing(true);
    
    try {
      // Analyze activity with streams
      const result = analyzeActivity(activity!, streams);
      setAnalysis(result);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [id, streams]);

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
              Actividad {id}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Loading States */}
        {(analyzing || loadingStreams) && (
          <div className="bg-bg-card border border-border p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-orange-500">Analizando entrenamiento...</p>
          </div>
        )}

        {error && (
          <div className="bg-bg-card border border-red-800 p-4 text-red-400">
            {error.message}
          </div>
        )}

        {/* Activity Stats */}
        <section className="bg-bg-card border border-border p-4">
          <h2 className="text-orange-500 text-sm mb-4">DATOS DE LA ACTIVIDAD</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatItem label="ID" value={id} />
            <StatItem label="Streams" value={streams ? 'Cargados' : 'Sin datos'} />
          </div>
        </section>

        {/* Charts - Heart Rate & Pace */}
        <section>
          <h2 className="text-gray-400 text-sm mb-4">GRÁFICOS</h2>
          {streams ? (
            <ActivityCharts streams={streams} />
          ) : (
            <div className="bg-bg-card border border-border p-8 text-center text-gray-500">
              Sin datos para graficar
            </div>
          )}
        </section>

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
