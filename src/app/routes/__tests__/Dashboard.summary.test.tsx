// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../Dashboard';
import type { Home30dSummary } from '../../../features/activity/domain';

const mockNavigate = vi.fn();
const mockUseActivities = vi.fn();
const mockUseHome30dSummary = vi.fn();
const mockSyncActivities = vi.fn();
const mockUseAuthStore = vi.fn();
const mockUseZonesStore = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../shared/application', () => ({
  useActivities: (...args: unknown[]) => mockUseActivities(...args),
  useHome30dSummary: (...args: unknown[]) => mockUseHome30dSummary(...args),
  syncActivities: (...args: unknown[]) => mockSyncActivities(...args),
}));

vi.mock('../../../shared/store/auth.store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('../../../shared/store/zones.store', () => ({
  useZonesStore: () => mockUseZonesStore(),
}));

vi.mock('../../../features/activity/components', async () => {
  const actual = await vi.importActual<typeof import('../../../features/activity/components')>(
    '../../../features/activity/components'
  );

  return {
    ...actual,
    ActivityCard: ({ activity }: { activity: { name: string } }) => (
      <div data-testid="activity-card">{activity.name}</div>
    ),
  };
});

describe('Dashboard summary isolation', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
    });

    mockUseZonesStore.mockReturnValue({
      zoneConfig: {
        z1MaxHR: 140,
        z2MaxHR: 160,
        maxHR: 190,
      },
    });

    mockUseActivities.mockReturnValue({
      data: [{ id: 'run-1', name: 'Run One' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseHome30dSummary.mockReturnValue({
      data: {
        summary: createSummary(),
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockSyncActivities.mockResolvedValue(undefined);
  });

  it('keeps recent list visible and sync interactive while summary is loading', async () => {
    const activitiesRefetch = vi.fn();
    const summaryRefetch = vi.fn();
    mockUseActivities.mockReturnValue({
      data: [{ id: 'run-1', name: 'Run One' }],
      isLoading: false,
      error: null,
      refetch: activitiesRefetch,
    });

    mockUseHome30dSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: summaryRefetch,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId('activity-card')).toBeInTheDocument();
    expect(screen.getByTestId('home-30d-summary-card')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar' }));

    await waitFor(() => {
      expect(mockSyncActivities).toHaveBeenCalledWith({ limit: 20 });
      expect(activitiesRefetch).toHaveBeenCalled();
      expect(summaryRefetch).toHaveBeenCalled();
    });
  });

  it('disables summary query when setup is incomplete', () => {
    mockUseZonesStore.mockReturnValue({
      zoneConfig: null,
    });

    render(<DashboardPage />);

    expect(screen.getByText('Configura tus zonas')).toBeInTheDocument();
    expect(mockUseHome30dSummary).toHaveBeenCalledWith({ enabled: false });
  });

  it('shows summary-local error with retry while list stays rendered', () => {
    const summaryRefetch = vi.fn();

    mockUseHome30dSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('summary failed'),
      refetch: summaryRefetch,
    });

    render(<DashboardPage />);

    expect(screen.getByText('No pudimos cargar el resumen de 30 dias')).toBeInTheDocument();
    expect(screen.getByText('summary failed')).toBeInTheDocument();
    expect(screen.getByTestId('activity-card')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar resumen' }));
    expect(summaryRefetch).toHaveBeenCalled();
  });

  it('renders explicit empty summary message with zero-safe totals and placeholders', () => {
    mockUseHome30dSummary.mockReturnValue({
      data: {
        summary: createSummary({
          totalRuns: 0,
          totalDistanceKm: 0,
          totalDurationSec: 0,
          avgPaceSecPerKm: null,
          avgHeartrateBpm: null,
          hrSampleCount: 0,
        }),
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('No hay carreras en los ultimos 30 dias.')).toBeInTheDocument();
    expect(screen.getByText('0.0 km')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('activity-card')).toBeInTheDocument();
  });

  it('keeps reserved summary height during loading to prevent layout collapse', () => {
    mockUseHome30dSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByTestId('home-30d-summary-card')).toHaveClass('min-h-[220px]');
  });
});

function createSummary(overrides: Partial<Home30dSummary> = {}): Home30dSummary {
  const windowEnd = new Date('2026-03-14T12:00:00.000Z');
  const windowStart = new Date('2026-02-12T12:00:00.000Z');

  return {
    window: {
      windowStart,
      windowEnd,
      windowEvaluatedAt: windowEnd,
    },
    totalRuns: 3,
    totalDistanceKm: 28.5,
    totalDurationSec: 9_100,
    totalMovingTimeSec: 8_700,
    totalElevationGainM: 250,
    avgPaceSecPerKm: 305,
    avgHeartrateBpm: 152,
    hrSampleCount: 2,
    includedRunCount: 3,
    excludedByWindowCount: 1,
    ...overrides,
  };
}
