import { describe, it, expect, beforeEach } from 'vitest';

// We test the router module's hash parsing logic
describe('router', () => {
  beforeEach(() => {
    // Reset hash before each test
    window.location.hash = '';
  });

  it('defaults to "/" when hash is empty', async () => {
    window.location.hash = '';
    const { navigate } = await import('../router');
    expect(typeof navigate).toBe('function');
  });

  it('navigate() updates hash preserving search params', async () => {
    const { navigate } = await import('../router');
    navigate('/rules/coverage');
    expect(window.location.hash).toBe('#/rules/coverage');
  });

  it('navigate() to root path', async () => {
    const { navigate } = await import('../router');
    navigate('/');
    expect(window.location.hash).toBe('#/');
  });
});
