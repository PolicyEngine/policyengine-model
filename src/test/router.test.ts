import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/test'),
}));

describe('router', () => {
  it('useHashRoute re-exports usePathname', async () => {
    const { useHashRoute } = await import('../router');
    const { usePathname } = await import('next/navigation');
    expect(useHashRoute).toBe(usePathname);
  });
});
