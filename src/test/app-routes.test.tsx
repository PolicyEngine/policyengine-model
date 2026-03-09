import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

describe('App routing', () => {
  beforeEach(() => {
    window.location.hash = '';
    // Clear search params
    window.history.replaceState(null, '', window.location.pathname);
  });

  it('renders overview page by default', () => {
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('How microsimulation works');
  });

  it('renders coverage tracker for #/rules/coverage', () => {
    window.location.hash = '#/rules/coverage';
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('Coverage tracker');
  });

  it('renders parameters page for #/rules/parameters', () => {
    window.location.hash = '#/rules/parameters';
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('Parameters');
  });

  it('renders variables page for #/rules/variables', () => {
    window.location.hash = '#/rules/variables';
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('Variables');
  });

  it('renders pipeline page for #/data/pipeline', () => {
    window.location.hash = '#/data/pipeline';
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('Microdata pipeline');
  });

  it('renders calibration page for #/data/calibration', () => {
    window.location.hash = '#/data/calibration';
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('Calibration targets');
  });

  it('renders validation page for #/data/validation', () => {
    window.location.hash = '#/data/validation';
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('Validation');
  });

  it('renders behavioral page for #/behavioral', () => {
    window.location.hash = '#/behavioral';
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('Behavioral responses');
  });
});

describe('App embed mode', () => {
  it('hides sidebar when ?embed is present', () => {
    window.history.replaceState(null, '', '?embed=true');
    const { container } = render(<App />);
    // Sidebar has nav element with width 256px — should not be present in embed
    const nav = container.querySelector('nav');
    expect(nav).toBeNull();
  });
});

describe('App country param', () => {
  it('uses UK spelling for behavioral page when country=uk', () => {
    window.history.replaceState(null, '', '?country=uk');
    window.location.hash = '#/behavioral';
    const { container } = render(<App />);
    expect(container.querySelector('h1')).toHaveTextContent('Behavioural responses');
  });
});
