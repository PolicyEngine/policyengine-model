import type { ProgramsSource } from '../../data/fetchPrograms';
import { colors, spacing, typography } from '../../designTokens';

export default function CoverageProvenance({ source }: { source: ProgramsSource }) {
  let text: string;
  if (source.kind === 'snapshot') {
    const model = source.repo.split('/').pop();
    const date = source.fetchedAt.slice(0, 10);
    text = `Coverage reflects ${model} ${source.version} (${source.branch} @ ${source.commit.slice(0, 7)}, fetched ${date}).`;
    if (source.apiVersion) {
      text += ` The production API currently serves ${source.apiVersion}.`;
    }
  } else if (source.kind === 'api') {
    const model = source.repo.split('/').pop();
    text = `Coverage reflects the production API, ${model} ${source.apiVersion || '(version unavailable)'}.`;
  } else {
    text = 'Coverage reflects the bundled fallback registry.';
  }

  return (
    <p style={{
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
      lineHeight: 1.7,
      marginTop: 0,
      marginBottom: spacing.xl,
    }}>
      {text}
    </p>
  );
}
