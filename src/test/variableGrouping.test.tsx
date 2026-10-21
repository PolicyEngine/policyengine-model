import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VariableExplorer from '../components/variables/VariableExplorer';
import type { Variable } from '../types/Variable';

const variable = (name: string, label: string, moduleName: string | null): Variable => ({
  name, label, moduleName, documentation: null, entity: 'household', valueType: 'float',
  definitionPeriod: 'year', unit: null, indexInModule: 0, isInputVariable: false,
  defaultValue: null, adds: null, subtracts: null, hidden_input: false, category: null,
});

describe('Variable explorer grouping', () => {
  it('keeps UK variables with unknown modules visible in their own group', () => {
    render(<VariableExplorer country="uk" parameters={{}} variables={{
      unknown: variable('unknown', 'Unknown source variable', null),
      empty: variable('empty', 'Empty module variable', ''),
      misc: variable('misc', 'Unrecognised root variable', 'misc.result'),
      household_net_income: variable('household_net_income', 'Household net income', 'household.income.household_net_income'),
    }} />);

    fireEvent.click(screen.getByRole('button', { name: /Unclassified variables/ }));
    expect(screen.getByText('3 variables across 1 groups')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Other/ }));

    expect(screen.getByText('Unknown source variable')).toBeInTheDocument();
    expect(screen.getByText('Empty module variable')).toBeInTheDocument();
    expect(screen.getByText('Unrecognised root variable')).toBeInTheDocument();
    expect(screen.queryByText('Household net income')).not.toBeInTheDocument();
  });

  it('preserves the US household label and grouping', () => {
    render(<VariableExplorer country="us" parameters={{}} variables={{
      employment_income: variable('employment_income', 'Employment income', 'household.income.employment_income'),
    }} />);

    expect(screen.queryByText('Unclassified variables')).not.toBeInTheDocument();
    expect(screen.queryByText('Household variables')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Household inputs/ }));
    expect(screen.getByText('Employment, self-employment, investment, and other income sources')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Income/ }));
    expect(screen.getByText('Employment income')).toBeInTheDocument();
  });
});
