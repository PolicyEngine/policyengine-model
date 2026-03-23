import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { colors } from '../../designTokens';
import { fetchPackageVersion } from '../../data/fetchPackageVersion';

const PACKAGES = [
  { id: 'us', pypiName: 'policyengine-us', label: 'policyengine-us' },
  { id: 'uk', pypiName: 'policyengine-uk', label: 'policyengine-uk' },
] as const;

export default function PackageVersions() {
  const [versions, setVersions] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      PACKAGES.map(async (pkg) => {
        const version = await fetchPackageVersion(pkg.pypiName);
        return [pkg.id, version] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      setVersions(Object.fromEntries(results));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="tw:mt-16">
      <h3 className="tw:text-xl tw:font-bold tw:text-pe-primary-900 tw:mt-0 tw:mb-2 tw:mx-0">
        Current versions
      </h3>
      <p className="tw:text-lg tw:text-[#5A5A5A] tw:leading-[1.7] tw:mb-8 tw:max-w-[720px] tw:mt-2">
        PolicyEngine's country models are open-source Python packages, published
        to PyPI with every release.
      </p>
      <div className="tw:flex tw:gap-6 tw:flex-wrap">
        {PACKAGES.map((pkg, i) => (
          <motion.a
            key={pkg.id}
            href={`https://pypi.org/project/${pkg.pypiName}/`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="tw:flex-1 tw:min-w-[200px] tw:px-5 tw:py-4 tw:rounded-xl tw:no-underline tw:flex tw:items-center tw:justify-between tw:transition-all tw:duration-300 tw:ease-in-out"
            style={{
              border: `2px solid ${colors.border.light}`,
              backgroundColor: colors.white,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.primary[500];
              e.currentTarget.style.backgroundColor = colors.primary[50];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border.light;
              e.currentTarget.style.backgroundColor = colors.white;
            }}
          >
            <span className="tw:text-sm tw:font-semibold tw:text-pe-primary-900">
              {pkg.label}
            </span>
            <span
              className="tw:text-sm tw:font-mono"
              style={{
                color: loading ? colors.text.tertiary : colors.text.secondary,
              }}
            >
              {loading ? '...' : versions[pkg.id] ? `v${versions[pkg.id]}` : '—'}
            </span>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
