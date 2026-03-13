import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { colors } from '../../designTokens';
import { IconFileText, IconUsers, IconTrendingUp } from '@tabler/icons-react';
import type { Country } from '../../hooks/useCountry';

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
      className="tw:flex-1 tw:min-w-[250px] tw:p-8 tw:rounded-xl tw:transition-all tw:duration-300 tw:ease-in-out"
      style={{
        border: `2px solid ${isActive ? colors.primary[500] : colors.border.light}`,
        backgroundColor: isActive ? colors.primary[50] : colors.white,
      }}
    >
      <div className="tw:mb-4 tw:text-pe-primary-600">
        {icon}
      </div>
      <h3 className="tw:text-xl tw:font-bold tw:text-pe-primary-900 tw:mt-0 tw:mb-2 tw:mx-0">
        {title}
      </h3>
      <p className="tw:text-base tw:text-[#5A5A5A] tw:leading-[1.6] tw:m-0">
        {description}
      </p>
    </motion.div>
  );
}

interface ThreeIngredientsProps {
  activeIngredient?: 'policies' | 'households' | 'dynamics' | null;
  country?: Country;
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
    <div className="tw:mb-12">
      <p className="tw:text-lg tw:text-[#5A5A5A] tw:leading-[1.7] tw:mb-8 tw:max-w-[720px]">
        PolicyEngine's microsimulation model combines three ingredients to estimate the impact of any
        tax or benefit reform on every household in the country.
      </p>
      <div className="tw:flex tw:gap-6 tw:flex-wrap">
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
