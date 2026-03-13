/**
 * Auth Store - Runalyzer
 * 
 * Manages API key authentication state.
 * Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
    (set) => ({
      apiKey: null,
      isAuthenticated: false,
      isValidating: false,
      error: null,
      
      setApiKey: (apiKey) => set({ 
        apiKey, 
        isAuthenticated: true, 
        error: null 
      }),
      
      clearApiKey: () => set({ 
        apiKey: null, 
        isAuthenticated: false,
        error: null,
      }),
      
      setValidating: (isValidating) => set({ isValidating }),
      
      setError: (error) => set({ error, isValidating: false }),
    }),
    {
      name: 'runalyzer-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ apiKey: state.apiKey }), // Only persist apiKey
    }
  )
);
