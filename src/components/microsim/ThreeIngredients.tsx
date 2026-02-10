import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';
import { IconFileText, IconUsers, IconTrendingUp } from '@tabler/icons-react';

interface IngredientCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  delay: number;
  isActive?: boolean;
}

function IngredientCard({ title, description, icon, delay, isActive }: IngredientCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{
        flex: 1,
        minWidth: '250px',
        padding: spacing['3xl'],
        borderRadius: spacing.radius.xl,
        border: `2px solid ${isActive ? colors.primary[500] : colors.border.light}`,
        backgroundColor: isActive ? colors.primary[50] : colors.white,
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          marginBottom: spacing.lg,
          color: colors.primary[600],
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.primary[900],
          margin: `0 0 ${spacing.sm} 0`,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: typography.fontSize.base,
          color: colors.text.secondary,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {description}
      </p>
    </motion.div>
  );
}

interface ThreeIngredientsProps {
  activeIngredient?: 'policies' | 'households' | 'dynamics' | null;
  country?: string;
}

export default function ThreeIngredients({ activeIngredient, country = 'us' }: ThreeIngredientsProps) {
  const ingredients = [
    {
      title: 'Policy rules',
      description:
        'Tax codes, benefit formulas, and eligibility rules encoded as executable logic. Over 55 federal, state, and local programs.',
      icon: <IconFileText size={36} stroke={1.5} />,
      key: 'policies' as const,
    },
    {
      title: 'Household data',
      description:
        'A representative microdata sample of the population, with income, demographics, and program participation for each household.',
      icon: <IconUsers size={36} stroke={1.5} />,
      key: 'households' as const,
    },
    {
      title: country === 'uk' ? 'Behavioural dynamics' : 'Behavioral dynamics',
      description:
        country === 'uk'
          ? 'Elasticities capturing how people adjust their labour supply and income in response to tax and benefit changes.'
          : 'Elasticities capturing how people adjust their labor supply and income in response to tax and benefit changes.',
      icon: <IconTrendingUp size={36} stroke={1.5} />,
      key: 'dynamics' as const,
    },
  ];

  return (
    <div style={{ marginBottom: spacing['4xl'] }}>
      <p
        style={{
          fontSize: typography.fontSize.lg,
          color: colors.text.secondary,
          lineHeight: 1.7,
          marginBottom: spacing['3xl'],
          maxWidth: '720px',
        }}
      >
        PolicyEngine's microsimulation model combines three ingredients to estimate the impact of any
        tax or benefit reform on every household in the country.
      </p>
      <div
        style={{
          display: 'flex',
          gap: spacing['2xl'],
          flexWrap: 'wrap',
        }}
      >
        {ingredients.map((ing, i) => (
          <IngredientCard
            key={ing.key}
            title={ing.title}
            description={ing.description}
            icon={ing.icon}
            delay={i * 0.15}
            isActive={activeIngredient === ing.key}
          />
        ))}
      </div>
    </div>
  );
}
