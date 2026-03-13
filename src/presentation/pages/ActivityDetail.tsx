/**
 * Activity Detail Page - Runalyzer
 * 
 * Shows complete analysis of a single activity.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useActivitiesStore } from '../../store';
import { analyzeActivityUseCase } from '../../application';
import { ActivityAnalysis } from '../../domain/analysis';
import { DomainActivity } from '../../domain/activity/types';
import { 
  CardiacDriftChart, 
  ZoneDistributionBar, 
  ActionableFeedbackList,
  RPEInput,
  InjuryForm 
} from '../components';

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activities, getAnalysis, isLoading, error } = useActivitiesStore();
  
  const [analysis, setAnalysis] = useState<ActivityAnalysis | null>(null);
  const [activity, setActivity] = useState<DomainActivity | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    // Find activity in store
    const found = activities.find(a => a.id === id);
    if (found) {
      setActivity(found);
      
      // Check for cached analysis
      const cached = getAnalysis(id);
      if (cached) {
        setAnalysis(cached);
      } else {
        // Trigger analysis
        setAnalyzing(true);
        analyzeActivityUseCase(id)
          .then(result => {
            setAnalysis(result);
          })
          .catch(err => {
            console.error('Analysis failed:', err);
          })
          .finally(() => {
            setAnalyzing(false);
          });
      }
    }
  }, [id, activities, getAnalysis]);

  if (!id) {
    return <div>Actividad no encontrada</div>;
  }

  if (!activity) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900 line-clamp-1">
              {activity.name}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date(activity.startDate).toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Analysis Status */}
        {analyzing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-blue-700">Analizando entrenamiento...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Cardiac Drift */}
        {analysis?.cardiacDrift && (
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-4">Drift Cardíaco</h2>
            <CardiacDriftChart 
              result={analysis.cardiacDrift}
              // TODO: Pass HR streams when available
            />
          </section>
        )}

        {/* Zone Distribution */}
        {analysis?.zoneDistribution && (
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-4">Distribución de Zonas</h2>
            <ZoneDistributionBar distribution={analysis.zoneDistribution} />
          </section>
        )}

        {/* Actionable Feedback */}
        {analysis?.actionableFeedback && analysis.actionableFeedback.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-4">Feedback</h2>
            <ActionableFeedbackList insights={analysis.actionableFeedback} />
          </section>
        )}

        {/* RPE Input */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4">¿Cómo te sentiste?</h2>
          <RPEInput activityId={id} />
        </section>

        {/* Injury Form */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4">¿Tenés alguna molestia?</h2>
          <InjuryForm activityId={id} />
        </section>

        {/* Activity Stats */}
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4">Datos de la actividad</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <StatItem label="Distancia" value={`${(activity.distance / 1000).toFixed(1)} km`} />
            <StatItem label="Duración" value={formatDuration(activity.duration)} />
            <StatItem label="Ritmo" value={activity.averagePace ? formatPace(activity.averagePace) + '/km' : '-'} />
            <StatItem label="FC promedio" value={activity.averageHeartrate ? `${Math.round(activity.averageHeartrate)} bpm` : '-'} />
            <StatItem label="FC máx" value={activity.maxHeartrate ? `${Math.round(activity.maxHeartrate)} bpm` : '-'} />
            <StatItem label="Desnivel +" value={`${Math.round(activity.elevationGain)} m`} />
          </div>
        </section>
      </main>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded p-3">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
