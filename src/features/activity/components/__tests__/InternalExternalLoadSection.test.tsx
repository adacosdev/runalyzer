// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { InternalExternalLoadSection } from '../InternalExternalLoadSection';
import type { InternalExternalLoad } from '../../domain/types';

afterEach(() => cleanup());

function makeLoad(overrides: Partial<InternalExternalLoad> = {}): InternalExternalLoad {
  return {
    intervals: [
      {
        name: 'Serie 1',
        avgPaceMps: 270,
        avgHR: 162,
        hrToPaceEfficiency: 0.023,
        verdict: 'Intensidad alta - trabajo de umbral o VO2Max.',
      },
    ],
    sessionAvgPaceMinKm: 270,
    sessionAvgHR: 162,
    sessionVerdict: 'Sesión de umbral. Buena intensidad para mejorar el límite de rendimiento.',
    ...overrides,
  };
}

describe('InternalExternalLoadSection', () => {
  it('renders session average HR in the summary card', () => {
    const { container } = render(<InternalExternalLoadSection load={makeLoad()} />);

    const summaryGrid = container.querySelector('.grid') as HTMLElement;
    expect(summaryGrid).not.toBeNull();
    expect(within(summaryGrid).getByText('162 bpm')).toBeInTheDocument();
  });

  it('renders session pace formatted as min:sec/km', () => {
    render(<InternalExternalLoadSection load={makeLoad()} />);

    expect(screen.getAllByText('4:30 /km').length).toBeGreaterThanOrEqual(1);
  });

  it('renders session verdict text', () => {
    render(<InternalExternalLoadSection load={makeLoad()} />);

    expect(
      screen.getByText('Sesión de umbral. Buena intensidad para mejorar el límite de rendimiento.')
    ).toBeInTheDocument();
  });

  it('renders interval name in the breakdown', () => {
    render(<InternalExternalLoadSection load={makeLoad()} />);

    expect(screen.getAllByText('Serie 1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders interval verdict text', () => {
    render(<InternalExternalLoadSection load={makeLoad()} />);

    expect(screen.getByText('Intensidad alta - trabajo de umbral o VO2Max.')).toBeInTheDocument();
  });

  it('renders hrToPaceEfficiency value in the interval row', () => {
    render(<InternalExternalLoadSection load={makeLoad()} />);

    // "Ef: 0.023" is split across text nodes — use regex on the span text
    expect(screen.getByText(/Ef:.*0\.023/)).toBeInTheDocument();
  });

  it('renders RPE when present in interval', () => {
    const load = makeLoad({
      intervals: [
        {
          name: 'Serie RPE',
          avgPaceMps: 260,
          avgHR: 168,
          rpe: 8,
          hrToPaceEfficiency: 0.024,
          verdict: 'Intensidad máxima - sprint o esfuerzo de carrera.',
        },
      ],
    });

    render(<InternalExternalLoadSection load={load} />);

    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders placeholder dash when sessionAvgHR is zero', () => {
    const { container } = render(
      <InternalExternalLoadSection load={makeLoad({ sessionAvgPaceMinKm: 0, sessionAvgHR: 0, intervals: [] })} />
    );

    // Summary grid should show dashes for missing data
    const summaryGrid = container.querySelector('.grid') as HTMLElement;
    expect(summaryGrid).not.toBeNull();
    expect(within(summaryGrid).getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});
