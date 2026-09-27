import type { CalibrationGroup } from '../../data/calibrationTargets';

export function formatValue(val: number | null, unit: CalibrationGroup['unit']): string {
  if (val === null || val === undefined) return '—';
  const prefix = unit === 'usd' ? '$' : '';
  const abs = Math.abs(val);
  if (abs >= 1e12) return `${prefix}${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${prefix}${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${prefix}${(val / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${prefix}${(val / 1e3).toFixed(0)}K`;
  return `${prefix}${val.toLocaleString()}`;
}

const ACRONYMS = new Set([
  'actc', 'agi', 'aptc', 'chip', 'ctc', 'eitc', 'ira', 'liheap', 'oasdi',
  'ptc', 'qbi', 'salt', 'snap', 'ssi', 'tanf', 'us',
]);

const PROPER_NOUNS: Record<string, string> = {
  keogh: 'Keogh',
  medicaid: 'Medicaid',
  medicare: 'Medicare',
};

// Target names join compound concepts with underscores ("wages_salaries",
// "estate_trust"); restore the conjunctions and proper nouns they drop.
const PHRASES: [RegExp, string][] = [
  [/\bMedicaid CHIP\b/, 'Medicaid and CHIP'],
  [/\bestate trust\b/, 'estate and trust'],
  [/\bmedical dental\b/, 'medical and dental'],
  [/\bpartnership scorp\b/, 'partnership and S corporation'],
  [/\brental royalty\b/, 'rental and royalty'],
  [/\bschedule c\b/, 'Schedule C'],
  [/\bsocial security\b/, 'Social Security'],
  [/\bstate local\b/, 'state and local'],
  [/\bwages salaries\b/, 'wages and salaries'],
];

/** Sentence-case label for a target concept such as "aptc_recipients". */
export function formatConcept(name: string): string {
  let sentence = name
    .split('_')
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : (PROPER_NOUNS[w] ?? w)))
    .join(' ');
  for (const [pattern, replacement] of PHRASES) {
    sentence = sentence.replace(pattern, replacement);
  }
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// Readable names for groups whose concept segment is generic ("amount",
// "return_count", ...), read off the full target names in the release
// diagnostics. Keyed by `${sourceFamily}:${concept}`, or by
// `${sourceFamily}:${sourceTable}:${concept}` where one family reuses a
// concept across tables.
const GROUP_LABELS: Record<string, string> = {
  'bea:amount': "Proprietors' income",
  'cbo:projected_amount': 'Projected income by source',
  'census_pep:population': 'Population by five-year age group',
  'census_stc:collections': 'State individual income tax collections',
  'cms_medicaid:medicaid_enrollment_substitution':
    'Rhode Island Medicaid enrollment (November 2024; December not reported)',
  'cms_medicare:actual_amount': 'Medicare Part B premiums from enrollees',
  'federal_reserve:amount_outstanding': 'Household and nonprofit net worth',
  'hhs_acf_liheap:households_served': 'LIHEAP households served',
  'hhs_acf_tanf:all_funds': 'TANF basic assistance spending',
  'irs_soi:return_count': 'Returns filed',
  'irs_soi:Table 4.B. Summary of Items for Taxpayers with Form W-2, by Return and Earner Type, Tax Year 2020:amount':
    'Social Security tips on Form W-2',
  'irs_soi:Table 4.B. Summary of Items for Taxpayers with Form W-2, by Return and Earner Type, Tax Year 2020:return_count':
    'Returns with Social Security tips on Form W-2',
  'jct:revenue_loss': 'Tax expenditure revenue loss',
  'policyengine_build:keogh_distributions': 'Keogh distributions (held at base-pool total)',
  'ssa:SSA Annual Statistical Supplement 2025 Table 7.B1:payment_amount': 'SSI payments by state',
  'ssa:SSA Annual Statistical Supplement 2025 Table 7.B1:recipient_count': 'SSI recipients by state',
  'ssa:SSA Annual Statistical Supplement 2025 extracted OASDI and SSI target rows:payment_amount':
    'Social Security (OASDI) and SSI payments',
  'ssa:SSI Monthly Statistics, December 2024, Table 1:recipient_count': 'SSI recipients by age group',
  'usda_snap:average_monthly_households': 'SNAP households (average monthly)',
  'usda_snap:total_benefits': 'SNAP benefits',
};

export function groupLabel(g: Pick<CalibrationGroup, 'sourceFamily' | 'sourceTable' | 'concept'>): string {
  return (
    GROUP_LABELS[`${g.sourceFamily}:${g.sourceTable}:${g.concept}`] ??
    GROUP_LABELS[`${g.sourceFamily}:${g.concept}`] ??
    formatConcept(g.concept)
  );
}

const SOURCE_FAMILY_LABELS: Record<string, string> = {
  bea: 'BEA',
  cbo: 'CBO',
  census_pep: 'Census population estimates',
  census_stc: 'Census state tax collections',
  cms_aca: 'CMS marketplace',
  cms_medicaid: 'CMS Medicaid',
  cms_medicare: 'CMS Medicare',
  federal_reserve: 'Federal Reserve',
  hhs_acf_liheap: 'HHS/ACF LIHEAP',
  hhs_acf_tanf: 'HHS/ACF TANF',
  irs_soi: 'IRS SOI',
  jct: 'JCT',
  policyengine_build: 'Build-internal',
  ssa: 'SSA',
  usda_snap: 'USDA FNS',
};

export function formatSourceFamily(family: string): string {
  return SOURCE_FAMILY_LABELS[family] ?? family;
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
