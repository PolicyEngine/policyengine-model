import DataPipeline from '../../components/data/DataPipeline';
import PageHeader from '../../components/layout/PageHeader';
import { colors, typography, spacing } from '../../designTokens';
import { ukPipelineSource } from '../../data/ukPipelineStages';
import type { Country } from '../../hooks/useCountry';

export default function PipelinePage({ country }: { country: Country }) {
  return (
    <div>
      <PageHeader category="Data" title="Microdata pipeline" />
      <DataPipeline country={country} />
      {country === 'uk' && (
        <p
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.tertiary,
            marginTop: spacing['2xl'],
          }}
        >
          Pipeline as of Microcosm commit{' '}
          <a
            href={`https://github.com/PolicyEngine/microcosm/tree/${ukPipelineSource.commit}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.text.secondary, fontFamily: typography.fontFamily.mono }}
          >
            {ukPipelineSource.commit.slice(0, 7)}
          </a>{' '}
          with policyengine-uk {ukPipelineSource.modelVersion}.
        </p>
      )}
    </div>
  );
}
