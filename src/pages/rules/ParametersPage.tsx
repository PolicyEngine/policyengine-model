import { useState, useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import ParameterExplorer from '../../components/parameters/ParameterExplorer';
import { fetchMetadata } from '../../data/fetchMetadata';
import type { Metadata } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

export default function ParametersPage({ country }: { country: string }) {
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
        title="Parameters"
        description="Explore every parameter in the PolicyEngine model — tax rates, thresholds, benefit amounts, and eligibility rules. Search, filter, and view value histories."
      />

      {error && (
        <p style={{ color: colors.error, fontSize: typography.fontSize.sm }}>
          Failed to load metadata: {error}
        </p>
      )}

      {!metadata && !error && (
        <div style={{ padding: spacing['4xl'], textAlign: 'center' }}>
          <p style={{ color: colors.text.tertiary, fontSize: typography.fontSize.sm }}>
            Loading parameters...
          </p>
        </div>
      )}

      {metadata && (
        <ParameterExplorer
          parameters={metadata.parameters}
          country={country}
        />
      )}
    </div>
  );
}
