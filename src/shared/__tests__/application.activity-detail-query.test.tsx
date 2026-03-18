// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useActivityDetail } from '../application';
import { queryClient } from '../queryClient';
import { buildActivityDetailQueryKey } from '../queryKeys';
import { useAuthStore } from '../store/auth.store';

const { createIntervalsClientMock, fetchActivityWithIntervalsMock } = vi.hoisted(() => ({
  createIntervalsClientMock: vi.fn(),
  fetchActivityWithIntervalsMock: vi.fn(),
}));

vi.mock('../api/intervals-client', async () => {
  const actual = await vi.importActual('../api/intervals-client');

  return {
    ...actual,
    createIntervalsClient: createIntervalsClientMock,
    fetchActivityWithIntervals: fetchActivityWithIntervalsMock,
  };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('activity detail query identity and auth gating', () => {
  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    createIntervalsClientMock.mockReset();
    fetchActivityWithIntervalsMock.mockReset();
    useAuthStore.setState({
      apiKey: null,
      isAuthenticated: false,
      isValidating: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  it('builds deterministic query keys for same activity id', () => {
    const keyA = buildActivityDetailQueryKey('activity-123');
    const keyB = buildActivityDetailQueryKey('activity-123');

    expect(keyA).toEqual(keyB);

    const payload = { id: 'activity-123', name: 'Tempo run' };
    queryClient.setQueryData(keyA, payload);

    expect(queryClient.getQueryData(keyB)).toEqual(payload);
  });

  it('isolates cache entries across activity ids', () => {
    const activityAKey = buildActivityDetailQueryKey('activity-a');
    const activityBKey = buildActivityDetailQueryKey('activity-b');
    const activityAData = { id: 'activity-a', name: 'Easy run' };
    const activityBData = { id: 'activity-b', name: 'Long run' };

    queryClient.setQueryData(activityAKey, activityAData);
    queryClient.setQueryData(activityBKey, activityBData);

    expect(queryClient.getQueryData(activityAKey)).toEqual(activityAData);
    expect(queryClient.getQueryData(activityBKey)).toEqual(activityBData);
    expect(queryClient.getQueryData(activityAKey)).not.toEqual(activityBData);
  });

  it('does not execute query when auth is missing', async () => {
    createIntervalsClientMock.mockResolvedValue({ activities: {} });
    fetchActivityWithIntervalsMock.mockResolvedValue({ id: 'activity-123' });

    const { result } = renderHook(() => useActivityDetail('activity-123'), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isSuccess).toBe(false);
    expect(createIntervalsClientMock).not.toHaveBeenCalled();
    expect(fetchActivityWithIntervalsMock).not.toHaveBeenCalled();
  });
});
