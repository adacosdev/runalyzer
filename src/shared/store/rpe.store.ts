/**
 * RPE & Injuries Store - Runalyzer
 * 
 * Manages:
 * - RPE (Rate of Perceived Exertion) entries per activity
 * - Injury/mild discomfort tracking
 * 
 * Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RPEEntry {
  activityId: string;
  value: number; // 1-10
  notes?: string;
  createdAt: number;
}

export interface InjuryEntry {
  id: string;
  activityId?: string; // Optional - may be general
  bodyPart: BodyPart;
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
  createdAt: number;
  isResolved: boolean;
  resolvedAt?: number;
}

export type BodyPart = 
  | 'knee' 
  | 'hip' 
  | 'ankle' 
  | 'foot' 
  | 'calf' 
  | 'shin' 
  | 'hamstring' 
  | 'quadriceps' 
  | 'groin' 
  | 'lower_back' 
  | 'upper_back' 
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'other';

interface RPEInjuriesState {
  // RPE
  rpeEntries: RPEEntry[];
  
  // Injuries
  injuries: InjuryEntry[];
  
  // Actions - RPE
  addRPE: (activityId: string, value: number, notes?: string) => void;
  getRPE: (activityId: string) => RPEEntry | undefined;
  updateRPE: (activityId: string, value: number, notes?: string) => void;
  
  // Actions - Injuries
  addInjury: (injury: Omit<InjuryEntry, 'id' | 'createdAt' | 'isResolved'>) => void;
  resolveInjury: (id: string) => void;
  deleteInjury: (id: string) => void;
  getActiveInjuries: () => InjuryEntry[];
  getInjuriesByBodyPart: (bodyPart: BodyPart) => InjuryEntry[];
}

// RPE labels for UI
export const RPE_LABELS: Record<number, string> = {
  1: 'Muy fácil',
  2: 'Muy fácil',
  3: 'Fácil',
  4: 'Moderado',
  5: 'Algo difícil',
  6: 'Difícil',
  7: 'Muy difícil',
  8: 'Muy difícil',
  9: 'Extremadamente difícil',
  10: 'Máximo esfuerzo',
};

export const RPE_COLORS: Record<number, string> = {
  1: '#10B981', // green
  2: '#10B981',
  3: '#34D399',
  4: '#FBBF24', // yellow
  5: '#F59E0B',
  6: '#F97316', // orange
  7: '#EF4444', // red
  8: '#DC2626',
  9: '#B91C1C',
  10: '#7F1D1D',
};

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  knee: 'Rodilla',
  hip: 'Cadera',
  ankle: 'Tobillo',
  foot: 'Pie',
  calf: 'Pantorrilla',
  shin: 'Shin',
  hamstring: 'Isquiotibial',
  quadriceps: 'Cuádriceps',
  groin: 'Ingle',
  lower_back: 'Lumbar',
  upper_back: 'Espalda alta',
  shoulder: 'Hombro',
  elbow: 'Codo',
  wrist: 'Muñeca',
  other: 'Otro',
};

export const useRPEInjuriesStore = create<RPEInjuriesState>()(
  persist(
    (set, get) => ({
      rpeEntries: [],
      injuries: [],
      
      // RPE Actions
      addRPE: (activityId, value, notes) => {
        const entry: RPEEntry = {
          activityId,
          value,
          notes,
          createdAt: Date.now(),
        };
        set((state) => ({ 
          rpeEntries: [...state.rpeEntries, entry] 
        }));
      },
      
      getRPE: (activityId) => {
        return get().rpeEntries.find(e => e.activityId === activityId);
      },
      
      updateRPE: (activityId, value, notes) => {
        set((state) => ({
          rpeEntries: state.rpeEntries.map(e => 
            e.activityId === activityId 
              ? { ...e, value, notes } 
              : e
          ),
        }));
      },
      
      // Injury Actions
      addInjury: (injury) => {
        const newInjury: InjuryEntry = {
          ...injury,
          id: `injury-${Date.now()}`,
          createdAt: Date.now(),
          isResolved: false,
        };
        set((state) => ({ 
          injuries: [...state.injuries, newInjury] 
        }));
      },
      
      resolveInjury: (id) => {
        set((state) => ({
          injuries: state.injuries.map(i => 
            i.id === id 
              ? { ...i, isResolved: true, resolvedAt: Date.now() } 
              : i
          ),
        }));
      },
      
      deleteInjury: (id) => {
        set((state) => ({
          injuries: state.injuries.filter(i => i.id !== id),
        }));
      },
      
      getActiveInjuries: () => {
        return get().injuries.filter(i => !i.isResolved);
      },
      
      getInjuriesByBodyPart: (bodyPart) => {
        return get().injuries.filter(i => i.bodyPart === bodyPart);
      },
    }),
    {
      name: 'runalyzer-rpe-injuries',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
