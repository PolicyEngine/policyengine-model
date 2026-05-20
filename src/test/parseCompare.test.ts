import { describe, it, expect } from 'vitest';
import {
  parseComparePeers,
  hostModelId,
} from '../components/comparison/parseCompare';

describe('parseComparePeers', () => {
  const usPeers = ['trim3', 'attis', 'tpc-microsim', 'jct-microsim'];

  it('returns empty / not-compare-mode when raw is undefined', () => {
    const r = parseComparePeers(undefined, usPeers);
    expect(r.peers).toEqual([]);
    expect(r.compareMode).toBe(false);
    expect(r.isAll).toBe(false);
  });

  it('treats empty string the same as undefined', () => {
    const r = parseComparePeers('', usPeers);
    expect(r.peers).toEqual([]);
    expect(r.compareMode).toBe(false);
    expect(r.isAll).toBe(false);
  });

  it('expands "all" to every peer id and sets isAll', () => {
    const r = parseComparePeers('all', usPeers);
    expect(r.peers).toEqual(usPeers);
    expect(r.compareMode).toBe(true);
    expect(r.isAll).toBe(true);
  });

  it('parses a comma-separated list, filters to country peers, preserves order', () => {
    const r = parseComparePeers('trim3,attis', usPeers);
    expect(r.peers).toEqual(['trim3', 'attis']);
    expect(r.compareMode).toBe(true);
    expect(r.isAll).toBe(false);
  });

  it('drops ids that are not in the country peer set', () => {
    // ukmod is not in usPeers — must not leak into the result
    const r = parseComparePeers('trim3,ukmod,attis', usPeers);
    expect(r.peers).toEqual(['trim3', 'attis']);
    expect(r.compareMode).toBe(true);
    expect(r.isAll).toBe(false);
  });

  it('returns empty peers when all entries are out of country scope', () => {
    const r = parseComparePeers('ukmod,policyengine-uk', usPeers);
    expect(r.peers).toEqual([]);
    expect(r.compareMode).toBe(false);
    expect(r.isAll).toBe(false);
  });

  it('handles a single id', () => {
    const r = parseComparePeers('trim3', usPeers);
    expect(r.peers).toEqual(['trim3']);
    expect(r.compareMode).toBe(true);
    expect(r.isAll).toBe(false);
  });

  it('trims whitespace around ids', () => {
    const r = parseComparePeers(' trim3 , attis ', usPeers);
    expect(r.peers).toEqual(['trim3', 'attis']);
    expect(r.compareMode).toBe(true);
  });

  it('takes the first value when raw is an array (matches Next searchParams shape)', () => {
    const r = parseComparePeers(['trim3,attis', 'extra'], usPeers);
    expect(r.peers).toEqual(['trim3', 'attis']);
    expect(r.compareMode).toBe(true);
  });

  it('"all" with empty country-peer set yields empty peers and not compare mode', () => {
    const r = parseComparePeers('all', []);
    expect(r.peers).toEqual([]);
    expect(r.compareMode).toBe(false);
    // isAll still reflects the user intent even when the country has no peers
    expect(r.isAll).toBe(true);
  });
});

describe('hostModelId', () => {
  it('maps us to policyengine-us', () => {
    expect(hostModelId('us')).toBe('policyengine-us');
  });

  it('maps uk to policyengine-uk', () => {
    expect(hostModelId('uk')).toBe('policyengine-uk');
  });
});
