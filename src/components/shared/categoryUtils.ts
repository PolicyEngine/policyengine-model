export type Level = 'federal' | 'state' | 'local' | 'territory' | 'household' | 'reform';

/** Categorize an item by its path prefix (moduleName for variables, parameter path for parameters). */
export function getLevel(path: string | null): Level {
  if (!path) return 'household';
  if (path.startsWith('gov.local')) return 'local';
  if (path.startsWith('gov.states')) return 'state';
  if (path.startsWith('gov.territories')) return 'territory';
  if (path.startsWith('gov.contrib') || path.startsWith('contrib')) return 'reform';
  if (path.startsWith('household') || path.startsWith('input')) return 'household';
  if (path.startsWith('gov.')) return 'federal';
  return 'household';
}

/** Get a sub-group key from a path. */
export function getSubGroup(path: string | null): string {
  if (!path) return 'Other';
  const parts = path.split('.');

  if (path.startsWith('gov.states.tax') || path.startsWith('gov.states.general') ||
      path.startsWith('gov.states.unemployment') || path.startsWith('gov.states.workers')) {
    return 'Cross-state';
  }
  if (path.startsWith('gov.states.') && parts.length >= 3 && parts[2].length === 2) {
    return parts[2].toUpperCase();
  }
  if (path.startsWith('gov.local.') && parts.length >= 4) {
    return `${parts[2].toUpperCase()}-${parts[3]}`;
  }
  if (path.startsWith('gov.territories.') && parts.length >= 3) {
    return parts[2].toUpperCase();
  }
  if (path.startsWith('gov.contrib.') && parts.length >= 3) {
    return parts[2];
  }
  if (path.startsWith('contrib.') && parts.length >= 2) {
    return parts[1];
  }
  if (path.startsWith('gov.')) {
    return parts[1];
  }
  if (path.startsWith('household.')) {
    return parts[1];
  }
  return 'Other';
}

/** Get a display label for a sub-group key. */
export function getSubGroupLabel(key: string, level: Level): string {
  if (level === 'federal') {
    const agencyNames: Record<string, string> = {
      irs: 'Internal Revenue Service (IRS)', hhs: 'Health & Human Services (HHS)',
      usda: 'USDA', ssa: 'Social Security Administration (SSA)',
      hud: 'Housing & Urban Development (HUD)', ed: 'Dept. of Education',
      aca: 'Affordable Care Act (ACA)', doe: 'Dept. of Energy',
      fcc: 'Federal Communications Commission (FCC)', puf: 'IRS Public Use File',
      simulation: 'Simulation',
    };
    return agencyNames[key] || key.toUpperCase();
  }
  if (level === 'state') {
    const stateNames: Record<string, string> = {
      AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
      CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',
      HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
      LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',
      MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',
      NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
      OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
      SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
      WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
    };
    if (key === 'Cross-state') return 'Cross-state';
    return stateNames[key] || key;
  }
  if (level === 'local') {
    const [state, locality] = key.split('-');
    const localityNames: Record<string, string> = {
      la: 'Los Angeles', riv: 'Riverside', nyc: 'New York City',
      ala: 'Alameda', sf: 'San Francisco', denver: 'Denver',
      harris: 'Harris County', montgomery: 'Montgomery County',
      multnomah_county: 'Multnomah County', tax: 'Local taxes',
    };
    return `${localityNames[locality] || locality} (${state})`;
  }
  if (level === 'territory') {
    const codes: Record<string, string> = { PR: 'Puerto Rico', GU: 'Guam', VI: 'US Virgin Islands' };
    return codes[key] || key;
  }
  if (level === 'reform') {
    // Reform sub-groups are typically program names
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (level === 'household') {
    const names: Record<string, string> = {
      demographic: 'Demographics', income: 'Income', expense: 'Expenses',
      assets: 'Assets', marginal_tax_rate: 'Marginal tax rates', cliff: 'Cliff analysis',
    };
    return names[key] || key;
  }
  return key;
}

/** Description for sub-groups. */
export function getSubGroupDescription(key: string, level: Level): string | null {
  if (level === 'federal') {
    const desc: Record<string, string> = {
      irs: 'Income tax, credits, deductions, and filing rules',
      hhs: 'Medicaid, CHIP, ACA subsidies, and poverty guidelines',
      usda: 'SNAP, school meals, WIC, and CSFP',
      ssa: 'Social Security benefits and payroll taxes',
      hud: 'Housing assistance and rental subsidies',
      ed: 'Pell grants and student aid',
      aca: 'Marketplace eligibility and premium subsidies',
      doe: 'Energy efficiency rebates and credits',
      fcc: 'Affordable Connectivity Program',
    };
    return desc[key] || null;
  }
  if (level === 'household') {
    const desc: Record<string, string> = {
      demographic: 'Age, marital status, disability, and household composition',
      income: 'Employment, self-employment, investment, and other income sources',
      expense: 'Childcare, medical, housing, and other deductible expenses',
      assets: 'Savings, property, and other asset holdings',
      marginal_tax_rate: 'Effective marginal rates on additional income',
      cliff: 'Benefit cliffs from income changes',
    };
    return desc[key] || null;
  }
  return null;
}

export const LEVEL_CONFIG: Record<Level, { label: string; description: string; color: string; order: number }> = {
  federal:   { label: 'Federal',          description: 'IRS, HHS, USDA, SSA, HUD, and other federal agencies',            color: '#1D4ED8', order: 0 },
  state:     { label: 'State',            description: 'State-level tax and benefit programs across all 50 states + DC',   color: '#7C3AED', order: 1 },
  local:     { label: 'Local',            description: 'City and county programs',                                          color: '#059669', order: 2 },
  territory: { label: 'Territories',      description: 'Puerto Rico and other US territories',                              color: '#0891B2', order: 3 },
  reform:    { label: 'Reforms',          description: 'Contributed reform proposals and policy experiments',               color: '#D97706', order: 4 },
  household: { label: 'Household inputs', description: 'Demographics, income, expenses, and geographic inputs',             color: '#6B7280', order: 5 },
};

export const LEVELS_ORDERED: Level[] = ['federal', 'state', 'local', 'territory', 'reform', 'household'];
