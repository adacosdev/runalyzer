// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { LactateClearanceSection } from '../LactateClearanceSection';
import type { LactateClearanceResult } from '../../domain/types';

afterEach(() => cleanup());

function makeClearance(overrides: Partial<LactateClearanceResult> = {}): LactateClearanceResult {
  return {
    intervals: [
      {
        name: 'Recuperacion 1',
        peakHR: 178,
        endHR: 130,
        dropBpm: 48,
        dropPercent: 26.97,
        quality: 'excellent',
      },
    ],
    averageDropPercent: 26.97,
    overallQuality: 'excellent',
    verdict: 'Excelente eliminación de lactato (26.97% de caída). Tu sistema está muy adaptado para reciclar energía durante la recuperación.',
    hasIntervals: true,
    ...overrides,
  };
}

describe('LactateClearanceSection', () => {
  it('renders overall quality label', () => {
    render(<LactateClearanceSection clearance={makeClearance()} />);

    // "Excelente" appears in overall badge and per-interval badge — check at least one
    expect(screen.getAllByText('Excelente').length).toBeGreaterThanOrEqual(1);
  });

  it('renders average drop percent in the badge', () => {
    render(<LactateClearanceSection clearance={makeClearance()} />);

    // 26.97.toFixed(1) = "27.0", rendered as "27.0%"
    expect(screen.getAllByText('27.0%').length).toBeGreaterThanOrEqual(1);
  });

  it('renders overall verdict text', () => {
    render(<LactateClearanceSection clearance={makeClearance()} />);

    expect(screen.getByText(/Excelente eliminación de lactato/)).toBeInTheDocument();
  });

  it('renders recovery interval name', () => {
    render(<LactateClearanceSection clearance={makeClearance()} />);

    expect(screen.getByText('Recuperacion 1')).toBeInTheDocument();
  });

  it('renders peak and end HR for interval', () => {
    render(<LactateClearanceSection clearance={makeClearance()} />);

    expect(screen.getByText('178 bpm')).toBeInTheDocument(); // peakHR
    expect(screen.getByText('130 bpm')).toBeInTheDocument(); // endHR
  });

  it('renders drop bpm for interval', () => {
    render(<LactateClearanceSection clearance={makeClearance()} />);

    expect(screen.getByText(/48 bpm/)).toBeInTheDocument();
  });

  it('renders good quality label', () => {
    const clearance = makeClearance({
      overallQuality: 'good',
      verdict: 'Buena recuperación (20.0% de caída). Tu capacidad de reciclaje de lactato está desarrollando bien.',
      averageDropPercent: 20,
      intervals: [],
    });

    render(<LactateClearanceSection clearance={clearance} />);

    expect(screen.getByText('Buena')).toBeInTheDocument();
  });

  it('renders poor quality label for limited recovery', () => {
    const clearance = makeClearance({
      overallQuality: 'poor',
      verdict: 'Recuperación limitada (5.0% de caída). Considera extender la recuperación.',
      averageDropPercent: 5,
      intervals: [],
    });

    render(<LactateClearanceSection clearance={clearance} />);

    expect(screen.getByText('Limitada')).toBeInTheDocument();
  });

  it('does not render interval list section when intervals are empty', () => {
    const clearance = makeClearance({ intervals: [] });

    render(<LactateClearanceSection clearance={clearance} />);

    expect(screen.queryByText('Intervalos de recuperación')).not.toBeInTheDocument();
  });
});
