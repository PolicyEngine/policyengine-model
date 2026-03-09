import { useState, useEffect, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import Footer from './Footer';

interface AppShellProps {
  children: ReactNode;
  isEmbed: boolean;
  country: string;
}

export default function AppShell({ children, isEmbed, country }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const handleHash = () => setMobileMenuOpen(false);
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (isEmbed) {
    return (
      <div className="tw:min-h-screen">
        <main className="tw:max-w-[1200px] tw:mx-auto tw:p-6">
          {children}
        </main>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="tw:min-h-screen">
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
        <main className="tw:max-w-[1200px] tw:mx-auto tw:p-6">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="tw:flex tw:min-h-screen">
      <Sidebar country={country} />
      <div className="tw:ml-64 tw:flex-1 tw:flex tw:flex-col">
        <main className="tw:flex-1 tw:max-w-[1200px] tw:w-full tw:mx-auto tw:px-6 tw:py-12">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
