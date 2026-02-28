export interface Household {
  id: number;
  name: string;
  earnings: number;
  children: number;
  weight: number;
}

export interface MicrosimStep {
  id: number;
  title: string;
  description: string;
  ingredient: 'policies' | 'households' | 'dynamics' | null;
}

export interface Column {
  key: string;
  label: string;
  /** First step index where this column appears */
  visibleFrom: number;
  align: 'left' | 'right';
}

export const sampleHouseholds: Household[] = [
  { id: 1, name: 'Household A', earnings: 30000, children: 2, weight: 25000 },
  { id: 2, name: 'Household B', earnings: 75000, children: 1, weight: 35000 },
  { id: 3, name: 'Household C', earnings: 120000, children: 0, weight: 28000 },
  { id: 4, name: 'Household D', earnings: 50000, children: 3, weight: 42000 },
  { id: 5, name: 'Household E', earnings: 200000, children: 1, weight: 20000 },
];

function fmt(n: number, currency: string): string {
  return currency + Math.abs(n).toLocaleString();
}

function fmtSigned(n: number, currency: string): string {
  if (n < 0) return '-' + currency + Math.abs(n).toLocaleString();
  if (n === 0) return currency + '0';
  return '+' + currency + n.toLocaleString();
}

function baselineTax(earnings: number): number {
  if (earnings <= 40000) return Math.round(earnings * 0.1);
  if (earnings <= 85000) return 4000 + Math.round((earnings - 40000) * 0.22);
  return 13900 + Math.round((earnings - 85000) * 0.32);
}

function reformTax(earnings: number, children: number, creditPerChild: number): number {
  const base = baselineTax(earnings);
  const credit = children * creditPerChild;
  return Math.max(0, base - credit);
}

function behavioralEarnings(earnings: number, children: number, creditPerChild: number): number {
  const mtrBefore = earnings <= 40000 ? 0.1 : earnings <= 85000 ? 0.22 : 0.32;
  const creditRate = children > 0 ? (children * creditPerChild) / earnings : 0;
  const elasticity = 0.25;
  const mtrAfter = Math.max(0, mtrBefore - creditRate);
  const pctChange = -elasticity * (mtrAfter - mtrBefore) / (1 - mtrBefore);
  return Math.round(earnings * (1 + pctChange));
}

export function getColumns(country: string): Column[] {
  return [
    { key: 'household', label: 'Household', visibleFrom: 0, align: 'left' },
    { key: 'earnings', label: 'Earnings', visibleFrom: 0, align: 'right' },
    { key: 'children', label: 'Children', visibleFrom: 0, align: 'right' },
    { key: 'baselineTax', label: 'Baseline tax', visibleFrom: 1, align: 'right' },
    { key: 'reformTax', label: 'Reform tax', visibleFrom: 2, align: 'right' },
    { key: 'taxChange', label: 'Tax change', visibleFrom: 2, align: 'right' },
    { key: 'weight', label: 'Weight', visibleFrom: 4, align: 'right' },
    { key: 'impact', label: 'Revenue impact', visibleFrom: 4, align: 'right' },
  ];
}

/**
 * Get cell values for a household at a given step.
 * At step 3+, earnings are adjusted for behavioral response.
 */
export function getCellValues(
  h: Household,
  stepIdx: number,
  country: string,
): Record<string, string> {
  const c = country === 'uk' ? '£' : '$';
  const creditPerChild = country === 'uk' ? 2000 : 3000;

  const useBehavioral = stepIdx >= 3;
  const ern = useBehavioral
    ? behavioralEarnings(h.earnings, h.children, creditPerChild)
    : h.earnings;

  const base = baselineTax(h.earnings);
  const reform = reformTax(ern, h.children, creditPerChild);
  const change = reform - base;

  return {
    household: h.name,
    earnings: fmt(ern, c),
    children: String(h.children),
    baselineTax: fmt(base, c),
    reformTax: fmt(reform, c),
    taxChange: fmtSigned(change, c),
    weight: h.weight.toLocaleString(),
    impact: fmtSigned(change * h.weight, c),
  };
}

/** Total row for step 4 (weight & aggregate). */
export function getTotalRow(
  stepIdx: number,
  country: string,
): Record<string, string> {
  const c = country === 'uk' ? '£' : '$';
  const creditPerChild = country === 'uk' ? 2000 : 3000;

  let totalImpact = 0;
  for (const h of sampleHouseholds) {
    const ern = stepIdx >= 3
      ? behavioralEarnings(h.earnings, h.children, creditPerChild)
      : h.earnings;
    const base = baselineTax(h.earnings);
    const reform = reformTax(ern, h.children, creditPerChild);
    totalImpact += (reform - base) * h.weight;
  }

  return {
    household: 'Total',
    earnings: '',
    children: '',
    baselineTax: '',
    reformTax: '',
    taxChange: '',
    weight: '',
    impact: fmtSigned(totalImpact, c),
  };
}

export function getMicrosimSteps(country: string): MicrosimStep[] {
  const creditPerChild = country === 'uk' ? 2000 : 3000;
  const c = country === 'uk' ? '£' : '$';
  const creditLabel = `${c}${creditPerChild.toLocaleString()}/child tax credit`;

  return [
    {
      id: 0,
      title: 'Start with households',
      description: 'A representative sample of households, each with their own characteristics.',
      ingredient: 'households',
    },
    {
      id: 1,
      title: 'Calculate baseline taxes',
      description: 'Apply current tax rules to each household to compute their tax liability.',
      ingredient: 'policies',
    },
    {
      id: 2,
      title: 'Calculate reform taxes',
      description: `Apply the proposed reform (e.g., ${creditLabel}) to compute new tax liability.`,
      ingredient: 'policies',
    },
    {
      id: 3,
      title: country === 'uk' ? 'Model behavioural responses' : 'Model behavioral responses',
      description: country === 'uk'
        ? 'People change their behaviour in response to tax changes. Using elasticity of taxable income, we estimate how earnings shift.'
        : 'People change their behavior in response to tax changes. Using elasticity of taxable income, we estimate how earnings shift.',
      ingredient: 'dynamics',
    },
    {
      id: 4,
      title: 'Weight and aggregate',
      description: country === 'uk'
        ? 'Each household represents many real households. Multiply by survey weights and sum for population-level estimates.'
        : 'Each household represents many real households. Multiply by survey weights and sum for population-level estimates.',
      ingredient: null,
    },
  ];
}
