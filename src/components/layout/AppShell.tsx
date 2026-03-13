import { useState, useEffect, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import Footer from './Footer';
import PEHeader from './PEHeader';

interface AppShellProps {
  children: ReactNode;
  country: string;
}

export default function AppShell({ children, country }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    return (
      <div className="tw:min-h-screen tw:flex tw:flex-col">
        <PEHeader country={country} />
        <MobileHeader
          isOpen={mobileMenuOpen}
          onToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        {mobileMenuOpen && (
          <>
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="tw:fixed tw:inset-0 tw:bg-black/30 tw:z-40"
            />
            <div className="tw:fixed tw:top-0 tw:left-0 tw:z-50">
              <Sidebar country={country} onClose={() => setMobileMenuOpen(false)} />
            </div>
          </>
        )}
        <main className="tw:flex-1 tw:max-w-[1200px] tw:mx-auto tw:p-6">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="tw:min-h-screen tw:flex tw:flex-col">
      <PEHeader country={country} />
      <div className="tw:flex tw:flex-1">
        <Sidebar country={country} />
        <div className="tw:flex-1 tw:flex tw:flex-col">
          <main className="tw:flex-1 tw:max-w-[1200px] tw:w-full tw:mx-auto tw:px-6 tw:py-12">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
