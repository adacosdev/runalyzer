/**
 * Client Store - Runalyzer
 * 
 * Singleton store that holds the IntervalsClient instance
 * to avoid creating a new client on every request.
 */

import { create } from 'zustand';
import { useAuthStore } from './auth';

interface ClientState {
  // State
  client: any | null;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  getClient: () => any;
  clear: () => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  client: null,
  isInitialized: false,
  
  initialize: async () => {
    const { client, isInitialized } = get();
    
    // Already initialized - return early
    if (isInitialized && client) {
      return;
    }
    
    // Get API key from auth store
    const apiKey = useAuthStore.getState().apiKey;
    if (!apiKey) {
      throw new Error('No autenticado');
    }
    
    // Create client instance
    const { IntervalsClient } = await import('intervals-icu');
    const newClient = new IntervalsClient({
      apiKey,
      athleteId: '0',
    });
    
    set({ client: newClient, isInitialized: true });
  },
  
  getClient: () => {
    const { client, isInitialized } = get();
    
    if (!isInitialized || !client) {
      throw new Error('Cliente no inicializado. Llama initialize() primero.');
    }
    
    return client;
  },
  
  clear: () => {
    set({ client: null, isInitialized: false });
  },
}));
