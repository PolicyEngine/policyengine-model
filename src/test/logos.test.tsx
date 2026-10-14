import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { logos } from '@policyengine/ui-kit/assets';

vi.mock('next/navigation', () => ({
  usePathname: () => '/us/model/rules/coverage',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import PEHeader from '../components/layout/PEHeader';
import Sidebar from '../components/layout/Sidebar';
import MobileHeader from '../components/layout/MobileHeader';
import Footer from '../components/layout/Footer';

const REPO_ROOT = path.resolve(__dirname, '../..');
// Any absolute http(s) URL that points at an image file.
const REMOTE_IMAGE_URL = /https?:\/\/[^\s'"`)]+\.(?:svg|png|jpe?g|gif|webp|ico|avif)\b/gi;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(?:[cm]?[jt]sx?|css)$/.test(name) ? [full] : [];
  });
}

describe('PolicyEngine logos', () => {
  it('come from @policyengine/ui-kit as inline SVG data URIs', () => {
    // Inline data URIs need no network request, so they render the same at
    // policyengine.org/{country}/model, in standalone previews and offline.
    expect(logos.whiteWordmark).toMatch(/^data:image\/svg\+xml,/);
    expect(logos.tealSquare).toMatch(/^data:image\/svg\+xml,/);
  });

  it('renders the white wordmark in the site header', () => {
    render(<PEHeader country="us" />);
    expect(screen.getByAltText('PolicyEngine')).toHaveAttribute('src', logos.whiteWordmark);
  });

  it('renders the white wordmark in the footer', () => {
    render(<Footer />);
    expect(screen.getByAltText('PolicyEngine')).toHaveAttribute('src', logos.whiteWordmark);
  });

  it('renders the teal square in the sidebar', () => {
    render(<Sidebar country="uk" />);
    expect(screen.getByAltText('PolicyEngine')).toHaveAttribute('src', logos.tealSquare);
  });

  it('renders the teal square in the mobile header', () => {
    render(<MobileHeader isOpen={false} onToggle={() => {}} />);
    expect(screen.getByAltText('PolicyEngine')).toHaveAttribute('src', logos.tealSquare);
  });

  it('are never hotlinked from a remote URL in app or src', () => {
    const offenders = ['app', 'src']
      .flatMap((dir) => sourceFiles(path.join(REPO_ROOT, dir)))
      .flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(REMOTE_IMAGE_URL)].map(
          (match) => `${path.relative(REPO_ROOT, file)}: ${match[0]}`,
        ),
      );
    expect(offenders).toEqual([]);
  });
});
