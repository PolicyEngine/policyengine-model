import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
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
      className="tw:py-24 tw:bg-white tw:font-primary"
      style={background ? { backgroundColor: background } : undefined}
    >
      <div className="tw:max-w-[1200px] tw:mx-auto tw:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="tw:mb-12">
            {subtitle && (
              <p className="tw:text-sm tw:font-semibold tw:text-pe-primary-600 tw:uppercase tw:tracking-wider tw:m-0">
                {subtitle}
              </p>
            )}
            <h2 className="tw:text-[40px] tw:font-bold tw:text-pe-primary-900 tw:mt-2 tw:mb-0 tw:ml-0 tw:mr-0 tw:leading-[1.2]">
              {title}
            </h2>
          </div>
          {children}
        </motion.div>
      </div>
    </section>
  );
}
