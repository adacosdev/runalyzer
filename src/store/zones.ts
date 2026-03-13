/**
 * Zones Store - Runalyzer
 * 
 * Manages user's zone configuration.
 * Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ZoneConfig, getDefaultZoneConfig, CalibrationMethod } from '../domain/zones/types';

interface ZonesState {
  // State
  zoneConfig: ZoneConfig | null;
  age: number; // Used for default calculation
  
  // Actions
  setZoneConfig: (config: ZoneConfig) => void;
  setAge: (age: number) => void;
  initializeDefaultConfig: (age: number) => void;
  updateFromThresholdTest: (result: {
    z1MaxHR: number;
    z2MaxHR: number;
    maxHR: number;
  }) => void;
}

export const useZonesStore = create<ZonesState>()(
  persist(
    (set, get) => ({
      zoneConfig: null,
      age: 30, // Default, should be set by user
      
      setZoneConfig: (zoneConfig) => set({ zoneConfig }),
      
      setAge: (age) => {
        set({ age });
        // If no config exists, generate default with new age
        if (!get().zoneConfig) {
          const defaultConfig = getDefaultZoneConfig(age, true);
          set({ zoneConfig: defaultConfig });
        }
      },
      
      initializeDefaultConfig: (age) => {
        const existingConfig = get().zoneConfig;
        if (!existingConfig) {
          const defaultConfig = getDefaultZoneConfig(age, true);
          set({ zoneConfig: defaultConfig, age });
        }
      },
      
      updateFromThresholdTest: (result) => {
        const currentConfig = get().zoneConfig;
        const newConfig: ZoneConfig = {
          z1MaxHR: result.z1MaxHR,
          z2MaxHR: result.z2MaxHR,
          maxHR: result.maxHR,
          isEstimated: false,
          calibrationMethod: 'threshold-test' as CalibrationMethod,
          lastCalibrated: Date.now(),
        };
        set({ zoneConfig: newConfig });
      },
    }),
    {
      name: 'runalyzer-zones',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        zoneConfig: state.zoneConfig,
        age: state.age,
      }),
    }
  )
);
