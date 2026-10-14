export type Level =
  // US
  | 'federal' | 'state' | 'local' | 'territory'
  // UK
  | 'uk_government' | 'devolved' | 'local_authority' | 'assumptions'
  // Both
  | 'reform' | 'household';

export type TaxonomyCountry = 'us' | 'uk' | string;

// UK parameter and variable roots under gov.*, grouped by who sets them.
const UK_DEVOLVED = new Set(['revenue_scotland', 'social_security_scotland', 'scottish_government', 'wra']);
const UK_ASSUMPTIONS = new Set(['economic_assumptions', 'simulation', 'dynamic', 'indices', 'benefit_uprating_cpi']);

function getUkLevel(path: string | null): Level {
  if (!path) return 'household';
  const parts = path.split('.');
  if (parts[0] === 'contrib' || (parts[0] === 'gov' && parts[1] === 'contrib')) return 'reform';
  if (parts[0] !== 'gov') return 'household';
  if (!parts[1]) return 'assumptions';
  if (parts[1] === 'local_authorities') return 'local_authority';
  if (UK_DEVOLVED.has(parts[1])) return 'devolved';
  if (UK_ASSUMPTIONS.has(parts[1])) return 'assumptions';
  return 'uk_government';
}

function getUkSubGroup(path: string | null): string {
  if (!path) return 'Other';
  const parts = path.split('.');
  const level = getUkLevel(path);
  if (level === 'reform') return parts[0] === 'gov' ? (parts[2] ?? 'Other') : (parts[1] ?? 'Other');
  if (level === 'household') {
    // household.income.* -> income; input.vehicle.* -> vehicle; input.rent -> input
    if (parts[0] === 'household' || parts[0] === 'input') return parts.length > 2 ? parts[1] : parts[0];
    return 'Other';
  }
  if (level === 'local_authority') return parts[2] ?? 'Other';
  if (level === 'assumptions') return parts[1] ?? 'Other';
  return parts[1];
}

/** Categorize an item by its path prefix (moduleName for variables, parameter path for parameters). */
export function getLevel(path: string | null, country: TaxonomyCountry = 'us'): Level {
  if (country === 'uk') return getUkLevel(path);
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
export function getSubGroup(path: string | null, country: TaxonomyCountry = 'us'): string {
  if (country === 'uk') return getUkSubGroup(path);
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

const humanize = (key: string) =>
  key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Department names follow GOV.UK's organisation titles.
const UK_SUBGROUP_LABELS: Record<string, string> = {
  hmrc: 'HM Revenue and Customs (HMRC)',
  dwp: 'Department for Work and Pensions (DWP)',
  dfe: 'Department for Education (DfE)',
  dft: 'Department for Transport (DfT)',
  dcms: 'Department for Culture, Media and Sport (DCMS)',
  dhsc: 'Department of Health and Social Care (DHSC)',
  treasury: 'HM Treasury',
  ofgem: 'Ofgem',
  boe: 'Bank of England',
  revenue_scotland: 'Revenue Scotland',
  social_security_scotland: 'Social Security Scotland',
  scottish_government: 'Scottish Government',
  wra: 'Welsh Revenue Authority',
  economic_assumptions: 'Economic assumptions',
  simulation: 'Simulation settings',
  dynamic: 'Dynamic responses',
  indices: 'Indices',
  benefit_uprating_cpi: 'Benefit uprating',
  domestic_rates: 'Northern Ireland domestic rates',
  england: 'England-wide schemes',
  scotland: 'Scotland-wide schemes',
  wales: 'Wales-wide schemes',
  council_tax_reduction: 'Council Tax Reduction',
  kingston_upon_thames: 'Kingston upon Thames',
  demographic: 'Demographics',
  income: 'Income',
  consumption: 'Consumption',
  wealth: 'Wealth',
  vehicle: 'Vehicles',
  owned_company: 'Company ownership',
  input: 'Other inputs',
};

// Each description lists programmes that policyengine-uk's programs.yaml
// assigns to that department, or the folder's contents.
const UK_SUBGROUP_DESCRIPTIONS: Record<string, string> = {
  hmrc: 'Income tax, National Insurance, VAT, capital gains tax, duties, Child Benefit, and Tax-Free Childcare',
  dwp: 'Universal Credit, State Pension, Pension Credit, disability benefits, and legacy benefits',
  dfe: 'Free childcare entitlements and student support',
  dft: 'Vehicle excise duty, rail, and bus',
  dcms: 'The TV licence',
  treasury: 'Cost of Living and energy bill support payments',
  ofgem: 'The energy price cap and Energy Price Guarantee',
  revenue_scotland: 'Land and Buildings Transaction Tax',
  social_security_scotland: 'Scottish Child Payment, Pension Age Winter Heating Payment, and Carer Support Payment',
  scottish_government: 'Funded early learning and childcare',
  wra: 'Land Transaction Tax in Wales',
  economic_assumptions: 'Forecasts used to uprate incomes, prices, and benefits',
  simulation: 'Behavioural response elasticities and other simulation settings',
  demographic: 'Age, family, disability, and household composition',
  income: 'Employment, self-employment, pension, investment, and other income',
  consumption: 'Spending by category, used for VAT and duties',
  wealth: 'Property, financial, and pension wealth',
};

/** Get a display label for a sub-group key. */
export function getSubGroupLabel(key: string, level: Level, country: TaxonomyCountry = 'us'): string {
  if (country === 'uk') return UK_SUBGROUP_LABELS[key] ?? humanize(key);
  return getUsSubGroupLabel(key, level);
}

/** Description for sub-groups. */
export function getSubGroupDescription(key: string, level: Level, country: TaxonomyCountry = 'us'): string | null {
  if (country === 'uk') return UK_SUBGROUP_DESCRIPTIONS[key] ?? null;
  return getUsSubGroupDescription(key, level);
}

function getUsSubGroupLabel(key: string, level: Level): string {
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

function getUsSubGroupDescription(key: string, level: Level): string | null {
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
      simulation: 'Behavioral responses, labor supply elasticities, and simulation settings',
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

interface LevelInfo { label: string; description: string; color: string; order: number }

export const LEVEL_CONFIG: Record<Level, LevelInfo> = {
  federal:   { label: 'Federal',          description: 'IRS, HHS, USDA, SSA, HUD, and other federal agencies',            color: '#2C7A7B', order: 0 },
  state:     { label: 'State',            description: 'State-level tax and benefit programs across all 50 states + DC',   color: '#2C7A7B', order: 1 },
  local:     { label: 'Local',            description: 'City and county programs',                                          color: '#2C7A7B', order: 2 },
  territory: { label: 'Territories',      description: 'Puerto Rico and other US territories',                              color: '#2C7A7B', order: 3 },
  uk_government:   { label: 'UK government',      description: 'HMRC, DWP, DfE, DfT, HM Treasury, and other UK departments',                   color: '#2C7A7B', order: 0 },
  devolved:        { label: 'Devolved',           description: 'Revenue Scotland, Social Security Scotland, the Scottish Government, and the Welsh Revenue Authority', color: '#2C7A7B', order: 1 },
  local_authority: { label: 'Local authorities',  description: 'Council Tax Reduction schemes and Northern Ireland domestic rates',            color: '#2C7A7B', order: 2 },
  assumptions:     { label: 'Assumptions and settings', description: 'Economic forecasts, uprating indices, and simulation settings',          color: '#475569', order: 4 },
  reform:    { label: 'Reforms',          description: 'Contributed reform proposals and policy experiments',               color: '#2C7A7B', order: 4 },
  household: { label: 'Household inputs', description: 'Demographics, income, expenses, and geographic inputs',             color: '#475569', order: 5 },
};

/** US level order; kept for callers that predate the country-aware taxonomy. */
export const LEVELS_ORDERED: Level[] = ['federal', 'state', 'local', 'territory', 'reform', 'household'];

const UK_LEVELS: Level[] = ['uk_government', 'devolved', 'local_authority', 'reform', 'assumptions', 'household'];

/** The levels a country's explorer shows, in display order. */
export function levelsFor(country: TaxonomyCountry = 'us'): Level[] {
  return country === 'uk' ? UK_LEVELS : LEVELS_ORDERED;
}

/** Display config for a level; UK household inputs are described in UK terms. */
export function levelConfig(level: Level, country: TaxonomyCountry = 'us'): LevelInfo {
  if (country === 'uk' && level === 'household') {
    return { ...LEVEL_CONFIG.household, description: 'Demographics, income, consumption, wealth, and other survey inputs' };
  }
  return LEVEL_CONFIG[level];
}

/** A zeroed counter over every level. */
export function emptyLevelRecord<T>(make: () => T): Record<Level, T> {
  return Object.fromEntries((Object.keys(LEVEL_CONFIG) as Level[]).map((l) => [l, make()])) as Record<Level, T>;
}
