// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useHome30dSummary } from '../application';
import { queryClient } from '../queryClient';
import { buildHome30dSummaryAuthScope, buildHome30dSummaryQueryKey } from '../queryKeys';
import { useAuthStore } from '../store/auth.store';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useHome30dSummary cache identity safety', () => {
  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
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

  it('scopes summary cache by auth identity', () => {
    const accountAData = { sourceActivityCount: 1, summary: { id: 'a' } };
    const accountBData = { sourceActivityCount: 2, summary: { id: 'b' } };
    const accountAScope = buildHome30dSummaryAuthScope('account-a');
    const accountBScope = buildHome30dSummaryAuthScope('account-b');

    queryClient.setQueryData(buildHome30dSummaryQueryKey(accountAScope), accountAData);
    queryClient.setQueryData(buildHome30dSummaryQueryKey(accountBScope), accountBData);

    act(() => {
      useAuthStore.setState({ apiKey: 'account-a', isAuthenticated: true });
    });
    const { result, rerender } = renderHook(() => useHome30dSummary({ enabled: false }), { wrapper });
    expect(result.current.data).toEqual(accountAData);

    act(() => {
      useAuthStore.setState({ apiKey: 'account-b', isAuthenticated: true });
    });
    rerender();
    expect(result.current.data).toEqual(accountBData);
  });

  it('clears summary cache when api key changes', () => {
    const accountAKey = buildHome30dSummaryQueryKey(buildHome30dSummaryAuthScope('account-a'));
    const accountBKey = buildHome30dSummaryQueryKey(buildHome30dSummaryAuthScope('account-b'));

    act(() => {
      useAuthStore.getState().setApiKey('account-a');
    });
    queryClient.setQueryData(accountAKey, { summary: { id: 'a' }, sourceActivityCount: 1 });
    queryClient.setQueryData(accountBKey, { summary: { id: 'b' }, sourceActivityCount: 2 });

    act(() => {
      useAuthStore.getState().setApiKey('account-b');
    });

    expect(queryClient.getQueryData(accountAKey)).toBeUndefined();
    expect(queryClient.getQueryData(accountBKey)).toBeUndefined();
  });

  it('clears summary cache when auth is cleared', () => {
    const accountAKey = buildHome30dSummaryQueryKey(buildHome30dSummaryAuthScope('account-a'));

    act(() => {
      useAuthStore.getState().setApiKey('account-a');
    });
    queryClient.setQueryData(accountAKey, { summary: { id: 'a' }, sourceActivityCount: 1 });

    act(() => {
      useAuthStore.getState().clearApiKey();
    });

    expect(queryClient.getQueryData(accountAKey)).toBeUndefined();
  });

  it('does not leak raw auth identity in summary query scope', () => {
    const rawApiKey = 'live-secret-api-key';
    const authScope = buildHome30dSummaryAuthScope(rawApiKey);

    expect(authScope).not.toContain(rawApiKey);
    expect(buildHome30dSummaryQueryKey(authScope)).toEqual(['home-30d-summary', authScope]);
  });
});
