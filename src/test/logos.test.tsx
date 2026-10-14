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
// An http(s) or protocol-relative (//host/...) URL that points at an image file.
const REMOTE_IMAGE_URL =
  /(?:https?:\/\/|(?<![\w:/])\/\/(?=[\w-]+\.))[^\s'"`)]+\.(?:svg|png|jpe?g|gif|webp|ico|avif)\b/gi;

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

  it.each([
    ['src="https://example.org/logo.svg"', true],
    ['src="http://example.org/a/b.PNG?v=2"', true],
    ['src={`https://${host}/logo.webp`}', true],
    ['src="//example.org/assets/white.svg"', true],
    ["url('//cdn.example.org/bg.jpg')", true],
    ['src={logos.whiteWordmark}', false],
    ['fetch(`${prefix}/programs-us.json`)', false],
    ['href="https://example.org/docs"', false],
    ['// see the logo.svg in ui-kit', false],
    ['icon: `${prodOrigin}/icon.svg`', false],
  ])('remote image URL pattern on %s is %s', (text, expected) => {
    expect([...text.matchAll(REMOTE_IMAGE_URL)].length > 0).toBe(expected);
  });

  it('are never hotlinked from a remote URL in app or src', () => {
    const offenders = ['app', 'src']
      .flatMap((dir) => sourceFiles(path.join(REPO_ROOT, dir)))
      // This file holds sample URLs for the pattern cases above.
      .filter((file) => file !== __filename)
      .flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(REMOTE_IMAGE_URL)].map(
          (match) => `${path.relative(REPO_ROOT, file)}: ${match[0]}`,
        ),
      );
    expect(offenders).toEqual([]);
  });
});
