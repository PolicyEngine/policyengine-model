import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/layout/Sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    window.location.hash = '';
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
    // Children should not be visible initially (unless auto-expanded)
    fireEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('Coverage tracker')).toBeInTheDocument();
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Variables')).toBeInTheDocument();
  });

  it('expands Data to show children when clicked', () => {
    render(<Sidebar country="us" />);
    fireEvent.click(screen.getByText('Data'));
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Calibration')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });
});
