import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { spacing, typography, colors } from '../../designTokens';
import { useInView } from '../../hooks/useInView';

interface SectionContainerProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  background?: string;
}

export default function SectionContainer({
  id,
  title,
  subtitle,
  children,
  background,
}: SectionContainerProps) {
  const [ref, inView] = useInView(0.1);

  return (
    <section
      id={id}
      ref={ref}
      style={{
        padding: `${spacing['6xl']} 0`,
        backgroundColor: background || colors.white,
        fontFamily: typography.fontFamily.primary,
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `0 ${spacing['2xl']}` }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div style={{ marginBottom: spacing['4xl'] }}>
            {subtitle && (
              <p
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.primary[600],
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: spacing.sm,
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            )}
            <h2
              style={{
                fontSize: typography.fontSize['5xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.primary[900],
                margin: `${spacing.sm} 0 0 0`,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
          </div>
          {children}
        </motion.div>
      </div>
    </section>
  );
}
