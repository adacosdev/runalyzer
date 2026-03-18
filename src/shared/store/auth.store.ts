/**
 * Auth Store - Runalyzer
 * 
 * Manages API key authentication state.
 * Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { queryClient } from '../queryClient';
import {
  clearActivityDetailQueryCache,
  clearActivityStreamsQueryCache,
  clearHome30dSummaryQueryCache,
} from '../queryKeys';

function clearAuthBoundedQueryNamespaces() {
  clearHome30dSummaryQueryCache(queryClient);
  clearActivityDetailQueryCache(queryClient);
  clearActivityStreamsQueryCache(queryClient);
}

interface AuthState {
  // State
  apiKey: string | null;
  isAuthenticated: boolean;
  isValidating: boolean;
  error: string | null;
  
  // Actions
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  setValidating: (isValidating: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      apiKey: null,
      isAuthenticated: false,
      isValidating: false,
      error: null,
      
      setApiKey: (apiKey) => {
        const previousApiKey = get().apiKey;
        if (previousApiKey !== apiKey) {
          clearAuthBoundedQueryNamespaces();
        }

        set({ 
          apiKey, 
          isAuthenticated: true, 
          error: null 
        });
      },
      
      clearApiKey: () => {
        if (get().apiKey) {
          clearAuthBoundedQueryNamespaces();
        }

        set({ 
          apiKey: null, 
          isAuthenticated: false,
          error: null,
        });
      },
      
      setValidating: (isValidating) => set({ isValidating }),
      
      setError: (error) => set({ error, isValidating: false }),
    }),
    {
      name: 'runalyzer-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ apiKey: state.apiKey }),
      onRehydrateStorage: () => (state) => {
        // FIX: If apiKey exists after rehydration, set isAuthenticated to true
        // Zustand persist only restores persisted state, not derived state
        if (state && state.apiKey && !state.isAuthenticated) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
