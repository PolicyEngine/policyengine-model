import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import ValidationPage from '../views/data/ValidationPage';
import BehavioralResponses from '../components/theory/BehavioralResponses';
import { BLOG_URL, cboDefaults, OBR_LABOUR_SUPPLY_NOTE_URL, sources, ukCapitalGains, UK_BEHAVIOURAL_REPORT_URL, UK_CAPITAL_GAINS_SOURCE_URL, ukLabourSupply } from '../data/elasticities';

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

describe('Labour supply responses', () => {
  it('shows the values PolicyEngine uses when the UK response is on, not the CBO presets', () => {
    const { container } = render(<BehavioralResponses country="uk" />);
    expect(screen.getByText('Labour supply elasticities')).toBeInTheDocument();
    expect(screen.getByText(/static on labour supply unless a reform turns the response on/)).toBeInTheDocument();
    expect(screen.getByText('Income elasticity')).toBeInTheDocument();
    expect(screen.getByText('Substitution elasticity')).toBeInTheDocument();
    expect(screen.getAllByText('central')).toHaveLength(2);
    expect(screen.queryAllByText('default')).toHaveLength(0);
    expect(screen.getByText(ukLabourSupply.incomeElasticity.toFixed(2))).toBeInTheDocument();
    expect(screen.getAllByText(ukLabourSupply.substitutionElasticity.toFixed(2)).length).toBeGreaterThan(0);
    expect(container.textContent).toContain('Illustration with PolicyEngine’s central values');
    expect(container.querySelector(`a[href="${UK_BEHAVIOURAL_REPORT_URL}"]`)).not.toBeNull();
    expect(container.querySelector(`a[href="${OBR_LABOUR_SUPPLY_NOTE_URL}"]`)).not.toBeNull();
    for (const gone of ['CBO preset elasticity parameters', 'Substitution elasticity by income decile', 'elasticity of taxable income', sources.elasticityReview]) {
      expect(container.textContent, gone).not.toContain(gone);
    }
    expect(container.querySelector(`a[href="${BLOG_URL}"]`)).toBeNull();
  });

  it('keeps the US CBO presets and methodology link', () => {
    const { container } = render(<BehavioralResponses country="us" />);
    expect(screen.getByText('CBO preset elasticity parameters')).toBeInTheDocument();
    expect(screen.getByText('Substitution elasticity by income decile')).toBeInTheDocument();
    expect(screen.getByText(sources.laborSupply)).toBeInTheDocument();
    expect(container.querySelector(`a[href="${BLOG_URL}"]`)).toHaveTextContent('Read our full methodology');
    expect(container.textContent).toContain('responses using the elasticity of taxable income framework');
    expect(screen.queryByText('Labour supply elasticities')).toBeNull();
  });
});
