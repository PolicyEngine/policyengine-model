import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { createElement, forwardRef, Fragment, type ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// Render motion elements as plain elements, so a stage's details appear as
// soon as it is selected (jsdom runs no animations).
vi.mock('framer-motion', () => {
  const strip = (props: Record<string, unknown>) => {
    const rest = { ...props };
    for (const key of ['initial', 'animate', 'exit', 'transition', 'layout', 'whileHover', 'whileTap']) delete rest[key];
    return rest;
  };
  const cache = new Map<string, unknown>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, forwardRef((props: Record<string, unknown>, ref) => createElement(tag, { ...strip(props), ref })));
        }
        return cache.get(tag);
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children),
  };
});

import CalibrationPage from '../views/data/CalibrationPage';
import PipelinePage from '../views/data/PipelinePage';
import usCalibrationTargets from '../data/calibrationTargets.json';
import { pipelineStages } from '../data/pipelineStages';
import { ukPipelineStages } from '../data/ukPipelineStages';
import { describeUkTargets, formatUkValue, ukCalibration } from '../views/data/UkCalibrationPage';

const n = (x: number) => x.toLocaleString('en-GB');

function rowElement(container: HTMLElement, key: string): HTMLElement {
  const row = container.querySelector(`tr[data-row-key="${key}"]`);
  expect(row, key).not.toBeNull();
  return row as HTMLElement;
}

describe('UK calibration page', () => {
  it('lists every row of ukCalibrationTargets.json', () => {
    const { container } = render(<CalibrationPage country="uk" />);
    expect(container.querySelector('h1')).toHaveTextContent('Calibration targets');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(ukCalibration.rows.length);
    expect(screen.getByText(`${ukCalibration.rows.length} target groups shown`)).toBeInTheDocument();
    expect(screen.queryByText(/currently available for the US model only/)).toBeNull();
  });

  it('derives the header counts from the JSON', () => {
    render(<CalibrationPage country="uk" />);
    const description = describeUkTargets(ukCalibration);
    expect(screen.getByText(description)).toBeInTheDocument();
    const { national, localArea } = ukCalibration.totalTargets;
    const dense = ukCalibration.levelCounts.localArea;
    expect(description).toContain(`calibrated to ${n(national)} targets`);
    expect(description).toContain(`all ${n(localArea)} targets`);
    expect(description).toContain(`${n(dense.constituency + dense.localAuthority + dense.other)} cells`);
    expect(description).toContain(`calendar ${ukCalibration.calibrationYear}`);
    // the release ids the table was extracted from
    expect(screen.getByText(ukCalibration.releases.national.buildId)).toBeInTheDocument();
    expect(screen.getByText(ukCalibration.releases.localArea.buildId)).toBeInTheDocument();
  });

  it('shows UK levels with their counts and published values', () => {
    const { container } = render(<CalibrationPage country="uk" />);
    const income = ukCalibration.rows.find((r) => r.key === 'ledger|obr.income_tax|')!;
    const incomeRow = rowElement(container, income.key);
    expect(within(incomeRow).getByText('UK')).toBeInTheDocument();
    expect(within(incomeRow).getByText(formatUkValue(income.nationalValue, 'gbp'))).toBeInTheDocument();

    const age = ukCalibration.rows.find((r) => r.key === 'local|age|age_band')!;
    const ageRow = rowElement(container, age.key);
    expect(within(ageRow).getByText(`Constituency (${n(age.constituencyCount)})`)).toBeInTheDocument();
    expect(within(ageRow).getByText(`Local authority (${n(age.localAuthorityCount)})`)).toBeInTheDocument();
    expect(within(ageRow).getByText('—')).toBeInTheDocument();

    const brma = ukCalibration.rows.find((r) => r.otherCount > 0)!;
    expect(within(rowElement(container, brma.key)).getByText(`Scottish BRMA (${brma.otherCount})`)).toBeInTheDocument();

    // a row with one nation names it
    const scotland = ukCalibration.rows.find((r) => r.key === 'ledger|nrs.households_total|')!;
    const scotlandRow = rowElement(container, scotland.key);
    expect(within(scotlandRow).getAllByText('Scotland').length).toBeGreaterThan(0);
    expect(within(scotlandRow).getByText('National Records of Scotland')).toBeInTheDocument();
  });

  it('every level badge count matches the row counts in the JSON', () => {
    const levelTotals = { uk: 0, gb: 0, englandAndWales: 0, nation: 0, region: 0, constituency: 0, localAuthority: 0, other: 0 };
    for (const r of ukCalibration.rows) {
      levelTotals.uk += r.nationalCount;
      levelTotals.gb += r.gbCount;
      levelTotals.englandAndWales += r.englandAndWalesCount;
      levelTotals.nation += r.nationCount;
      levelTotals.region += r.regionCount;
      levelTotals.constituency += r.constituencyCount;
      levelTotals.localAuthority += r.localAuthorityCount;
      levelTotals.other += r.otherCount;
    }
    expect(levelTotals).toEqual(ukCalibration.levelCounts.union);
    expect(ukCalibration.rows.reduce((s, r) => s + r.targetCount, 0)).toBe(ukCalibration.totalTargets.union);
  });

  it('filters rows by search', () => {
    render(<CalibrationPage country="uk" />);
    fireEvent.change(screen.getByPlaceholderText('Search targets, breakdowns, sources...'), {
      target: { value: 'Scottish BRMA' },
    });
    const matching = ukCalibration.rows.filter((r) => r.otherCount > 0);
    expect(
      screen.getByText(`${matching.length} target group${matching.length === 1 ? '' : 's'} shown (filtered from ${ukCalibration.rows.length})`),
    ).toBeInTheDocument();
  });

  it('shows target values only, never fit', () => {
    const { container } = render(<CalibrationPage country="uk" />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/within 10%|relative error|final estimate|initial estimate|effective sample/i);
    const json = JSON.stringify(ukCalibration);
    for (const key of [
      'final_estimate',
      'initial_estimate',
      'relative_error',
      'within_tolerance',
      'fraction_within_10pct',
      'withinTenPctShare',
      'effective_sample_size',
      'carrier_floor_met',
      'target_loss_weight',
    ]) {
      expect(json).not.toContain(`"${key}":`);
    }
  });

  it('keeps the table from widening the page on phones', () => {
    const { container } = render(<CalibrationPage country="uk" />);
    const classes = container.querySelector('table')!.parentElement!.className.split(/\s+/);
    expect(classes).toContain('tw:overflow-x-auto');
    expect(classes).toContain('tw:[contain:inline-size]');
  });
});

describe('US calibration page', () => {
  it('is unchanged', () => {
    const { container } = render(<CalibrationPage country="us" />);
    const rows = usCalibrationTargets as { nationalCount: number; stateCount: number; districtCount: number }[];
    const targetCount = rows.reduce((s, t) => s + t.nationalCount + t.stateCount + t.districtCount, 0);
    expect(
      screen.getByText(
        `PolicyEngine calibrates household survey weights using L0-regularized optimization so that weighted aggregates match ${targetCount.toLocaleString()} administrative targets from IRS, CBO, Census, CMS, and other agencies across national, state, and congressional district levels.`,
      ),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(rows.length);
    expect(screen.getByText(`${rows.length} unique targets shown`)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search variables, domains, sources...')).toBeInTheDocument();
    expect(container.querySelector('tr[data-row-key]')).toBeNull();
  });
});

// Everything the UK pipeline page can show: the intro, then each stage with
// its imputation and target tables opened in turn.
function ukPipelineText(): string {
  const { container } = render(<PipelinePage country="uk" />);
  const button = (prefix: string) =>
    Array.from(container.querySelectorAll('button')).find((b) => (b.textContent ?? '').startsWith(prefix));
  const parts = [container.textContent ?? ''];
  for (const stage of ukPipelineStages) {
    const stageButton = button(`${stage.title}${stage.subtitle}`);
    expect(stageButton, stage.id).toBeDefined();
    fireEvent.click(stageButton!);
    parts.push(container.textContent ?? '');
    for (const section of ['Imputations and transformations', 'Calibration target domains']) {
      const toggle = button(section);
      if (toggle) {
        fireEvent.click(toggle);
        parts.push(container.textContent ?? '');
      }
    }
  }
  return parts.join('\n');
}

describe('UK pipeline page', () => {
  it('describes Microcosm UK', () => {
    render(<PipelinePage country="uk" />);
    expect(screen.getByText(/runs on Microcosm UK/)).toBeInTheDocument();
    expect(screen.getByText('National file', { selector: 'div.tw\\:uppercase' })).toBeInTheDocument();
    expect(screen.getByText('Local-area file', { selector: 'div.tw\\:uppercase' })).toBeInTheDocument();
  });

  it('has none of the Enhanced FRS pipeline’s stale phrases', { timeout: 20000 }, () => {
    const text = ukPipelineText();
    for (const stale of [
      '2023-24',
      '~20,000',
      '20,000 households',
      'Round 7',
      'round 7',
      'weight matrix',
      'weight matrices',
      '650 × N',
      '360 local authorities',
      'policyengine-uk-data',
      'Enhanced Family Resources Survey',
      'Enhanced FRS is',
    ]) {
      expect(text, stale).not.toContain(stale);
    }
  });

  it('mentions the Enhanced FRS only as the previous default or a reference', () => {
    render(<PipelinePage country="uk" />);
    const strings = [
      screen.getByText(/runs on Microcosm UK/).textContent ?? '',
      ...ukPipelineStages.flatMap((s) => [
        s.title,
        s.subtitle,
        s.description,
        ...s.details,
        ...(s.dataSources ?? []),
        ...(s.imputations ?? []).flatMap((i) => [i.name, i.source, i.method]),
        ...(s.calibrationTargets ?? []).flatMap((t) => [t.variable, t.target, t.source]),
      ]),
    ];
    const mentions = strings.flatMap((s) => s.split(/(?<=[.;])\s+/)).filter((s) => s.includes('Enhanced FRS'));
    expect(mentions.length).toBeGreaterThan(0);
    for (const sentence of mentions) {
      expect(sentence).toMatch(/replaced the Enhanced FRS|pinned Enhanced FRS|comparison with the Enhanced FRS/);
    }
  });

  it('scrolls the flow inside its box on phones', () => {
    const { container } = render(<PipelinePage country="uk" />);
    const box = container.querySelector('.tw\\:\\[contain\\:inline-size\\]');
    expect(box).not.toBeNull();
    expect(box!.className.split(/\s+/)).toContain('tw:overflow-x-auto');
    expect((box!.firstElementChild as HTMLElement).style.minWidth).toBe(`${ukPipelineStages.filter((s) => s.branch === 'shared').length * 110}px`);
  });
});

describe('UK pipeline stage tables', () => {
  it('scroll inside their box on phones', () => {
    const { container } = render(<PipelinePage country="uk" />);
    const toggle = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').startsWith('Imputations and transformations'),
    );
    fireEvent.click(toggle!);
    const classes = container.querySelector('table')!.parentElement!.className.split(/\s+/);
    expect(classes).toContain('tw:overflow-x-auto');
    expect(classes).toContain('tw:[contain:inline-size]');
  });
});

describe('US pipeline page', () => {
  it('is unchanged', () => {
    const { container } = render(<PipelinePage country="us" />);
    expect(
      screen.getByText(
        'PolicyEngine constructs its representative household dataset through a 14-step pipeline. Public survey data is merged, stratified, and cloned to 10 geographic variants per household. Each clone is simulated through PolicyEngine US with stochastic take-up, then calibrated via L0-regularized optimization against administrative targets at the national, state, and congressional district levels simultaneously, producing 488 geographically representative datasets.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Geography-specific')).toBeInTheDocument();
    expect(container.querySelector('.tw\\:\\[contain\\:inline-size\\]')).toBeNull();
    const toggle = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').startsWith('Imputations and transformations'),
    );
    fireEvent.click(toggle!);
    expect(container.querySelector('table')!.parentElement!.className).toBe('tw:py-3');
    for (const stage of pipelineStages) {
      expect(screen.getAllByText(stage.title).length).toBeGreaterThan(0);
    }
  });
});
