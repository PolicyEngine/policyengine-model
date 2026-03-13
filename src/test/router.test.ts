import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

describe('router', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('navigate() updates URL preserving search params', async () => {
    const { navigate } = await import('../router');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    navigate('/rules/coverage');
    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/rules/coverage');
    pushStateSpy.mockRestore();
  });

  it('navigate() preserves query params', async () => {
    // Set search params
    window.history.replaceState(null, '', '?country=uk');
    const { navigate } = await import('../router');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    navigate('/behavioral');
    expect(pushStateSpy).toHaveBeenCalledWith(null, '', '/behavioral?country=uk');
    pushStateSpy.mockRestore();
    // Clean up
    window.history.replaceState(null, '', window.location.pathname);
  });
});
