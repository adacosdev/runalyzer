// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { removeQueriesMock } = vi.hoisted(() => ({
  removeQueriesMock: vi.fn(),
}));

vi.mock('../../queryClient', () => ({
  queryClient: {
    removeQueries: removeQueriesMock,
  },
}));

import { useAuthStore } from '../auth.store';

describe('auth store query cache boundaries', () => {
  beforeEach(() => {
    removeQueriesMock.mockClear();
    localStorage.clear();
    useAuthStore.setState({
      apiKey: null,
      isAuthenticated: false,
      isValidating: false,
      error: null,
    });
  });

  it('clears home/detail/streams namespaces when api key is initially set', () => {
    useAuthStore.getState().setApiKey('api-key-v1');

    expect(useAuthStore.getState().apiKey).toBe('api-key-v1');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(removeQueriesMock).toHaveBeenCalledTimes(3);
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['home-30d-summary'] });
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['activity-detail'] });
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['activity-streams'] });
  });

  it('does not clear namespace caches when api key value is unchanged', () => {
    useAuthStore.setState({ apiKey: 'same-key', isAuthenticated: true });

    useAuthStore.getState().setApiKey('same-key');

    expect(removeQueriesMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().apiKey).toBe('same-key');
  });

  it('clears home/detail/streams namespaces when api key changes', () => {
    useAuthStore.setState({ apiKey: 'api-key-v1', isAuthenticated: true });

    useAuthStore.getState().setApiKey('api-key-v2');

    expect(useAuthStore.getState().apiKey).toBe('api-key-v2');
    expect(removeQueriesMock).toHaveBeenCalledTimes(3);
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['home-30d-summary'] });
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['activity-detail'] });
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['activity-streams'] });
  });

  it('clears home/detail/streams namespaces when auth is cleared', () => {
    useAuthStore.setState({ apiKey: 'api-key-v2', isAuthenticated: true });

    useAuthStore.getState().clearApiKey();

    expect(useAuthStore.getState().apiKey).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(removeQueriesMock).toHaveBeenCalledTimes(3);
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['home-30d-summary'] });
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['activity-detail'] });
    expect(removeQueriesMock).toHaveBeenCalledWith({ queryKey: ['activity-streams'] });
  });
});
