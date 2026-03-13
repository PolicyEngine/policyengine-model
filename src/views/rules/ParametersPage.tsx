import ProgramListPage from './ProgramListPage';

export default function ParametersPage({ country }: { country: string }) {
  return (
    <ProgramListPage
      country={country}
      linkType="parameters"
      title="Parameters"
      description="PolicyEngine parameters define tax rates, thresholds, benefit amounts, and eligibility rules. Each links to the corresponding YAML files in GitHub."
    />
  );
}
