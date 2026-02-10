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

function fmt(n: number): string {
  return '$' + n.toLocaleString();
}

function baselineTax(earnings: number): number {
  if (earnings <= 40000) return Math.round(earnings * 0.1);
  if (earnings <= 85000) return 4000 + Math.round((earnings - 40000) * 0.22);
  return 13900 + Math.round((earnings - 85000) * 0.32);
}

function reformTax(earnings: number, children: number): number {
  const base = baselineTax(earnings);
  const credit = children * 3000;
  return Math.max(0, base - credit);
}

function behavioralEarnings(earnings: number, children: number): number {
  const mtrBefore = earnings <= 40000 ? 0.1 : earnings <= 85000 ? 0.22 : 0.32;
  const creditRate = children > 0 ? (children * 3000) / earnings : 0;
  const elasticity = 0.25;
  const mtrAfter = Math.max(0, mtrBefore - creditRate);
  const pctChange = -elasticity * (mtrAfter - mtrBefore) / (1 - mtrBefore);
  return Math.round(earnings * (1 + pctChange));
}

export const microsimSteps: MicrosimStep[] = [
  {
    id: 0,
    title: 'Start with households',
    description: 'A representative sample of households, each with their own characteristics.',
    ingredient: 'households',
    columns: ['Household', 'Earnings', 'Children'],
    getRowData: (h) => [h.name, fmt(h.earnings), h.children],
  },
  {
    id: 1,
    title: 'Calculate baseline taxes',
    description: 'Apply current tax rules to each household to compute their tax liability.',
    ingredient: 'policies',
    columns: ['Household', 'Earnings', 'Baseline tax'],
    getRowData: (h) => [h.name, fmt(h.earnings), fmt(baselineTax(h.earnings))],
  },
  {
    id: 2,
    title: 'Calculate reform taxes',
    description: 'Apply the proposed reform (e.g., $3,000/child tax credit) to compute new tax liability.',
    ingredient: 'policies',
    columns: ['Household', 'Baseline tax', 'Reform tax', 'Change'],
    getRowData: (h) => {
      const base = baselineTax(h.earnings);
      const reform = reformTax(h.earnings, h.children);
      return [h.name, fmt(base), fmt(reform), fmt(reform - base)];
    },
  },
  {
    id: 3,
    title: 'Model behavioral responses',
    description: 'People change their behavior in response to tax changes. Using elasticity of taxable income, we estimate how earnings shift.',
    ingredient: 'dynamics',
    columns: ['Household', 'Original earnings', 'Adjusted earnings', 'Final tax'],
    getRowData: (h) => {
      const adj = behavioralEarnings(h.earnings, h.children);
      const finalTax = reformTax(adj, h.children);
      return [h.name, fmt(h.earnings), fmt(adj), fmt(finalTax)];
    },
  },
  {
    id: 4,
    title: 'Weight and aggregate',
    description: 'Each household represents many real households. Multiply by survey weights and sum for population-level estimates.',
    ingredient: null,
    columns: ['Household', 'Tax change', 'Weight', 'Weighted impact'],
    getRowData: (h) => {
      const adj = behavioralEarnings(h.earnings, h.children);
      const base = baselineTax(h.earnings);
      const reform = reformTax(adj, h.children);
      const change = reform - base;
      const weight = Math.round(20000 + Math.random() * 30000);
      return [h.name, fmt(change), weight.toLocaleString(), fmt(change * weight)];
    },
  },
];
