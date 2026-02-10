export interface Household {
  id: number;
  name: string;
  earnings: number;
  children: number;
}

export interface MicrosimStep {
  id: number;
  title: string;
  description: string;
  ingredient: 'policies' | 'households' | 'dynamics' | null;
  columns: string[];
  getRowData: (h: Household) => (string | number)[];
}

export const sampleHouseholds: Household[] = [
  { id: 1, name: 'Household A', earnings: 30000, children: 2 },
  { id: 2, name: 'Household B', earnings: 75000, children: 1 },
  { id: 3, name: 'Household C', earnings: 120000, children: 0 },
  { id: 4, name: 'Household D', earnings: 50000, children: 3 },
  { id: 5, name: 'Household E', earnings: 200000, children: 1 },
];

function fmt(n: number, currency: string): string {
  return currency + n.toLocaleString();
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

export function getMicrosimSteps(country: string): MicrosimStep[] {
  const c = country === 'uk' ? '£' : '$';
  const creditPerChild = country === 'uk' ? 2000 : 3000;
  const creditLabel = country === 'uk'
    ? `£${creditPerChild.toLocaleString()}/child tax credit`
    : `$${creditPerChild.toLocaleString()}/child tax credit`;

  return [
    {
      id: 0,
      title: 'Start with households',
      description: 'A representative sample of households, each with their own characteristics.',
      ingredient: 'households',
      columns: ['Household', 'Earnings', 'Children'],
      getRowData: (h) => [h.name, fmt(h.earnings, c), h.children],
    },
    {
      id: 1,
      title: 'Calculate baseline taxes',
      description: 'Apply current tax rules to each household to compute their tax liability.',
      ingredient: 'policies',
      columns: ['Household', 'Earnings', 'Baseline tax'],
      getRowData: (h) => [h.name, fmt(h.earnings, c), fmt(baselineTax(h.earnings), c)],
    },
    {
      id: 2,
      title: 'Calculate reform taxes',
      description: `Apply the proposed reform (e.g., ${creditLabel}) to compute new tax liability.`,
      ingredient: 'policies',
      columns: ['Household', 'Baseline tax', 'Reform tax', 'Change'],
      getRowData: (h) => {
        const base = baselineTax(h.earnings);
        const reform = reformTax(h.earnings, h.children, creditPerChild);
        return [h.name, fmt(base, c), fmt(reform, c), fmt(reform - base, c)];
      },
    },
    {
      id: 3,
      title: country === 'uk' ? 'Model behavioural responses' : 'Model behavioral responses',
      description: country === 'uk'
        ? 'People change their behaviour in response to tax changes. Using elasticity of taxable income, we estimate how earnings shift.'
        : 'People change their behavior in response to tax changes. Using elasticity of taxable income, we estimate how earnings shift.',
      ingredient: 'dynamics',
      columns: ['Household', 'Original earnings', 'Adjusted earnings', 'Final tax'],
      getRowData: (h) => {
        const adj = behavioralEarnings(h.earnings, h.children, creditPerChild);
        const finalTax = reformTax(adj, h.children, creditPerChild);
        return [h.name, fmt(h.earnings, c), fmt(adj, c), fmt(finalTax, c)];
      },
    },
    {
      id: 4,
      title: 'Weight and aggregate',
      description: 'Each household in our survey data represents many real households. We determine weights using official government surveys (the Current Population Survey in the US, the Family Resources Survey in the UK) to ensure our sample matches the true population, then multiply and sum for population-level estimates.',
      ingredient: null,
      columns: ['Household', 'Tax change', 'Weight', 'Weighted impact'],
      getRowData: (h) => {
        const adj = behavioralEarnings(h.earnings, h.children, creditPerChild);
        const base = baselineTax(h.earnings);
        const reform = reformTax(adj, h.children, creditPerChild);
        const change = reform - base;
        const weight = Math.round(20000 + Math.random() * 30000);
        return [h.name, fmt(change, c), weight.toLocaleString(), fmt(change * weight, c)];
      },
    },
  ];
}
