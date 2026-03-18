// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ActivityDetailPage } from '../ActivityDetail';

const mocks = vi.hoisted(() => ({
  useActivityDetailMock: vi.fn(),
  useActivityStreamsMock: vi.fn(),
  analyzeActivityMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ id: 'activity-123' }),
  useNavigate: () => mocks.navigateMock,
}));

vi.mock('../../../../shared/application', () => ({
  useActivityDetail: mocks.useActivityDetailMock,
  useActivityStreams: mocks.useActivityStreamsMock,
}));

vi.mock('../../../../shared/store/zones.store', () => ({
  useZonesStore: (selector: (state: { zoneConfig: null }) => unknown) => selector({ zoneConfig: null }),
}));

vi.mock('../../domain', () => ({
  analyzeActivity: mocks.analyzeActivityMock,
}));

vi.mock('../../components', () => ({
  ActivityCharts: () => <div>charts</div>,
  CardiacDriftChart: () => <div>cardiac-drift</div>,
  ZoneDistributionBar: () => <div>zone-distribution</div>,
  ActionableFeedbackList: () => <div>feedback</div>,
  InternalExternalLoadSection: () => <div>internal-external-load</div>,
  LactateClearanceSection: () => <div>lactate-clearance</div>,
}));

function queryState(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    error: null,
    isError: false,
    isLoading: false,
    isPending: false,
    ...overrides,
  };
}

function sampleActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'activity-123',
    name: 'Tempo run',
    distance: 12000,
    icuIntervals: [{ id: 'i-1' }],
    ...overrides,
  };
}

describe('ActivityDetail route state contract', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useActivityDetailMock.mockReturnValue(queryState({ isLoading: true }));
    mocks.useActivityStreamsMock.mockReturnValue(queryState({ isLoading: true }));
    mocks.analyzeActivityMock.mockReturnValue({
      cardiacDrift: null,
      zoneDistribution: null,
      internalExternalLoad: null,
      lactateClearance: null,
      actionableFeedback: [],
    });
  });

  it('prioritizes error over loading', () => {
    mocks.useActivityDetailMock.mockReturnValue(
      queryState({
        isError: true,
        isLoading: true,
        error: new Error('detail transport failed'),
      })
    );
    mocks.useActivityStreamsMock.mockReturnValue(queryState({ isLoading: true }));

    render(<ActivityDetailPage />);

    expect(screen.getByText('Actividad no disponible')).toBeInTheDocument();
    expect(screen.getByText('detail transport failed')).toBeInTheDocument();
    expect(screen.queryByText('Analizando entrenamiento...')).not.toBeInTheDocument();
  });

  it('renders degraded ready state when only streams query fails', () => {
    mocks.useActivityDetailMock.mockReturnValue(
      queryState({ data: sampleActivity() })
    );
    mocks.useActivityStreamsMock.mockReturnValue(
      queryState({ isError: true, error: new Error('Timeout al cargar streams') })
    );

    render(<ActivityDetailPage />);

    expect(screen.getByText('Streams no disponibles')).toBeInTheDocument();
    expect(screen.getByText('Timeout al cargar streams')).toBeInTheDocument();
    expect(screen.getAllByText('DATOS DE LA ACTIVIDAD').length).toBeGreaterThan(0);
    expect(screen.queryByText('Actividad no disponible')).not.toBeInTheDocument();
  });

  it('shows activity error and hides streams banner when both queries fail', () => {
    mocks.useActivityDetailMock.mockReturnValue(
      queryState({ isError: true, error: new Error('Activity gone') })
    );
    mocks.useActivityStreamsMock.mockReturnValue(
      queryState({ isError: true, error: new Error('Streams also gone') })
    );

    render(<ActivityDetailPage />);

    expect(screen.getByText('Actividad no disponible')).toBeInTheDocument();
    expect(screen.getByText('Activity gone')).toBeInTheDocument();
    expect(screen.queryByText('Streams no disponibles')).not.toBeInTheDocument();
    expect(screen.queryByText('DATOS DE LA ACTIVIDAD')).not.toBeInTheDocument();
  });

  it('renders loading when queries are pending with no errors', () => {
    mocks.useActivityDetailMock.mockReturnValue(queryState({ isLoading: true }));
    mocks.useActivityStreamsMock.mockReturnValue(queryState({ isPending: true }));

    render(<ActivityDetailPage />);

    expect(screen.getByText('Analizando entrenamiento...')).toBeInTheDocument();
  });

  it('renders not-found when detail query resolves without data', () => {
    mocks.useActivityDetailMock.mockReturnValue(queryState({ data: undefined }));
    mocks.useActivityStreamsMock.mockReturnValue(queryState({ data: [] }));

    render(<ActivityDetailPage />);

    expect(screen.getByText('Actividad no encontrada')).toBeInTheDocument();
  });

  it('renders empty stream message when detail exists but streams are empty', () => {
    mocks.useActivityDetailMock.mockReturnValue(queryState({ data: sampleActivity() }));
    mocks.useActivityStreamsMock.mockReturnValue(queryState({ data: [] }));

    render(<ActivityDetailPage />);

    expect(screen.getByText('No hay streams disponibles para esta actividad')).toBeInTheDocument();
  });

  it('renders interval not-available message when activity has no intervals', () => {
    mocks.useActivityDetailMock.mockReturnValue(
      queryState({ data: sampleActivity({ icuIntervals: [] }) })
    );
    mocks.useActivityStreamsMock.mockReturnValue(queryState({ data: [{ type: 'time', data: [0, 1, 2] }] }));

    render(<ActivityDetailPage />);

    expect(
      screen.getByText('Esta actividad no tiene intervalos estructurados, por lo que este análisis no está disponible.')
    ).toBeInTheDocument();
  });

  it('calls analyzer only in ready state using real detail identity', () => {
    const detail = sampleActivity({ id: 'activity-real-id' });
    const streams = [{ type: 'time', data: [0, 1, 2] }];

    mocks.useActivityDetailMock.mockReturnValue(queryState({ data: detail }));
    mocks.useActivityStreamsMock.mockReturnValue(queryState({ data: streams }));

    render(<ActivityDetailPage />);

    expect(mocks.analyzeActivityMock).toHaveBeenCalledTimes(1);
    expect(mocks.analyzeActivityMock).toHaveBeenCalledWith(detail, streams, null);
  });

  it('keeps ready state when analysis metrics are unavailable with reason-coded payload', () => {
    const detail = sampleActivity({ id: 'activity-sparse-checkpoints' });
    const streams = [
      { type: 'time', data: [0, 60, 120, 180, 240, 360, 480] },
      { type: 'heartrate', data: [150, 152, 156, 160, 158, 154, 153] },
    ];

    mocks.useActivityDetailMock.mockReturnValue(queryState({ data: detail }));
    mocks.useActivityStreamsMock.mockReturnValue(queryState({ data: streams }));
    mocks.analyzeActivityMock.mockReturnValue({
      cardiacDrift: {
        verdict: 'insufficient-data',
        driftPercent: 0,
        firstHalfAvgHR: 0,
        secondHalfAvgHR: 0,
        message: 'No hay ventana valida para analizar el drift cardíaco.',
        validDataPoints: 0,
        reasonCode: 'trim-window-too-short',
      },
      zoneDistribution: null,
      internalExternalLoad: null,
      lactateClearance: {
        hasIntervals: false,
        intervals: [],
        averageDropPercent: 0,
        overallQuality: 'poor',
        verdict: 'No hay checkpoints válidos para analizar la eliminación de lactato.',
        reasonCode: 'checkpoint-unavailable-outside-window',
      },
      actionableFeedback: [],
    });

    render(<ActivityDetailPage />);

    expect(mocks.analyzeActivityMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('DATOS DE LA ACTIVIDAD').length).toBeGreaterThan(0);
  });
});
