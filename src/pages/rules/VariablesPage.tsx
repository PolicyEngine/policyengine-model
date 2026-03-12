import { useState, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import VariableExplorer from '../../components/variables/VariableExplorer';
import { fetchMetadata } from '../../data/fetchMetadata';
import type { Metadata } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

export default function VariablesPage({ country }: { country: string }) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetadata(country)
      .then(setMetadata)
      .catch((err) => setError(err.message));
  }, [country]);

  return (
    <div>
      <PageHeader
        category="Rules"
        title="Variables"
        description="Explore every variable in the PolicyEngine model — tax liabilities, benefit amounts, eligibility flags, and intermediate calculations. Search, filter, and trace computation trees."
      />

      {error && (
        <p style={{ color: colors.error, fontSize: typography.fontSize.sm }}>
          Failed to load metadata: {error}
        </p>
      )}

      {!metadata && !error && (
        <div style={{ padding: spacing['4xl'], textAlign: 'center' }}>
          <p style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
            Loading variables...
          </p>
        </div>
      )}

      {metadata && (
        <VariableExplorer
          variables={metadata.variables}
          parameters={metadata.parameters}
          country={country}
        />
      )}
    </div>
  );
}
