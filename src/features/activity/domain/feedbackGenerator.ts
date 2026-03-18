/**
 * Feedback Generator - Runalyzer
 * 
 * Generates actionable insights from all analysis results.
 * Based on Luis del Águila's philosophy: training should be consistent,
 * not intense. The feedback guides users to train smarter.
 * 
 * Outputs maximum 3 insights per activity, ordered by priority.
 */

import { 
  ActivityAnalysis, 
  ActionableInsight, 
  CardiacDriftResult,
  ZoneDistribution,
  InternalExternalLoad,
  LactateClearanceResult,
  SessionType,
} from './types';
import type { ZoneConfig } from '../../setup/domain/zones.types';
import { roundTo } from './math';

interface FeedbackRuleContext {
  sessionType: SessionType;
  zoneConfig: ZoneConfig;
  activeFcMax: number | null;
  sessionFcMax: number | null;
  hasRecoverySegments: boolean;
}

/**
 * Generate actionable feedback from complete analysis
 * 
 * @param analysis - Complete activity analysis
 * @returns Array of max 3 actionable insights
 */
export function generateFeedback(
  analysis: ActivityAnalysis,
  context?: FeedbackRuleContext
): ActionableInsight[] {
  const insights: ActionableInsight[] = [];

  const intensityInsight = context
    ? generateIntensityInsight(context)
    : null;
  const hasPrimaryIntensityAlert = intensityInsight != null;

  if (intensityInsight) {
    insights.push(intensityInsight);
  }
  
  // 1. Cardiac Drift is the most important metric
  if (analysis.cardiacDrift && analysis.cardiacDrift.verdict !== 'insufficient-data') {
    const driftInsight = generateCardiacDriftInsight(analysis.cardiacDrift);
    if (driftInsight) {
      insights.push(driftInsight);
    }
  }
  
  // 2. Zone distribution
  if (
    analysis.zoneDistribution &&
    !analysis.zoneDistribution.isEstimated &&
    !(context?.sessionType === 'interval_z2' && analysis.zoneDistribution.z1Percent < 60)
  ) {
    const zoneInsight = generateZoneInsight(analysis.zoneDistribution);
    if (zoneInsight) {
      insights.push(zoneInsight);
    }
  }
  
  // 3. Internal/External load coherence
  if (analysis.internalExternalLoad) {
    const loadInsight = generateLoadInsight(analysis.internalExternalLoad);
    if (loadInsight) {
      insights.push(loadInsight);
    }
  }
  
  // 4. Lactate clearance (if intervals exist)
  if (
    analysis.lactateClearance &&
    analysis.lactateClearance.hasIntervals &&
    !hasPrimaryIntensityAlert &&
    (context?.hasRecoverySegments ?? true)
  ) {
    const lactateInsight = generateLactateInsight(analysis.lactateClearance);
    if (lactateInsight) {
      insights.push(lactateInsight);
    }
  }
  
  // 5. Data quality warning
  if (analysis.hrDataQuality.validPercent < 80) {
    insights.push({
      id: 'data-quality',
      priority: insights.length + 1,
      category: 'data_quality',
      title: 'Datos de FC incompletos',
      description: `Solo tenemos el ${roundTo(analysis.hrDataQuality.validPercent)}% de los datos de frecuencia cardíaca.`,
      relatedMetric: 'data-quality',
      recommendation: 'Asegúrate de que tu reloj registre FC durante toda la sesión.',
    });
  }
  
  // Sort by priority and return max 3
  return insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

function generateIntensityInsight(
  context: FeedbackRuleContext
): ActionableInsight | null {
  const { sessionType, zoneConfig, activeFcMax, sessionFcMax } = context;

  if (sessionType === 'interval_z2') {
    if (activeFcMax == null || activeFcMax <= zoneConfig.z2MaxHR) {
      return null;
    }

    return {
      id: 'intensity-interval-z2-high',
      priority: 0,
      category: 'zone_distribution',
      title: 'Intensidad por encima de Z2',
      description:
        `La FC máxima activa fue ${roundTo(activeFcMax)} bpm y superó tu límite de Z2 (${roundTo(zoneConfig.z2MaxHR)} bpm).`,
      relatedMetric: 'zoneDistribution',
      recommendation: 'Bajá levemente el ritmo en los bloques activos para sostener el objetivo metabólico.',
    };
  }

  if (sessionType === 'rodaje_z1' || sessionType === 'z1_warmup_cooldown') {
    if (sessionFcMax == null || sessionFcMax <= zoneConfig.z1MaxHR) {
      return null;
    }

    return {
      id: 'intensity-rodaje-z1-high',
      priority: 0,
      category: 'zone_distribution',
      title: 'Rodaje por encima de Z1',
      description:
        `La FC máxima de la sesión fue ${roundTo(sessionFcMax)} bpm y superó tu límite de Z1 (${roundTo(zoneConfig.z1MaxHR)} bpm).`,
      relatedMetric: 'zoneDistribution',
      recommendation: 'Ajustá el ritmo para mantener el rodaje realmente aeróbico.',
    };
  }

  if (sessionFcMax == null || sessionFcMax <= zoneConfig.z2MaxHR) {
    return null;
  }

  return {
    id: 'intensity-mixed-high',
    priority: 0,
    category: 'zone_distribution',
    title: 'Intensidad alta detectada',
    description:
      `La FC máxima de la sesión fue ${roundTo(sessionFcMax)} bpm y superó tu límite de Z2 (${roundTo(zoneConfig.z2MaxHR)} bpm).`,
    relatedMetric: 'zoneDistribution',
    recommendation: 'Definí mejor la intención del estímulo para evitar mezclar intensidad y recuperación sin control.',
  };
}

/**
 * Generate insight from cardiac drift result
 */
function generateCardiacDriftInsight(result: CardiacDriftResult): ActionableInsight | null {
  if (result.verdict === 'ok') {
    return {
      id: 'drift-ok',
      priority: 2,
      category: 'cardiac_drift',
      title: 'Excelente estabilidad cardíaca',
      description: result.message,
      relatedMetric: 'cardiacDrift',
    };
  }
  
  if (result.verdict === 'insufficient-data') {
    return null; // Don't generate insight for insufficient data
  }
  
  // Warning or bad - this is high priority
  const isBad = result.verdict === 'bad';
  
  return {
    id: 'drift-' + result.verdict,
    priority: 1, // Highest priority
    category: 'cardiac_drift',
    title: isBad ? 'Drift cardíaco elevado' : 'Drift cardíaco moderado',
    description: result.message,
    relatedMetric: 'cardiacDrift',
    recommendation: isBad
      ? 'Para la próxima sesión similar, reduce el ritmo 10-15 seg/km. Tu cuerpo necesita más tiempo en ese ritmo.'
      : 'Considera reducir levemente el ritmo en tu próxima sesión similar para optimizar la adaptación.',
  };
}

/**
 * Generate insight from zone distribution
 */
function generateZoneInsight(distribution: ZoneDistribution): ActionableInsight | null {
  const { z1Percent, z2Percent, z3Percent } = distribution;
  
  // Check for common issues
  if (z1Percent < 60) {
    return {
      id: 'zone-base-low',
      priority: 3,
      category: 'zone_distribution',
      title: 'Poco tiempo en zona base',
      description: `Solo ${roundTo(z1Percent)}% del tiempo estuvo en Z1. La base aeróbica es fundamental para el progreso.`,
      relatedMetric: 'zoneDistribution',
      recommendation: 'En tus rodajes suaves, enfocate en mantener un ritmo donde puedas sostener una conversación.',
    };
  }
  
  if (z2Percent > 30 && z3Percent > 20) {
    return {
      id: 'zone-intensity-high',
      priority: 3,
      category: 'zone_distribution',
      title: 'Alta proporción de intensidad',
      description: `${roundTo(z2Percent + z3Percent)}% del tiempo estuvo en Z2-Z3. Asegúrate de que sea intencional.`,
      relatedMetric: 'zoneDistribution',
      recommendation: 'Para desarrollo aeróbico sostenido, priorizá más tiempo en Z1.',
    };
  }
  
  return null;
}

/**
 * Generate insight from internal/external load
 */
function generateLoadInsight(load: InternalExternalLoad): ActionableInsight | null {
  // Look for intervals where HR was unexpectedly high for the pace
  const inefficientIntervals = load.intervals.filter(i => {
    // This is a simplified check - real implementation would use zone config
    return i.avgHR > 160 && i.avgPaceMps > 300; // Slow pace + high HR
  });
  
  if (inefficientIntervals.length > 0) {
    return {
      id: 'load-inefficient',
      priority: 4,
      category: 'internal_external_load',
      title: 'Ineficiencia detectada',
      description: `Detectamos ${inefficientIntervals.length} intervalo(s) con alta FC pero ritmo bajo.`,
      relatedMetric: 'internalExternalLoad',
      recommendation: 'Esto puede indicar fatiga acumulada o que el ritmo era muy exigente para tu estado.',
    };
  }
  
  return null;
}

/**
 * Generate insight from lactate clearance
 */
function generateLactateInsight(result: LactateClearanceResult): ActionableInsight | null {
  if (result.overallQuality === 'poor' && result.hasIntervals) {
    return {
      id: 'lactate-poor',
      priority: 4,
      category: 'lactate_clearance',
      title: 'Recuperación limitada entre intervalos',
      description: result.verdict,
      relatedMetric: 'lactateClearance',
      recommendation: 'Extiende la recuperación a 3-4 minutos o reduce la intensidad del intervalo siguiente.',
    };
  }
  
  return null;
}

/**
 * Create a summary feedback when no specific insights apply
 */
export function generateSummaryFeedback(analysis: ActivityAnalysis): string {
  const parts: string[] = [];
  
  if (analysis.cardiacDrift?.verdict === 'ok') {
    parts.push('Buen control del drift cardíaco.');
  }
  
  if (analysis.zoneDistribution) {
    const { z1Percent } = analysis.zoneDistribution;
    if (z1Percent >= 70) {
      parts.push('Excelente distribución en zona base.');
    }
  }
  
  if (parts.length === 0) {
    return 'Entrenamiento completado. Revisa los detalles para optimizar tu próxima sesión.';
  }
  
  return parts.join(' ');
}
