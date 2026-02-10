import { motion } from 'framer-motion';
import { colors, typography, spacing } from '../../designTokens';

interface IngredientCardProps {
  title: string;
  description: string;
  icon: string;
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
          fontSize: '36px',
          marginBottom: spacing.lg,
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
}

export default function ThreeIngredients({ activeIngredient }: ThreeIngredientsProps) {
  const ingredients = [
    {
      title: 'Policy rules',
      description:
        'Tax codes, benefit formulas, and eligibility rules encoded as executable logic. Over 55 federal, state, and local programs.',
      icon: '\u{1F4DC}',
      key: 'policies' as const,
    },
    {
      title: 'Household data',
      description:
        'A representative microdata sample of the population, with income, demographics, and program participation for each household.',
      icon: '\u{1F465}',
      key: 'households' as const,
    },
    {
      title: 'Behavioral dynamics',
      description:
        'Elasticities capturing how people adjust their labor supply and income in response to tax and benefit changes.',
      icon: '\u{1F4C8}',
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
