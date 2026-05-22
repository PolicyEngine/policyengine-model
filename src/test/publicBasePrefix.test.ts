import { describe, expect, it } from 'vitest';
import {
  appPathFromPublicPath,
  publicBasePrefixFromPath,
} from '../hooks/usePublicBasePrefix';

describe('public base prefix helpers', () => {
  it('detects mounted model prefixes', () => {
    expect(publicBasePrefixFromPath('/us/model')).toBe('/us/model');
    expect(publicBasePrefixFromPath('/uk/model/rules/coverage')).toBe('/uk/model');
  });

  it('detects standalone country prefixes', () => {
    expect(publicBasePrefixFromPath('/us/rules/coverage')).toBe('/us');
    expect(publicBasePrefixFromPath('/uk')).toBe('/uk');
  });

  it('normalizes public paths to internal app paths', () => {
    expect(appPathFromPublicPath('/us/model')).toBe('/');
    expect(appPathFromPublicPath('/us/model/rules/coverage')).toBe('/rules/coverage');
    expect(appPathFromPublicPath('/uk/behavioral')).toBe('/behavioral');
    expect(appPathFromPublicPath('/data/pipeline')).toBe('/data/pipeline');
  });
});
