import { useState } from 'react';
import { IconChevronDown, IconMenu2, IconX } from '@tabler/icons-react';

interface PEHeaderProps {
  country: string;
}

const baseUrl = 'https://policyengine.org';

export default function PEHeader({ country }: PEHeaderProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: 'Research', href: `${baseUrl}/${country}/research` },
    { label: 'Model', href: `${baseUrl}/${country}/model` },
  ];

  const aboutLinks = [
    { label: 'Team', href: `${baseUrl}/${country}/team` },
    { label: 'Supporters', href: `${baseUrl}/${country}/supporters` },
  ];

  return (
    <header
      className="tw:sticky tw:top-0 tw:z-[1000] tw:font-primary"
      style={{
        backgroundColor: '#2c7a7b',
        borderBottom: '0.5px solid #94A3B8',
        boxShadow: '0px 2px 4px -1px rgba(16, 24, 40, 0.05), 0px 4px 6px -1px rgba(16, 24, 40, 0.1)',
      }}
    >
      <div className="tw:flex tw:justify-between tw:items-center tw:h-[58px] tw:px-6">
        <a href={baseUrl} className="tw:flex tw:items-center">
          <img
            src={`${baseUrl}/assets/logos/policyengine/white.svg`}
            alt="PolicyEngine"
            className="tw:h-6 tw:w-auto tw:mr-3"
          />
        </a>

        {/* Desktop nav */}
        <nav className="tw:hidden lg:tw:flex tw:items-center tw:gap-6">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="tw:text-white tw:font-medium tw:text-[15px] tw:no-underline tw:px-3.5 tw:py-1.5 tw:rounded-md hover:tw:bg-white/12 tw:transition"
            >
              {link.label}
            </a>
          ))}

          {/* About dropdown */}
          <div className="tw:relative">
            <button
              onClick={() => setAboutOpen(!aboutOpen)}
              onBlur={() => setTimeout(() => setAboutOpen(false), 150)}
              className="tw:text-white tw:font-medium tw:text-[15px] tw:bg-transparent tw:border-none tw:cursor-pointer tw:flex tw:items-center tw:gap-1 tw:px-3.5 tw:py-1.5 tw:rounded-md hover:tw:bg-white/12 tw:transition"
            >
              About
              <IconChevronDown
                size={18}
                stroke={2}
                className="tw:transition-transform"
                style={{ transform: aboutOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {aboutOpen && (
              <div className="tw:absolute tw:top-full tw:right-0 tw:mt-1 tw:bg-white tw:rounded-lg tw:shadow-lg tw:py-1 tw:min-w-[160px]">
                {aboutLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="tw:block tw:px-4 tw:py-2 tw:text-sm tw:text-gray-700 tw:no-underline hover:tw:bg-gray-100 tw:transition"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <a
            href={`${baseUrl}/${country}/donate`}
            className="tw:text-white tw:font-medium tw:text-[15px] tw:no-underline tw:px-3.5 tw:py-1.5 tw:rounded-md hover:tw:bg-white/12 tw:transition"
          >
            Donate
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:tw:hidden tw:bg-transparent tw:border-none tw:text-white tw:cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="lg:tw:hidden tw:px-6 tw:pb-4 tw:flex tw:flex-col tw:gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="tw:text-white tw:font-medium tw:text-[15px] tw:no-underline tw:py-2"
            >
              {link.label}
            </a>
          ))}
          {aboutLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="tw:text-white/80 tw:font-medium tw:text-[15px] tw:no-underline tw:py-2 tw:pl-4"
            >
              {link.label}
            </a>
          ))}
          <a
            href={`${baseUrl}/${country}/donate`}
            className="tw:text-white tw:font-medium tw:text-[15px] tw:no-underline tw:py-2"
          >
            Donate
          </a>
        </nav>
      )}
    </header>
  );
}
