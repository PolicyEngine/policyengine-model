import ProgramListPage from './ProgramListPage';

export default function VariablesPage({ country }: { country: string }) {
  return (
    <ProgramListPage
      country={country}
      linkType="variables"
      title="Variables"
      description="PolicyEngine variables are the computed outputs: tax liabilities, benefit amounts, eligibility flags, and intermediate calculations. Each links to the Python formula in GitHub."
    />
  );
}
