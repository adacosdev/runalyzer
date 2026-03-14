/**
 * Actionable Feedback List - Runalyzer
 * 
 * Displays up to 3 actionable insights from the analysis.
 */

import { ActionableInsight } from '../../domain/analysis/types';

interface ActionableFeedbackProps {
  insights: ActionableInsight[];
}

export function ActionableFeedbackList({ insights }: ActionableFeedbackProps) {
  if (insights.length === 0) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
        <p>No hay feedback específico para esta actividad.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <FeedbackCard key={insight.id} insight={insight} index={index} />
      ))}
    </div>
  );
}

interface FeedbackCardProps {
  insight: ActionableInsight;
  index: number;
}

function FeedbackCard({ insight, index }: FeedbackCardProps) {
  const getCategoryColor = () => {
    switch (insight.category) {
      case 'cardiac_drift': return 'border-l-4 border-blue-500 bg-blue-50';
      case 'zone_distribution': return 'border-l-4 border-green-500 bg-green-50';
      case 'lactate_clearance': return 'border-l-4 border-purple-500 bg-purple-50';
      case 'internal_external_load': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'rpe_mismatch': return 'border-l-4 border-red-500 bg-red-50';
      case 'data_quality': return 'border-l-4 border-gray-500 bg-gray-50';
      default: return 'border-l-4 border-gray-300 bg-gray-50';
    }
  };

  const getCategoryIcon = () => {
    switch (insight.category) {
      case 'cardiac_drift': return '❤️';
      case 'zone_distribution': return '📊';
      case 'lactate_clearance': return '🔄';
      case 'internal_external_load': return '⚖️';
      case 'rpe_mismatch': return '⚠️';
      case 'data_quality': return '📱';
      default: return '💡';
    }
  };

  const getCategoryLabel = () => {
    switch (insight.category) {
      case 'cardiac_drift': return 'Drift cardíaco';
      case 'zone_distribution': return 'Distribución de zonas';
      case 'lactate_clearance': return 'Eliminación de lactato';
      case 'internal_external_load': return 'Carga interna vs externa';
      case 'rpe_mismatch': return 'Inconsistencia de esfuerzo';
      case 'data_quality': return 'Calidad de datos';
      default: return 'Insight';
    }
  };

  return (
    <div className={`p-4 rounded-lg ${getCategoryColor()}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getCategoryIcon()}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium uppercase text-gray-500">
              {getCategoryLabel()}
            </span>
          </div>
          <h4 className="font-semibold text-gray-800 mb-1">{insight.title}</h4>
          <p className="text-sm text-gray-700">{insight.description}</p>
          {insight.recommendation && (
            <p className="text-sm text-blue-700 mt-2 font-medium">
              💡 {insight.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
