import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import ValidationPage from '../views/data/ValidationPage';
import BehavioralResponses from '../components/theory/BehavioralResponses';
import { cboDefaults, sources, ukCapitalGains, UK_CAPITAL_GAINS_SOURCE_URL } from '../data/elasticities';

describe('Validation page', () => {
  it('points the UK to the scorecard, not TAXSIM', () => {
    const { container } = render(<ValidationPage country="uk" />);
    expect(screen.getByText(/compares its UK estimates with figures that others publish/)).toBeInTheDocument();
    const link = container.querySelector('a[href="https://www.policyengine.org/scorecard?country=uk"]');
    expect(link).toHaveTextContent('Open the UK scorecard');
    expect(container.textContent).not.toMatch(/TAXSIM|federal|state income/);
  });

  it('keeps the US TAXSIM validation', () => {
    const { container } = render(<ValidationPage country="us" />);
    expect(
      screen.getByText(
        "PolicyEngine validates its tax calculations against NBER's TAXSIM model, comparing results across thousands of household configurations. The full interactive comparison is available in our Jupyter Book documentation.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('TAXSIM validation book')).toBeInTheDocument();
    expect(container.querySelector('a[href="https://policyengine.github.io/policyengine-us"]')).toHaveTextContent('View full validation');
  });
});

describe('Capital gains elasticity', () => {
  it('shows policyengine-uk’s retention-rate response for the UK', () => {
    const { container } = render(<BehavioralResponses country="uk" />);
    expect(screen.getByText(/scales each person’s/)).toBeInTheDocument();
    for (const value of [ukCapitalGains.retentionElasticity, ...ukCapitalGains.sensitivities]) {
      expect(screen.getByText(value.toFixed(2))).toBeInTheDocument();
    }
    expect(container.querySelector(`a[href="${UK_CAPITAL_GAINS_SOURCE_URL}"]`)).toHaveTextContent(sources.ukCapitalGains);
    expect(screen.queryByText(sources.capitalGains)).toBeNull();
    expect(screen.queryByText(cboDefaults.capitalGainsPersistent.toFixed(2))).toBeNull();
  });

  it('keeps the CBO elasticities for the US', () => {
    render(<BehavioralResponses country="us" />);
    expect(screen.getByText(cboDefaults.capitalGainsPersistent.toFixed(2))).toBeInTheDocument();
    expect(screen.getByText(cboDefaults.capitalGainsTransitory.toFixed(2))).toBeInTheDocument();
    expect(screen.getByText(sources.capitalGains)).toBeInTheDocument();
    expect(screen.queryByText(/scales each person’s/)).toBeNull();
  });
});
