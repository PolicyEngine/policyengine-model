import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BehavioralResponses from '../components/theory/BehavioralResponses';

// jsdom has no layout engine, so these guard the classes behind the 375px
// layout measured in a browser. The table's 400px min-width made the page
// 450px wide; once the page fits, a two-column grid would squeeze the chart
// to 98px.
describe('BehavioralResponses mobile layout', () => {
  it('stacks the concepts and budget-constraint chart below md', () => {
    render(<BehavioralResponses country="us" />);
    const grid = screen.getByText('Budget constraint: baseline vs. reform').closest('.tw\\:grid');
    expect(grid).not.toBeNull();
    const classes = grid!.className.split(/\s+/);
    expect(classes).toContain('tw:grid-cols-1');
    expect(classes).toContain('tw:md:grid-cols-2');
    expect(classes).not.toContain('tw:grid-cols-2');
  });

  it('fits the elasticity table to the viewport and contains any overflow', () => {
    const { container } = render(<BehavioralResponses country="us" />);
    const table = container.querySelector('table')!;
    const tableClasses = table.className.split(/\s+/);
    expect(tableClasses.filter((c) => c.startsWith('tw:min-w-') && c !== 'tw:min-w-0')).toEqual([]);
    expect(table.style.minWidth).toBe('');
    const classes = table.parentElement!.className.split(/\s+/);
    expect(classes).toContain('tw:overflow-x-auto');
    expect(classes).toContain('tw:[contain:inline-size]');
  });
});
