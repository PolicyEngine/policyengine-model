import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock next/navigation for all page component tests
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import OverviewPage from '../views/OverviewPage';
import CoverageTrackerPage from '../views/rules/CoverageTrackerPage';
import ParametersPage from '../views/rules/ParametersPage';
import VariablesPage from '../views/rules/VariablesPage';
import PipelinePage from '../views/data/PipelinePage';
import CalibrationPage from '../views/data/CalibrationPage';
import ValidationPage from '../views/data/ValidationPage';
import BehavioralPage from '../views/BehavioralPage';

describe('Page components render correctly', () => {
  it('renders overview page', () => {
    const { container } = render(<OverviewPage country="us" />);
    expect(container.querySelector('h1')).toHaveTextContent('How microsimulation works');
  });

  it('renders coverage tracker page', () => {
    const { container } = render(<CoverageTrackerPage country="us" />);
    expect(container.querySelector('h1')).toHaveTextContent('Coverage tracker');
  });

  it('renders parameters page', () => {
    const { container } = render(<ParametersPage country="us" />);
    expect(container.querySelector('h1')).toHaveTextContent('Parameters');
  });

  it('renders variables page', () => {
    const { container } = render(<VariablesPage country="us" />);
    expect(container.querySelector('h1')).toHaveTextContent('Variables');
  });

  it('renders pipeline page', () => {
    const { container } = render(<PipelinePage country="us" />);
    expect(container.querySelector('h1')).toHaveTextContent('Microdata pipeline');
  });

  it('renders calibration page', () => {
    const { container } = render(<CalibrationPage country="us" />);
    expect(container.querySelector('h1')).toHaveTextContent('Calibration targets');
  });

  it('renders validation page', () => {
    const { container } = render(<ValidationPage country="us" />);
    expect(container.querySelector('h1')).toHaveTextContent('Validation');
  });

  it('renders behavioral page with US spelling', () => {
    const { container } = render(<BehavioralPage country="us" />);
    expect(container.querySelector('h1')).toHaveTextContent('Behavioral responses');
  });

  it('renders behavioral page with UK spelling', () => {
    const { container } = render(<BehavioralPage country="uk" />);
    expect(container.querySelector('h1')).toHaveTextContent('Behavioural responses');
  });
});
