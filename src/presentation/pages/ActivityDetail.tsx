/**
 * Activity Detail Page - Runalyzer
 * 
 * Shows complete analysis of a single activity.
 * Dark theme with orange accents.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useActivitiesStore } from '../../store';
import { analyzeActivityUseCase } from '../../application';
import { ActivityAnalysis, getActivityStreams } from '../../domain/analysis';
import { DomainActivity } from '../../domain/activity/types';
import { 
  CardiacDriftChart, 
  ZoneDistributionBar, 
  ActionableFeedbackList,
  RPEInput,
  InjuryForm,
  ActivityCharts,
} from '../components';

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activities, getAnalysis, isLoading, error } = useActivitiesStore();
  
  const [analysis, setAnalysis] = useState<ActivityAnalysis | null>(null);
  const [activity, setActivity] = useState<DomainActivity | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [streams, setStreams] = useState<any>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);

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

      // Fetch streams for charts
      setLoadingStreams(true);
      getActivityStreams(id, ['time', 'heartrate', 'velocity_smooth', 'distance', 'altitude'])
        .then(streamData => {
          setStreams(streamData);
        })
        .catch(err => {
          console.error('Failed to load streams:', err);
        })
        .finally(() => {
          setLoadingStreams(false);
        });
    }
  }, [id, activities, getAnalysis]);

  if (!id) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="card-glow p-8 text-center">
          <p className="text-orange-500">Actividad no encontrada</p>
          <button onClick={() => navigate('/')} className="btn-glow mt-4">
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-orange-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="bg-[#111111] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-display font-semibold text-orange-500 text-lg line-clamp-1 tracking-wide">
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
        {/* Loading States */}
        {analyzing && (
          <div className="card-glow p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-orange-500">Analizando entrenamiento...</p>
          </div>
        )}

        {error && (
          <div className="card-glow p-4 text-red-400 border-red-800">
            {error}
          </div>
        )}

        {/* Activity Stats */}
        <section className="card-glow p-4">
          <h2 className="font-display text-orange-500 text-sm mb-4 tracking-wide">DATOS DE LA ACTIVIDAD</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatItem label="Distancia" value={`${(activity.distance / 1000).toFixed(2)} km`} />
            <StatItem label="Duración" value={formatDuration(activity.duration)} />
            {activity.movingTime && (
              <StatItem label="Tiempo en movimiento" value={formatDuration(activity.movingTime)} />
            )}
            <StatItem label="Ritmo promedio" value={activity.averagePace ? formatPace(activity.averagePace) + '/km' : '-'} />
            <StatItem label="FC promedio" value={activity.averageHeartrate ? `${Math.round(activity.averageHeartrate)} bpm` : '-'} />
            <StatItem label="FC máxima" value={activity.maxHeartrate ? `${Math.round(activity.maxHeartrate)} bpm` : '-'} />
            <StatItem label="Desnivel +" value={`${Math.round(activity.elevationGain)} m`} />
            <StatItem label="Desnivel -" value={`${Math.round(activity.elevationLoss)} m`} />
          </div>
        </section>

        {/* Charts - Heart Rate & Pace */}
        <section>
          <h2 className="font-display text-gray-400 text-sm mb-4 tracking-wide">GRÁFICOS</h2>
          {loadingStreams ? (
            <div className="card-glow p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-gray-500">Cargando datos...</p>
            </div>
          ) : (
            <ActivityCharts streams={streams} />
          )}
        </section>

        {/* Cardiac Drift */}
        {analysis?.cardiacDrift && (
          <section className="card-glow p-4">
            <h2 className="font-display text-orange-500 text-sm mb-4 tracking-wide">DRIFT CARDÍACO</h2>
            <CardiacDriftChart result={analysis.cardiacDrift} />
          </section>
        )}

        {/* Zone Distribution */}
        {analysis?.zoneDistribution && (
          <section className="card-glow p-4">
            <h2 className="font-display text-orange-500 text-sm mb-4 tracking-wide">DISTRIBUCIÓN DE ZONAS</h2>
            <ZoneDistributionBar distribution={analysis.zoneDistribution} />
          </section>
        )}

        {/* Actionable Feedback */}
        {analysis?.actionableFeedback && analysis.actionableFeedback.length > 0 && (
          <section className="card-glow p-4">
            <h2 className="font-display text-orange-500 text-sm mb-4 tracking-wide">FEEDBACK</h2>
            <ActionableFeedbackList insights={analysis.actionableFeedback} />
          </section>
        )}

        {/* RPE Input */}
        <section className="card-glow p-4">
          <h2 className="font-display text-orange-500 text-sm mb-4 tracking-wide">¿CÓMO TE SENTISTE?</h2>
          <RPEInput activityId={id} />
        </section>

        {/* Injury Form */}
        <section className="card-glow p-4">
          <h2 className="font-display text-orange-500 text-sm mb-4 tracking-wide">¿TENÉS ALGUNA MOLESTIA?</h2>
          <InjuryForm activityId={id} />
        </section>
      </main>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
      <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
      <p className="font-semibold text-white">{value}</p>
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
