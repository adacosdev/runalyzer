/**
 * Application Layer - Use Cases - Runalyzer
 */

import { 
  createIntervalsClient, 
  fetchActivities, 
  fetchActivityWithIntervals,
  fetchActivityStreams,
  validateApiKey 
} from '../api/intervals-client';
import { DomainActivity } from '../domain/activity/types';
import { ActivityAnalysis, analyzeActivity } from '../domain/analysis';
import { ZoneConfig } from '../domain/zones/types';
import { useAuthStore } from '../store/auth';
import { useZonesStore } from '../store/zones';
import { useActivitiesStore } from '../store/activities';

/**
 * Validate API key and authenticate user
 */
export async function authenticate(apiKey: string): Promise<boolean> {
  const authStore = useAuthStore.getState();
  
  authStore.setValidating(true);
  
  const isValid = await validateApiKey(apiKey);
  
  if (isValid) {
    authStore.setApiKey(apiKey);
    return true;
  } else {
    authStore.setError('API key inválida. Verificá tu key en Intervals.icu.');
    return false;
  }
}

/**
 * Logout and clear authentication
 */
export function logout() {
  const authStore = useAuthStore.getState();
  const activitiesStore = useActivitiesStore.getState();
  
  authStore.clearApiKey();
  activitiesStore.clearCache();
}

/**
 * Sync activities from Intervals.icu
 */
export async function syncActivities(options?: {
  oldest?: string;
  newest?: string;
  limit?: number;
}): Promise<DomainActivity[]> {
  const authStore = useAuthStore.getState();
  const activitiesStore = useActivitiesStore.getState();
  
  const apiKey = authStore.apiKey;
  if (!apiKey) {
    throw new Error('No autenticado');
  }
  
  // Check cache first
  if (activitiesStore.isCacheValid() && activitiesStore.activities.length > 0) {
    return activitiesStore.activities;
  }
  
  activitiesStore.setLoading(true);
  activitiesStore.setError(null);
  
  try {
    const client = await createIntervalsClient({ apiKey });
    const activities = await fetchActivities(client, options);
    
    activitiesStore.setActivities(activities);
    activitiesStore.setLoading(false);
    
    return activities;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al sincronizar actividades';
    activitiesStore.setError(message);
    throw error;
  }
}

/**
 * Analyze a single activity
 */
export async function analyzeActivityUseCase(
  activityId: string,
  options?: {
    fetchStreams?: boolean;
  }
): Promise<ActivityAnalysis> {
  const authStore = useAuthStore.getState();
  const zonesStore = useZonesStore.getState();
  const activitiesStore = useActivitiesStore.getState();
  
  const apiKey = authStore.apiKey;
  const zoneConfig = zonesStore.zoneConfig;
  
  if (!apiKey) {
    throw new Error('No autenticado');
  }
  
  if (!zoneConfig) {
    throw new Error('Zonas no configuradas. Por favor completá tu perfil.');
  }
  
  // Check if we already have this analysis cached
  const cached = activitiesStore.getAnalysis(activityId);
  if (cached) {
    return cached;
  }
  
  // Fetch activity with intervals
  const client = createIntervalsClient({ apiKey });
  const activity = await fetchActivityWithIntervals(client, activityId);
  
  // Fetch streams if requested (for full analysis)
  let hrStreams: number[] | undefined;
  let paceStreams: number[] | undefined;
  
  if (options?.fetchStreams !== false) {
    try {
      const streams = await fetchActivityStreams(client, activityId, [
        'heartrate',
        'velocity_smooth',
        'time'
      ]);
      
      const hrStream = streams.find(s => s.type === 'heartrate');
      const paceStream = streams.find(s => s.type === 'velocity_smooth');
      
      hrStreams = hrStream?.data;
      paceStreams = paceStream?.data;
    } catch (error) {
      console.warn('Could not fetch streams, falling back to summary:', error);
    }
  }
  
  // Run analysis
  const analysis = analyzeActivity(activity, zoneConfig, hrStreams, paceStreams);
  
  // Cache result
  activitiesStore.addAnalysis(activityId, analysis);
  
  return analysis;
}

/**
 * Get activities filtered by date range
 */
export function getActivitiesByDateRange(
  activities: DomainActivity[],
  startDate: Date,
  endDate: Date
): DomainActivity[] {
  return activities.filter(activity => {
    const activityDate = new Date(activity.startDate);
    return activityDate >= startDate && activityDate <= endDate;
  });
}

/**
 * Get activities sorted by date (newest first)
 */
export function sortActivitiesByDate(
  activities: DomainActivity[],
  ascending: boolean = false
): DomainActivity[] {
  return [...activities].sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}
