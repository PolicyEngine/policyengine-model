import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import Sidebar from '../components/layout/Sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logo and "Model" text', () => {
    render(<Sidebar country="us" />);
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByAltText('PolicyEngine')).toBeInTheDocument();
  });

  it('renders all top-level nav items', () => {
    render(<Sidebar country="us" />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Rules')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Behavioral responses')).toBeInTheDocument();
  });

  it('uses UK spelling when country=uk', () => {
    render(<Sidebar country="uk" />);
    expect(screen.getByText('Behavioural responses')).toBeInTheDocument();
  });

  it('expands Rules to show children when clicked', () => {
    render(<Sidebar country="us" />);
    fireEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('Coverage tracker')).toBeInTheDocument();
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Variables')).toBeInTheDocument();
  });

  it('expands Data to show children when clicked', () => {
    render(<Sidebar country="us" />);
    fireEvent.click(screen.getByText('Data'));
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Calibration Targets')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });
});
