import type { Program } from '../types/Program';

export const programs: Program[] = [
  // Tax programs
  { id: 'federal_income_tax', name: 'Federal income taxes', fullName: 'Federal income taxes (including credits)', category: 'Taxes', status: 'complete', coverage: 'US', variable: 'income_tax' },
  { id: 'state_income_tax', name: 'State income taxes', fullName: 'State income taxes (including credits)', category: 'Taxes', status: 'complete', coverage: 'US', hasStateVariation: true, variable: 'state_income_tax' },
  { id: 'payroll_taxes', name: 'Payroll taxes', fullName: 'Payroll taxes', category: 'Taxes', status: 'complete', coverage: 'US', variable: 'employee_payroll_tax' },

  // USDA programs
  { id: 'snap', name: 'SNAP', fullName: 'Supplemental Nutrition Assistance Program', agency: 'USDA', status: 'complete', coverage: 'US', hasStateVariation: true, variable: 'snap' },
  { id: 'wic', name: 'WIC', fullName: 'Women, Infants, and Children', agency: 'USDA', status: 'complete', coverage: 'US', variable: 'wic' },
  { id: 'school_meals', name: 'Free and reduced school meals', fullName: 'Free and reduced price school meals', agency: 'USDA', status: 'complete', coverage: 'US', variable: 'free_school_meals' },
  { id: 'summer_ebt', name: 'Summer EBT', fullName: 'Summer Electronic Benefit Transfer', agency: 'USDA', status: 'inProgress', coverage: 'US' },
  { id: 'csfp', name: 'Commodity Supplemental Food Program', fullName: 'Commodity Supplemental Food Program', agency: 'USDA', status: 'complete', coverage: 'US', variable: 'csfp' },
  { id: 'fdpir', name: 'FDPIR', fullName: 'Food Distribution Program on Indian Reservations', agency: 'USDA', status: 'complete', coverage: 'US', variable: 'fdpir' },

  // HHS programs
  { id: 'medicaid', name: 'Medicaid', fullName: 'Medicaid', agency: 'HHS', status: 'complete', coverage: 'US', hasStateVariation: true, variable: 'medicaid' },
  { id: 'chip', name: 'CHIP', fullName: "Children's Health Insurance Program", agency: 'HHS', status: 'complete', coverage: 'US', hasStateVariation: true, variable: 'chip' },
  { id: 'aca_subsidies', name: 'ACA subsidies', fullName: 'ACA subsidies (premium tax credit)', agency: 'HHS', status: 'complete', coverage: 'US', hasStateVariation: true, variable: 'aca_ptc' },
  { id: 'tanf', name: 'TANF', fullName: 'Temporary Assistance for Needy Families', agency: 'HHS', status: 'inProgress', coverage: 'US', notes: '40+ state implementations' },
  { id: 'ccdf', name: 'CCDF', fullName: 'Child Care and Development Fund', agency: 'HHS', status: 'partial', coverage: 'CA, CO, IL, MA, DC, NC, TX' },
  { id: 'head_start', name: 'Head Start', fullName: 'Head Start / Early Head Start', agency: 'HHS', status: 'partial', coverage: 'US', variable: 'head_start' },
  { id: 'liheap', name: 'LIHEAP', fullName: 'Low Income Home Energy Assistance Program', agency: 'HHS', status: 'partial', coverage: 'OR, DC, MA, IL' },
  { id: 'medicare', name: 'Medicare', fullName: 'Medicare Parts A and B', agency: 'HHS', status: 'complete', coverage: 'US', variable: 'is_medicare_eligible' },

  // SSA programs
  { id: 'ssi', name: 'SSI', fullName: 'Supplemental Security Income', agency: 'SSA', status: 'complete', coverage: 'US', variable: 'ssi' },
  { id: 'ssi_state_supplement', name: 'SSI state supplement', fullName: 'SSI State Supplement', agency: 'SSA', status: 'partial', coverage: '4 of 45 states' },
  { id: 'social_security', name: 'Social Security', fullName: 'Social Security (Retirement, Disability, Survivors)', agency: 'SSA', status: 'complete', coverage: 'US', variable: 'social_security' },

  // HUD programs
  { id: 'section_8', name: 'Section 8', fullName: 'Housing Choice Voucher Program', agency: 'HUD', status: 'inProgress', variable: 'hud_hap', notes: 'National rules; limited AMI data' },

  // FCC programs
  { id: 'lifeline', name: 'Lifeline', fullName: 'Lifeline Program', agency: 'FCC', status: 'complete', coverage: 'US', variable: 'lifeline' },
  { id: 'acp', name: 'Affordable Connectivity Program', fullName: 'Affordable Connectivity Program', agency: 'FCC', status: 'complete', coverage: 'US', variable: 'acp' },

  // Education
  { id: 'pell_grant', name: 'Pell Grant', fullName: 'Federal Pell Grant', agency: 'ED', status: 'complete', coverage: 'US', variable: 'pell_grant' },
  { id: 'education_tax_credits', name: 'Education tax credits', fullName: 'American Opportunity Credit, Lifetime Learning Credit', category: 'Education', status: 'complete', coverage: 'US' },

  // Energy
  { id: 'clean_vehicle_credits', name: 'Clean vehicle credits', fullName: 'Clean Vehicle Tax Credits (New and Used)', category: 'Energy', status: 'complete', coverage: 'US' },
  { id: 'residential_clean_energy', name: 'Residential clean energy credit', fullName: 'Residential Clean Energy Credit', category: 'Energy', status: 'complete', coverage: 'US' },
  { id: 'ira_tax_credits', name: 'IRA tax credits', fullName: 'Inflation Reduction Act Tax Credits', category: 'Energy', status: 'complete', coverage: 'US' },
  { id: 'doe_high_efficiency', name: 'DOE high efficiency rebate', fullName: 'High Efficiency Electric Home Rebate (HOMES)', agency: 'DOE', status: 'complete', coverage: 'US' },
  { id: 'doe_efficiency', name: 'DOE efficiency rebate', fullName: 'Residential Efficiency and Electrification Rebate', agency: 'DOE', status: 'complete', coverage: 'US' },

  // State and local programs
  { id: 'co_oap', name: 'Colorado OAP', fullName: 'Colorado Old Age Pension', agency: 'State', status: 'complete', coverage: 'CO' },
  { id: 'co_chp', name: 'Colorado CHP', fullName: 'Colorado Child Health Plan Plus', agency: 'State', status: 'complete', coverage: 'CO' },
  { id: 'dc_power', name: 'DC Power', fullName: 'DC Program on Work, Employment, and Responsibility', agency: 'State', status: 'complete', coverage: 'DC' },
  { id: 'dc_gac', name: 'DC GAC', fullName: 'DC General Assistance for Children', agency: 'State', status: 'complete', coverage: 'DC' },
  { id: 'ca_cvrp', name: 'California CVRP', fullName: 'California Clean Vehicle Rebate Project', agency: 'State', status: 'complete', coverage: 'CA' },
  { id: 'ca_capi', name: 'California CAPI', fullName: 'Cash Assistance Program for Immigrants', agency: 'State', status: 'complete', coverage: 'CA' },
  { id: 'ca_care', name: 'California CARE', fullName: 'Alternate Rates for Energy', agency: 'State', status: 'complete', coverage: 'CA' },
  { id: 'ca_fera', name: 'California FERA', fullName: 'Family Electric Rate Assistance', agency: 'State', status: 'complete', coverage: 'CA' },
  { id: 'il_fpp', name: 'Illinois Family Planning', fullName: 'Illinois HFS Family Planning Program', agency: 'State', status: 'complete', coverage: 'IL' },
  { id: 'il_ibccp', name: 'Illinois IBCCP', fullName: 'Health Benefits for Persons with Breast or Cervical Cancer', agency: 'State', status: 'complete', coverage: 'IL' },
  { id: 'il_hbwd', name: 'Illinois HBWD', fullName: 'Health Benefits for Workers with Disabilities', agency: 'State', status: 'complete', coverage: 'IL' },
  { id: 'ne_childcare', name: 'Nebraska child care subsidy', fullName: 'Nebraska Child Care Subsidy', agency: 'State', status: 'complete', coverage: 'NE' },
  { id: 'mbta_reduced_fare', name: 'MBTA reduced fare', fullName: 'MBTA Reduced Fare Program', agency: 'State', status: 'complete', coverage: 'MA' },
  { id: 'ma_eaedc', name: 'Massachusetts EAEDC', fullName: 'Emergency Aid to Elderly, Disabled, and Children', agency: 'State', status: 'complete', coverage: 'MA' },
  { id: 'ny_drive_clean', name: 'NY Drive Clean Rebate', fullName: 'NY Drive Clean Rebate', agency: 'State', status: 'complete', coverage: 'NY' },
  { id: 'tx_fpp', name: 'Texas FPP', fullName: 'Texas Family Planning Program', agency: 'State', status: 'complete', coverage: 'TX' },

  // Local programs
  { id: 'il_bap', name: 'Chicago Benefit Access', fullName: 'Chicago Department of Aging Benefit Access Program', agency: 'Local', status: 'complete', coverage: 'Chicago' },
  { id: 'il_cta', name: 'Chicago CTA benefit', fullName: 'Chicago Transit Authority Benefit', agency: 'Local', status: 'complete', coverage: 'Chicago' },
  { id: 'tx_dart', name: 'Dallas DART', fullName: 'Dallas Area Rapid Transit Benefit', agency: 'Local', status: 'complete', coverage: 'Dallas County' },
  { id: 'tx_harris_rides', name: 'Harris County Rides', fullName: 'Harris County Transportation Subsidy', agency: 'Local', status: 'complete', coverage: 'Harris County' },
  { id: 'la_ez_save', name: 'LA County EZ Save', fullName: 'Los Angeles County EZ Save', agency: 'Local', status: 'complete', coverage: 'Los Angeles County' },
  { id: 'la_infant_supplement', name: 'LA County infant supplement', fullName: 'Los Angeles County Infant Supplement', agency: 'Local', status: 'complete', coverage: 'Los Angeles County' },
  { id: 'la_expectant_parent', name: 'LA County expectant parent', fullName: 'Los Angeles County Expectant Parent Payment', agency: 'Local', status: 'complete', coverage: 'Los Angeles County' },
  { id: 'la_general_relief', name: 'LA County general relief', fullName: 'Los Angeles County General Relief', agency: 'Local', status: 'complete', coverage: 'Los Angeles County' },
  { id: 'riv_general_relief', name: 'Riverside County general relief', fullName: 'Riverside County General Relief', agency: 'Local', status: 'complete', coverage: 'Riverside County' },
  { id: 'riv_liheap', name: 'Riverside County LIHEAP', fullName: 'Riverside County LIHEAP', agency: 'Local', status: 'complete', coverage: 'Riverside County' },
  { id: 'riv_share', name: 'Riverside County SHARE', fullName: 'Sharing Households Assist Riverside Energy', agency: 'Local', status: 'complete', coverage: 'Riverside County' },
  { id: 'ala_general_assistance', name: 'Alameda County GA', fullName: 'Alameda County General Assistance', agency: 'Local', status: 'complete', coverage: 'Alameda County' },
  { id: 'nyc_income_tax', name: 'NYC income tax', fullName: 'New York City Income Tax', agency: 'Local', status: 'complete', coverage: 'New York City' },
  { id: 'sf_wftc', name: 'SF Working Families Tax Credit', fullName: 'San Francisco Working Families Tax Credit', agency: 'Local', status: 'complete', coverage: 'San Francisco' },
  { id: 'montgomery_eitc', name: 'Montgomery County EITC', fullName: 'Montgomery County Earned Income Tax Credit', agency: 'Local', status: 'complete', coverage: 'Montgomery County' },
  { id: 'chapter_7', name: 'Chapter 7 bankruptcy', fullName: 'Chapter 7 Bankruptcy', category: 'Legal', status: 'inProgress', coverage: 'US' },
];

export function getStatusCounts() {
  const counts = { complete: 0, partial: 0, inProgress: 0, notStarted: 0 };
  programs.forEach((p) => counts[p.status]++);
  return counts;
}

export function getCategories(): string[] {
  const cats = new Set<string>();
  programs.forEach((p) => {
    cats.add(p.agency || p.category || 'Other');
  });
  return Array.from(cats);
}
