import ProgramListPage from './ProgramListPage';
import type { Country } from '../../hooks/useCountry';

export default function ParametersPage({ country }: { country: Country }) {
  return (
    <ProgramListPage
      country={country}
      linkType="parameters"
      title="Parameters"
      description="PolicyEngine parameters define tax rates, thresholds, benefit amounts, and eligibility rules. Each links to the corresponding YAML files in GitHub."
    />
  );
}
