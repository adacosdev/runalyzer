/**
 * Analysis Types - Runalyzer
 * 
 * Results from the analysis engine based on Luis del Águila methodology.
 * All these types are pure data structures with no dependencies.
 */

export type SessionType = 'interval_z2' | 'rodaje_z1' | 'z1_warmup_cooldown' | 'mixed';
export type AnalysisReasonCode =
  | 'ok'
  | 'pace-missing'
  | 'pace-invalid-nonpositive'
  | 'trim-window-empty'
  | 'trim-window-too-short'
  | 'missing-main-z2-block'
  | 'checkpoint-unavailable-outside-window'
  | 'missing-heart-rate-stream'
  | 'peak-window-missing'
  | 'insufficient-data';
export type ConfidenceMarker = 'exact' | 'fallback_nearest_3s' | 'unavailable';
export type SourceAuthority = 'local_primary' | 'secondary_reference' | 'local_unavailable';

/**
 * Result of Cardiac Drift analysis
 * 
 * Measures the stability of heart rate during constant pace effort.
 * Based on Luis del Águila's methodology: drift >4% indicates 
 * the body is not adapted to the pace.
 */
export interface CardiacDriftResult {
  /** Analysis verdict */
  verdict: CardiacDriftVerdict;
  /** Drift percentage (second half vs first half HR) */
  driftPercent: number;
  /** Average HR in first half of the activity */
  firstHalfAvgHR: number;
  /** Average HR in second half of the activity */
  secondHalfAvgHR: number;
  /** Human-readable message explaining the result */
  message: string;
  /** Warning if data quality is poor */
  dataQualityWarning?: string;
  /** Number of valid data points used */
  validDataPoints: number;
  /** v2 metadata for explainability */
  reasonCode?: AnalysisReasonCode;
  /** v2 metadata for source authority */
  sourceAuthority?: SourceAuthority;
  /** v2 metadata for trim policy */
  policyApplied?: 'interval_5_5' | 'rodaje_10_10';
  /** v2 metadata for window used in drift */
  analysisWindow?: {
    startSec: number;
    endSec: number;
    durationSec: number;
  };
  /** v2 metadata for Intervals.icu decoupling reference */
  externalReference?: {
    intervalsIcuDecouplingPercent: number | null;
  };
}

export type CardiacDriftVerdict = 
  | 'ok'        // Drift < 4% - good adaptation
  | 'warning'   // Drift 4-8% - moderate drift
  | 'bad'       // Drift > 8% - poor adaptation
  | 'insufficient-data'; // Not enough data to analyze

/**
 * Distribution of time across the 3 metabolic zones
 * 
 * Based on Luis del Águila's 3-zone model:
 * - Z1 (Fats): Base endurance, easy running
 * - Z2 (Glycogen/Lactate): Threshold training
 * - Z3 (VO2Max): High intensity intervals
 */
export interface ZoneDistribution {
  /** Time in Z1 in seconds */
  z1Seconds: number;
  /** Time in Z2 in seconds */
  z2Seconds: number;
  /** Time in Z3 in seconds */
  z3Seconds: number;
  
  /** Percentage of total time in Z1 */
  z1Percent: number;
  /** Percentage of total time in Z2 */
  z2Percent: number;
  /** Percentage of total time in Z3 */
  z3Percent: number;
  
  /** Total analyzed time in seconds */
  totalSeconds: number;
  
  /** Verdict based on expected zone distribution */
  verdict: string;
  
  /** Whether zones are estimated (user hasn't calibrated) */
  isEstimated: boolean;
}

/**
 * Lactate Clearance analysis
 * 
 * Analyzes heart rate recovery in 3-minute windows between intervals.
 * Based on Luis del Águila's methodology: fast HR drop indicates
 * efficient lactate recycling.
 */
export interface LactateClearanceResult {
  /** Analysis for each recovery interval */
  intervals: RecoveryInterval[];
  
  /** Average drop percentage across all recovery intervals */
  averageDropPercent: number;
  
  /** Overall quality assessment */
  overallQuality: LactateQuality;
  
  /** Human-readable verdict */
  verdict: string;
  
  /** Whether the activity has intervals to analyze */
  hasIntervals: boolean;
  /** v2 metadata for explainability */
  reasonCode?: AnalysisReasonCode;
}

export interface RecoveryInterval {
  /** Interval name */
  name: string;
  /** Peak HR during the hard effort before recovery */
  peakHR: number;
  /** HR at the end of recovery window */
  endHR: number;
  /** Absolute HR drop in BPM */
  dropBpm: number;
  /** Percentage drop from peak */
  dropPercent: number;
  /** Quality assessment for this recovery */
  quality: LactateQuality;
  /** v2 metadata for checkpoint confidence */
  confidence?: ConfidenceMarker;
  /** v2 metadata for explainability */
  reasonCode?: AnalysisReasonCode;
}

export type LactateQuality = 'excellent' | 'good' | 'poor';

/**
 * Internal vs External Load analysis
 * 
 * Cross-references pace (external load) with heart rate response
 * (internal load) to determine if the session was executed efficiently.
 */
export interface InternalExternalLoad {
  /** Analysis for each interval or split */
  intervals: LoadInterval[];
  
  /** Session average pace in min:sec/km format as number (seconds per km) */
  sessionAvgPaceMinKm: number;
  /** Session average HR */
  sessionAvgHR: number;
  
  /** Overall session verdict */
  sessionVerdict: string;
}

export interface LoadInterval {
  /** Interval name */
  name: string;
  /** Average pace in seconds per km */
  avgPaceMps: number;
  /** Average HR during interval */
  avgHR: number;
  /** RPE if provided by user */
  rpe?: number;
  /** HR per unit pace efficiency */
  hrToPaceEfficiency: number;
  /** Verdict for this interval */
  verdict: string;
}

/**
 * Actionable insight generated from the analysis
 * 
 * Max 3 insights per activity, ordered by priority.
 */
export interface ActionableInsight {
  /** Unique identifier */
  id: string;
  /** Priority: 1 = highest */
  priority: number;
  /** Category of the insight */
  category: InsightCategory;
  /** Short title */
  title: string;
  /** Detailed explanation */
  description: string;
  /** Specific metric this relates to */
  relatedMetric?: string;
  /** Recommendation for next similar session */
  recommendation?: string;
}

export type InsightCategory = 
  | 'cardiac_drift'
  | 'zone_distribution'
  | 'lactate_clearance'
  | 'internal_external_load'
  | 'rpe_mismatch'
  | 'data_quality';

/**
 * Complete activity analysis result
 * 
 * This is the main output of the analysis engine.
 */
export interface ActivityAnalysis {
  /** Activity ID this analysis belongs to */
  activityId: string;
  /** Timestamp when analysis was generated */
  analyzedAt: number;
  
  /** Level of data available for this activity */
  dataAvailability: DataAvailability;
  
  /** Cardiac Drift result */
  cardiacDrift: CardiacDriftResult | null;
  /** Zone Distribution result */
  zoneDistribution: ZoneDistribution | null;
  /** Internal/External Load result */
  internalExternalLoad: InternalExternalLoad | null;
  /** Lactate Clearance result */
  lactateClearance: LactateClearanceResult | null;
  
  /** Actionable insights (max 3) */
  actionableFeedback: ActionableInsight[];
  
  /** Data quality information */
  hrDataQuality: DataQualityReport;
  /** Additive v2 context for interval-aware semantics */
  intervalAwareContext?: {
    thresholdSecPerKm: number;
    sessionType: SessionType;
    warmupCooldownHeuristicApplied: boolean;
    sourceAuthority?: SourceAuthority;
  };
}

export type DataAvailability = 'full-streams' | 'summary-only' | 'none';

export interface DataQualityReport {
  /** Total data points in the stream */
  totalPoints: number;
  /** Valid (non-zero) data points */
  validPoints: number;
  /** Percentage of valid data */
  validPercent: number;
  /** Warning message if quality is poor */
  qualityWarning?: string;
}

/**
 * HR Data Quality Assessment
 * 
 * Utility type for checking if there's enough data to analyze
 */
export interface HRDataQuality {
  isGood: boolean;
  totalPoints: number;
  validPoints: number;
  validPercent: number;
  warnings: string[];
}
