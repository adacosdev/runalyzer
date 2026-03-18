// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityDetailPage } from '../ActivityDetail';
import { queryClient } from '../../../../shared/queryClient';
import { buildActivitiesQueryKey } from '../../../../shared/queryKeys';
import { useAuthStore } from '../../../../shared/store/auth.store';

const { createIntervalsClientMock, fetchActivityWithIntervalsMock, fetchActivityStreamsMock } = vi.hoisted(() => ({
  createIntervalsClientMock: vi.fn(),
  fetchActivityWithIntervalsMock: vi.fn(),
  fetchActivityStreamsMock: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'activity-deeplink-123' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../../shared/api/intervals-client', async () => {
  const actual = await vi.importActual('../../../../shared/api/intervals-client');

  return {
    ...actual,
    createIntervalsClient: createIntervalsClientMock,
    fetchActivityWithIntervals: fetchActivityWithIntervalsMock,
    fetchActivityStreams: fetchActivityStreamsMock,
  };
});

vi.mock('../../components', () => ({
  ActivityCharts: () => <div>charts</div>,
  CardiacDriftChart: () => <div>cardiac-drift</div>,
  ZoneDistributionBar: () => <div>zone-distribution</div>,
  ActionableFeedbackList: () => <div>feedback</div>,
}));

function createDetailPayload() {
  return {
    id: 'activity-deeplink-123',
    name: 'Deeplink threshold run',
    startDate: new Date('2026-03-01T07:00:00.000Z'),
    startTime: 1740812400,
    duration: 3600,
    movingTime: 3500,
    distance: 12000,
    elevationGain: 50,
    elevationLoss: 50,
    averageHeartrate: 151,
    maxHeartrate: 176,
    hasHeartrate: true,
    averagePace: 280,
    maxPace: 220,
    icuIntervals: [],
    icuHrZoneTimes: [300, 800, 600],
    decoupling: null,
    dataAvailability: 'full-streams' as const,
  };
}

describe('ActivityDetail deep-link cold-cache behavior', () => {
  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    createIntervalsClientMock.mockReset();
    fetchActivityWithIntervalsMock.mockReset();
    fetchActivityStreamsMock.mockReset();
    useAuthStore.setState({
      apiKey: 'api-key-for-tests',
      isAuthenticated: true,
      isValidating: false,
      error: null,
    });

    createIntervalsClientMock.mockResolvedValue({ activities: {} });
    fetchActivityWithIntervalsMock.mockResolvedValue(createDetailPayload());
    fetchActivityStreamsMock.mockResolvedValue([
      { type: 'time', data: [0, 1, 2, 3] },
      { type: 'heartrate', data: [145, 147, 149, 150] },
      { type: 'velocity_smooth', data: [3.4, 3.5, 3.6, 3.5] },
    ]);
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  it('renders ready state from direct detail route without activities list cache', async () => {
    expect(queryClient.getQueryData(buildActivitiesQueryKey(20))).toBeUndefined();

    render(
      <QueryClientProvider client={queryClient}>
        <ActivityDetailPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText('DATOS DE LA ACTIVIDAD')).toBeInTheDocument();
    expect(screen.getByText('activity-deeplink-123')).toBeInTheDocument();
    expect(screen.getByText('Streams')).toBeInTheDocument();
    expect(screen.getByText('Cargados')).toBeInTheDocument();
    expect(
      screen.getByText('Esta actividad no tiene intervalos estructurados, por lo que este análisis no está disponible.')
    ).toBeInTheDocument();

    expect(fetchActivityWithIntervalsMock).toHaveBeenCalledWith(expect.anything(), 'activity-deeplink-123');
    expect(fetchActivityStreamsMock).toHaveBeenCalledWith(
      expect.anything(),
      'activity-deeplink-123',
      ['time', 'heartrate', 'velocity_smooth', 'distance', 'altitude']
    );
    expect(queryClient.getQueryData(buildActivitiesQueryKey(20))).toBeUndefined();
  });
});
