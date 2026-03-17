import { useState, useEffect, useRef } from 'react';
import { IconExternalLink } from '@tabler/icons-react';
import PageHeader from '../../components/layout/PageHeader';
import VariableExplorer from '../../components/variables/VariableExplorer';
import { fetchMetadata } from '../../data/fetchMetadata';
import type { Metadata } from '../../types/Variable';
import { colors, typography, spacing } from '../../designTokens';

const FLOWCHART_BASE = 'https://policyengine.github.io/flowchart';
const DEFAULT_VAR = 'household_net_income';

function FlowchartPreview({ country, variable, sectionRef }: {
  country: string;
  variable: string;
  sectionRef: React.RefObject<HTMLDivElement | null>;
}) {
  const flowchartUrl = `${FLOWCHART_BASE}/?variable=${variable}&country=${country.toUpperCase()}`;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const loading = loadedUrl !== flowchartUrl;

  return (
    <div ref={sectionRef} style={{ marginTop: spacing['4xl'], marginBottom: spacing['3xl'] }}>
      <div className="tw:flex tw:items-center tw:justify-between tw:flex-wrap" style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        <div>
          <h3 style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[900],
            margin: 0,
          }}>
            Computation flowchart
          </h3>
          <p style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            margin: `${spacing.xs} 0 0`,
          }}>
            {variable === DEFAULT_VAR
              ? 'See how any variable is calculated from its dependencies'
              : <>Showing <span style={{ fontFamily: typography.fontFamily.mono, fontWeight: typography.fontWeight.medium }}>{variable}</span></>
            }
          </p>
        </div>
        <a
          href={flowchartUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tw:flex tw:items-center"
          style={{
            gap: spacing.xs,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.primary[600],
            textDecoration: 'none',
          }}
        >
          Open in new tab <IconExternalLink size={14} stroke={1.5} />
        </a>
      </div>
      <div
        style={{
          borderRadius: spacing.radius.xl,
          border: `1px solid ${colors.border.light}`,
          overflow: 'hidden',
          backgroundColor: colors.white,
          height: '600px',
          position: 'relative',
        }}
      >
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.white, zIndex: 1,
          }}>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>
              Loading flowchart...
            </span>
          </div>
        )}
        <iframe
          key={flowchartUrl}
          src={flowchartUrl}
          title="Variable computation flowchart"
          onLoad={() => setLoadedUrl(flowchartUrl)}
          style={{
            width: `${100 / 0.75}%`,
            height: `${600 / 0.75}px`,
            border: 'none',
            display: 'block',
            transform: 'scale(0.75)',
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  );
}

export default function VariablesPage({ country }: { country: string }) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowchartVar, setFlowchartVar] = useState(DEFAULT_VAR);
  const flowchartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMetadata(country)
      .then(setMetadata)
      .catch((err) => setError(err.message));
  }, [country]);

  const handleViewFlowchart = (varName: string) => {
    setFlowchartVar(varName);
    setTimeout(() => {
      flowchartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

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
          onViewFlowchart={handleViewFlowchart}
        />
      )}

      <FlowchartPreview country={country} variable={flowchartVar} sectionRef={flowchartRef} />
    </div>
  );
}
