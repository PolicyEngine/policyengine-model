import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import CoverageProvenance from '../components/rules/CoverageProvenance';
import CoverageTrackerPage from '../views/rules/CoverageTrackerPage';
import { fetchProgramsWithSource, type ProgramsSource } from '../data/fetchPrograms';

vi.mock('../data/fetchPrograms', () => ({
  fetchProgramsWithSource: vi.fn(),
}));

const snapshotSource: Extract<ProgramsSource, { kind: 'snapshot' }> = {
  kind: 'snapshot',
  repo: 'PolicyEngine/policyengine-us',
  branch: 'main',
  commit: 'abcdef1234567890',
  fetchedAt: '2026-09-08T12:34:56.000Z',
  version: '1.823.0',
  apiVersion: '1.764.6',
};

const snapshotText = 'Coverage reflects policyengine-us 1.823.0 (main @ abcdef1, fetched 2026-09-08). The production API served 1.764.6 when the snapshot was fetched.';

describe('Coverage provenance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows the snapshot version, branch, short commit, fetch date, and API version', () => {
    render(<CoverageProvenance source={snapshotSource} />);
    expect(screen.getByText(snapshotText)).toBeInTheDocument();
  });

  it('dates the API version to the fetch time for an older snapshot instead of claiming it is current', () => {
    render(<CoverageProvenance source={{ ...snapshotSource, fetchedAt: '2026-06-01T08:00:00.000Z', apiVersion: '1.700.0' }} />);
    expect(screen.getByText('Coverage reflects policyengine-us 1.823.0 (main @ abcdef1, fetched 2026-06-01). The production API served 1.700.0 when the snapshot was fetched.')).toBeInTheDocument();
    expect(screen.queryByText(/currently/)).not.toBeInTheDocument();
  });

  it('omits the API version sentence when it was unavailable at snapshot time', () => {
    render(<CoverageProvenance source={{ ...snapshotSource, apiVersion: undefined }} />);
    expect(screen.getByText('Coverage reflects policyengine-us 1.823.0 (main @ abcdef1, fetched 2026-09-08).')).toBeInTheDocument();
    expect(screen.queryByText(/production API/)).not.toBeInTheDocument();
  });

  it('identifies coverage loaded from the production API', () => {
    render(<CoverageProvenance source={{
      kind: 'api',
      repo: 'PolicyEngine/policyengine-us',
      apiVersion: '1.764.6',
    }} />);
    expect(screen.getByText('Coverage reflects the production API, policyengine-us 1.764.6.')).toBeInTheDocument();
  });

  it('identifies an unavailable production API version', () => {
    render(<CoverageProvenance source={{ kind: 'api', repo: 'PolicyEngine/policyengine-us' }} />);
    expect(screen.getByText('Coverage reflects the production API, policyengine-us (version unavailable).')).toBeInTheDocument();
  });

  it('identifies bundled fallback coverage', () => {
    render(<CoverageProvenance source={{ kind: 'fallback' }} />);
    expect(screen.getByText('Coverage reflects the bundled fallback registry.')).toBeInTheDocument();
  });

  it('renders the loaded source and derives TANF summary counts from the registry', async () => {
    vi.mocked(fetchProgramsWithSource).mockResolvedValue({
      source: snapshotSource,
      programs: [{
        id: 'tanf',
        name: 'TANF',
        fullName: 'Temporary Assistance for Needy Families',
        status: 'complete',
        agency: 'HHS',
        stateImplementations: [
          { state: 'CA', status: 'complete', githubLinks: {} },
          { state: 'NY', status: 'complete', githubLinks: {} },
        ],
        githubLinks: {},
      }],
    });

    render(<CoverageTrackerPage country="us" />);

    expect(await screen.findByText(snapshotText)).toBeInTheDocument();
    expect(fetchProgramsWithSource).toHaveBeenCalledWith('us');
    const totalCard = screen.getByText('Total programs').parentElement!;
    expect(within(totalCard).getByText('1')).toBeInTheDocument();
    const completeCard = screen.getAllByText('Complete')[0].parentElement!;
    expect(within(completeCard).getByText('1')).toBeInTheDocument();
    const partialCard = screen.getAllByText('Partial')[0].parentElement!;
    expect(within(partialCard).getByText('0')).toBeInTheDocument();
  });

  it('preserves the static UK introduction without assigning it registry provenance', () => {
    render(<CoverageTrackerPage country="uk" />);
    expect(screen.getByText(/PolicyEngine UK models over 50/)).toBeInTheDocument();
    expect(screen.queryByText(/Coverage reflects/)).not.toBeInTheDocument();
    expect(fetchProgramsWithSource).not.toHaveBeenCalled();
  });
});
