import type { Program } from '../types/Program';

const GITHUB_BASE = 'https://github.com/PolicyEngine/policyengine-us/tree/main/policyengine_us';
const TESTS_BASE = 'https://github.com/PolicyEngine/policyengine-us/tree/main/policyengine_us/tests';

export const programs: Program[] = [
  // Tax Programs
  {
    id: 'federal_income_tax',
    name: 'Federal Income Taxes',
    fullName: 'Federal income taxes (including credits)',
    category: 'Taxes',
    status: 'complete',
    coverage: 'US',
    variable: 'income_tax',
    notes: 'Validated against NBER TAXSIM',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/irs`,
      variables: `${GITHUB_BASE}/variables/gov/irs`,
      tests: `${TESTS_BASE}/policy/baseline/gov/irs`,
    },
  },
  {
    id: 'state_income_tax',
    name: 'State Income Taxes',
    fullName: 'State income taxes (including credits)',
    category: 'Taxes',
    status: 'complete',
    coverage: 'US',
    hasStateVariation: true,
    variable: 'state_income_tax',
    notes: 'Validated against NBER TAXSIM',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states`,
      variables: `${GITHUB_BASE}/variables/gov/states`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states`,
    },
  },
  {
    id: 'payroll_taxes',
    name: 'Payroll Taxes',
    fullName: 'Payroll Taxes',
    category: 'Taxes',
    status: 'complete',
    coverage: 'US',
    variable: 'employee_payroll_tax',
    notes: 'Social Security and Medicare',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/irs/payroll`,
      variables: `${GITHUB_BASE}/variables/gov/irs/payroll`,
      tests: `${TESTS_BASE}/policy/baseline/gov/irs/payroll`,
    },
  },

  // USDA Programs
  {
    id: 'snap',
    name: 'SNAP',
    fullName: 'Supplemental Nutrition Assistance Program',
    agency: 'USDA',
    status: 'complete',
    coverage: 'US',
    hasStateVariation: true,
    variable: 'snap',
    notes: 'Needs some special deductions in AK, AZ, HI, NY, TN, VA',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/usda/snap`,
      variables: `${GITHUB_BASE}/variables/gov/usda/snap`,
      tests: `${TESTS_BASE}/policy/baseline/gov/usda/snap`,
    },
  },
  {
    id: 'wic',
    name: 'WIC',
    fullName: 'Women, Infants, and Children',
    agency: 'USDA',
    status: 'complete',
    coverage: 'US',
    variable: 'wic',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/usda/wic`,
      variables: `${GITHUB_BASE}/variables/gov/usda/wic`,
      tests: `${TESTS_BASE}/policy/baseline/gov/usda/wic`,
    },
  },
  {
    id: 'school_meals',
    name: 'Free and Reduced School Meals',
    fullName: 'Free and reduced price school meals',
    agency: 'USDA',
    status: 'complete',
    coverage: 'US',
    notes: 'Nationwide rules',
    variable: 'free_school_meals',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/usda/school_meals`,
      variables: `${GITHUB_BASE}/variables/gov/usda/school_meals`,
      tests: `${TESTS_BASE}/policy/baseline/gov/usda/school_meals`,
    },
  },
  {
    id: 'summer_ebt',
    name: 'Summer EBT',
    fullName: 'Summer Electronic Benefit Transfer',
    agency: 'USDA',
    status: 'inProgress',
    coverage: 'US',
    githubLinks: {},
  },
  {
    id: 'csfp',
    name: 'Commodity Supplemental Food Program',
    fullName: 'Commodity Supplemental Food Program',
    agency: 'USDA',
    status: 'complete',
    coverage: 'US',
    variable: 'csfp',
    notes: 'Provides nutritious foods to low-income pregnant/postpartum women, infants, children, and seniors',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/usda/csfp`,
      variables: `${GITHUB_BASE}/variables/gov/usda/csfp`,
      tests: `${TESTS_BASE}/policy/baseline/gov/usda/csfp`,
    },
  },
  {
    id: 'fdpir',
    name: 'FDPIR',
    fullName: 'Food Distribution Program on Indian Reservations',
    agency: 'USDA',
    status: 'complete',
    coverage: 'US',
    variable: 'fdpir',
    notes: 'USDA foods to low-income households on Indian reservations and to Native American families',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/usda/fdpir`,
      variables: `${GITHUB_BASE}/variables/gov/usda/fdpir`,
      tests: `${TESTS_BASE}/policy/baseline/gov/usda/fdpir`,
    },
  },

  // HHS Programs
  {
    id: 'medicaid',
    name: 'Medicaid',
    fullName: '',
    agency: 'HHS',
    status: 'complete',
    coverage: 'US',
    hasStateVariation: true,
    variable: 'medicaid',
    notes: '8 pathways',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/hhs/medicaid`,
      variables: `${GITHUB_BASE}/variables/gov/hhs/medicaid`,
      tests: `${TESTS_BASE}/policy/baseline/gov/hhs/medicaid`,
    },
  },
  {
    id: 'chip',
    name: 'CHIP',
    fullName: "Children's Health Insurance Program",
    agency: 'HHS',
    status: 'complete',
    coverage: 'US',
    hasStateVariation: true,
    variable: 'chip',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/hhs/chip`,
      variables: `${GITHUB_BASE}/variables/gov/hhs/chip`,
      tests: `${TESTS_BASE}/policy/baseline/gov/hhs/chip`,
    },
  },
  {
    id: 'aca_subsidies',
    name: 'ACA Subsidies',
    fullName: 'ACA subsidies (premium tax credit)',
    agency: 'ACA',
    status: 'complete',
    coverage: 'US',
    hasStateVariation: true,
    variable: 'aca_ptc',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/aca`,
      variables: `${GITHUB_BASE}/variables/gov/aca`,
      tests: `${TESTS_BASE}/policy/baseline/gov/aca`,
    },
  },
  {
    id: 'tanf',
    name: 'TANF',
    fullName: 'Temporary Assistance for Needy Families',
    agency: 'HHS',
    status: 'inProgress',
    coverage: 'US',
    stateImplementations: [
      {
        state: 'CA',
        status: 'complete',
        name: 'CalWORKs Cash Benefit',
        fullName: 'California CalWORKs Cash Benefit',
        variable: 'ca_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ca/cdss/tanf/cash`,
          variables: `${GITHUB_BASE}/variables/gov/states/ca/cdss/tanf/cash`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ca/cdss/tanf/cash`,
        }
      },
      {
        state: 'CO',
        status: 'complete',
        name: 'Colorado TANF',
        fullName: 'Colorado Works Program',
        variable: 'co_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/co/cdhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/co/cdhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/co/cdhs/tanf`,
        }
      },
      {
        state: 'DC',
        status: 'complete',
        name: 'DC TANF',
        fullName: 'DC Temporary Assistance for Needy Families',
        variable: 'dc_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/dc/dhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/dc/dhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/dc/dhs/tanf`,
        }
      },
      {
        state: 'IL',
        status: 'complete',
        name: 'Illinois TANF',
        fullName: 'Illinois Temporary Assistance for Needy Families',
        variable: 'il_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/il/dhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/il/dhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/il/dhs/tanf`,
        }
      },
      {
        state: 'NY',
        status: 'complete',
        name: 'NY TANF',
        fullName: 'New York Temporary Assistance for Needy Families',
        variable: 'ny_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ny/otda/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/ny/otda/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ny/otda/tanf`,
        }
      },
      {
        state: 'MA',
        status: 'complete',
        name: 'Massachusets TAFDC',
        fullName: 'Transitional Aid to Families with Dependent Children',
        variable: 'ma_tafdc',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ma/dta/tcap/tafdc`,
          variables: `${GITHUB_BASE}/variables/gov/states/ma/dta/tcap/tafdc`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ma/dta/tcap/tafdc`,
        }
      },
      {
        state: 'MT',
        status: 'inProgress',
        name: 'Montana TANF',
        fullName: 'Montana Temporary Assistance for Needy Families',
        githubLinks: {}
      },
      {
        state: 'NC',
        status: 'complete',
        name: 'North Carolina TANF',
        fullName: 'North Carolina Work First',
        variable: 'nc_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nc/ncdhhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/nc/ncdhhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nc/ncdhhs/tanf`,
        }
      },
      {
        state: 'NJ',
        status: 'complete',
        name: 'New Jersey WFNJ',
        fullName: 'New Jersey WorkFirst',
        variable: 'nj_wfnj',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nj/njdhs/wfnj`,
          variables: `${GITHUB_BASE}/variables/gov/states/nj/njdhs/wfnj`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nj/njdhs/wfnj`,
        }
      },
      {
        state: 'TX',
        status: 'complete',
        name: 'Texas TANF',
        fullName: 'Texas Temporary Assistance for Needy Families',
        variable: 'tx_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/tx/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/tx/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/tx/tanf`,
        }
      },
      {
        state: 'WA',
        status: 'complete',
        name: 'Washington TANF',
        fullName: 'WorkFirst',
        variable: 'wa_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/wa/dshs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/wa/dshs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/wa/dshs/tanf`,
        }
      },
      {
        state: 'AZ',
        status: 'complete',
        name: 'Arizona TANF',
        fullName: 'Arizona Temporary Assistance for Needy Families',
        variable: 'az_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/az/hhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/az/hhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/az/hhs/tanf`,
        }
      },
      {
        state: 'OK',
        status: 'complete',
        name: 'Oklahoma TANF',
        fullName: 'Oklahoma Temporary Assistance for Needy Families',
        variable: 'ok_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ok/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/ok/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ok/tanf`,
        }
      },
      {
        state: 'MO',
        status: 'complete',
        name: 'Missouri TANF',
        fullName: 'Missouri Temporary Assistance',
        variable: 'mo_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/mo/dss/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/mo/dss/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/mo/dss/tanf`,
        }
      },
      {
        state: 'PA',
        status: 'complete',
        name: 'Pennsylvania TANF',
        fullName: 'Pennsylvania Temporary Assistance for Needy Families',
        variable: 'pa_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/pa/dhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/pa/dhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/pa/dhs/tanf`,
        }
      },
      {
        state: 'MD',
        status: 'complete',
        name: 'Maryland TCA',
        fullName: 'Maryland Temporary Cash Assistance',
        variable: 'md_tca',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/md/tca`,
          variables: `${GITHUB_BASE}/variables/gov/states/md/tca`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/md/tca`,
        }
      },
      {
        state: 'SD',
        status: 'complete',
        name: 'South Dakota TANF',
        fullName: 'South Dakota Temporary Assistance for Needy Families',
        variable: 'sd_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/sd/dss/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/sd/dss/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/sd/dss/tanf`,
        }
      },
      {
        state: 'GA',
        status: 'complete',
        name: 'Georgia TANF',
        fullName: 'Georgia Temporary Assistance for Needy Families',
        variable: 'ga_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ga/dfcs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/ga/dfcs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ga/dfcs/tanf`,
        }
      },
      {
        state: 'MS',
        status: 'complete',
        name: 'Mississippi TANF',
        fullName: 'Mississippi Temporary Assistance for Needy Families',
        variable: 'ms_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ms/dhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/ms/dhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ms/dhs/tanf`,
        }
      },
      {
        state: 'IN',
        status: 'complete',
        name: 'Indiana TANF',
        fullName: 'Indiana Temporary Assistance for Needy Families',
        variable: 'in_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/in/fssa/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/in/fssa/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/in/fssa/tanf`,
        }
      },
      {
        state: 'FL',
        status: 'complete',
        name: 'Florida TCA',
        fullName: 'Florida Temporary Cash Assistance',
        variable: 'fl_tca',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/fl/dcf/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/fl/dcf/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/fl/dcf/tanf`,
        }
      },
      {
        state: 'ME',
        status: 'complete',
        name: 'Maine TANF',
        fullName: 'Maine Temporary Assistance for Needy Families',
        variable: 'me_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/me/dhhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/me/dhhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/me/dhhs/tanf`,
        }
      },
      {
        state: 'NV',
        status: 'complete',
        name: 'Nevada TANF',
        fullName: 'Nevada Temporary Assistance for Needy Families',
        variable: 'nv_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nv/dwss/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/nv/dwss/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nv/dwss/tanf`,
        }
      },
      {
        state: 'KS',
        status: 'complete',
        name: 'Kansas TANF',
        fullName: 'Kansas Temporary Assistance for Needy Families',
        variable: 'ks_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ks/dcf/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/ks/dcf/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ks/dcf/tanf`,
        }
      },
      {
        state: 'HI',
        status: 'complete',
        name: 'Hawaii TANF',
        fullName: 'Hawaii Temporary Assistance for Needy Families',
        variable: 'hi_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/hi/dhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/hi/dhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/hi/dhs/tanf`,
        }
      },
      {
        state: 'DE',
        status: 'complete',
        name: 'Delaware TANF',
        fullName: 'Delaware Temporary Assistance for Needy Families',
        variable: 'de_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/de/dhss/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/de/dhss/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/de/dhss/tanf`,
        }
      },
      {
        state: 'OR',
        status: 'complete',
        name: 'Oregon TANF',
        fullName: 'Oregon Temporary Assistance for Needy Families',
        variable: 'or_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/or/odhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/or/odhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/or/odhs/tanf`,
        }
      },
      {
        state: 'MN',
        status: 'complete',
        name: 'Minnesota MFIP',
        fullName: 'Minnesota Family Investment Program',
        variable: 'mn_mfip',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/mn/dcyf/mfip`,
          variables: `${GITHUB_BASE}/variables/gov/states/mn/dcyf/mfip`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/mn/dcyf/mfip`,
        }
      },
      {
        state: 'TN',
        status: 'complete',
        name: 'Tennessee Families First',
        fullName: 'Tennessee Families First',
        variable: 'tn_ff',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/tn/dhs/ff`,
          variables: `${GITHUB_BASE}/variables/gov/states/tn/dhs/ff`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/tn/dhs/ff`,
        }
      },
      {
        state: 'WV',
        status: 'complete',
        name: 'West Virginia WORKS',
        fullName: 'West Virginia WORKS',
        variable: 'wv_works',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/wv/dhhr/works`,
          variables: `${GITHUB_BASE}/variables/gov/states/wv/dhhr/works`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/wv/dhhr/works`,
        }
      },
      {
        state: 'RI',
        status: 'complete',
        name: 'Rhode Island WORKS',
        fullName: 'Rhode Island WORKS',
        variable: 'ri_works',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ri/dhs/works`,
          variables: `${GITHUB_BASE}/variables/gov/states/ri/dhs/works`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ri/dhs/works`,
        }
      },
      {
        state: 'NH',
        status: 'complete',
        name: 'New Hampshire FANF',
        fullName: 'New Hampshire Family Assistance for Needy Families',
        variable: 'nh_fanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nh/dhhs/fanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/nh/dhhs/fanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nh/dhhs/fanf`,
        }
      },
      {
        state: 'CT',
        status: 'complete',
        name: 'Connecticut TFA',
        fullName: 'Connecticut Temporary Family Assistance',
        variable: 'ct_tfa',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ct/dss/tfa`,
          variables: `${GITHUB_BASE}/variables/gov/states/ct/dss/tfa`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ct/dss/tfa`,
        }
      },
      {
        state: 'OH',
        status: 'complete',
        name: 'Ohio Works First',
        fullName: 'Ohio Works First',
        variable: 'oh_owf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/oh/odjfs/owf`,
          variables: `${GITHUB_BASE}/variables/gov/states/oh/odjfs/owf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/oh/odjfs/owf`,
        }
      },
      {
        state: 'MI',
        status: 'complete',
        name: 'Michigan FIP',
        fullName: 'Michigan Family Independence Program',
        variable: 'mi_fip',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/mi/mdhhs/fip`,
          variables: `${GITHUB_BASE}/variables/gov/states/mi/mdhhs/fip`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/mi/mdhhs/fip`,
        }
      },
      {
        state: 'WI',
        status: 'complete',
        name: 'Wisconsin Works',
        fullName: 'Wisconsin Works (W-2)',
        variable: 'wi_works',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/wi/dcf/works`,
          variables: `${GITHUB_BASE}/variables/gov/states/wi/dcf/works`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/wi/dcf/works`,
        }
      },
      {
        state: 'ID',
        status: 'complete',
        name: 'Idaho TAFI',
        fullName: 'Temporary Assistance for Families in Idaho',
        variable: 'id_tafi',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/id/tafi`,
          variables: `${GITHUB_BASE}/variables/gov/states/id/tafi`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/id/tafi`,
        }
      },
      {
        state: 'NE',
        status: 'complete',
        name: 'Nebraska ADC',
        fullName: 'Nebraska Aid to Dependent Children',
        variable: 'ne_adc',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ne/dhhs/adc`,
          variables: `${GITHUB_BASE}/variables/gov/states/ne/dhhs/adc`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ne/dhhs/adc`,
        }
      },
      {
        state: 'AR',
        status: 'complete',
        name: 'Arkansas TEA',
        fullName: 'Arkansas Transitional Employment Assistance',
        variable: 'ar_tea',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ar/dhs/tea`,
          variables: `${GITHUB_BASE}/variables/gov/states/ar/dhs/tea`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ar/dhs/tea`,
        }
      },
      {
        state: 'UT',
        status: 'complete',
        name: 'Utah FEP',
        fullName: 'Utah Family Employment Program',
        variable: 'ut_fep',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ut/dwf/fep`,
          variables: `${GITHUB_BASE}/variables/gov/states/ut/dwf/fep`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ut/dwf/fep`,
        }
      },
      {
        state: 'KY',
        status: 'complete',
        name: 'Kentucky K-TAP',
        fullName: 'Kentucky Transitional Assistance Program',
        variable: 'ky_ktap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ky/dcbs/ktap`,
          variables: `${GITHUB_BASE}/variables/gov/states/ky/dcbs/ktap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ky/dcbs/ktap`,
        }
      },
      {
        state: 'AL',
        status: 'complete',
        name: 'Alabama TANF',
        fullName: 'Alabama Family Assistance',
        variable: 'al_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/al/dhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/al/dhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/al/dhs/tanf`,
        }
      },
      {
        state: 'AK',
        status: 'complete',
        name: 'Alaska ATAP',
        fullName: 'Alaska Temporary Assistance Program',
        variable: 'ak_atap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ak/dpa/atap`,
          variables: `${GITHUB_BASE}/variables/gov/states/ak/dpa/atap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ak/dpa/atap`,
        }
      },
      {
        state: 'IA',
        status: 'inProgress',
        name: 'Iowa FIP',
        fullName: 'Iowa Family Investment Program',
        githubLinks: {}
      },
      {
        state: 'LA',
        status: 'complete',
        name: 'Louisiana FITAP',
        fullName: 'Louisiana Family Independence Temporary Assistance Program',
        variable: 'la_fitap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/la/dcfs/fitap`,
          variables: `${GITHUB_BASE}/variables/gov/states/la/dcfs/fitap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/la/dcfs/fitap`,
        }
      },
      {
        state: 'NM',
        status: 'complete',
        name: 'New Mexico Works',
        fullName: 'New Mexico Works',
        variable: 'nm_works',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nm/hca/nm_works`,
          variables: `${GITHUB_BASE}/variables/gov/states/nm/hca/nm_works`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nm/hca/nm_works`,
        }
      },
      {
        state: 'ND',
        status: 'complete',
        name: 'North Dakota TANF',
        fullName: 'North Dakota Temporary Assistance for Needy Families',
        variable: 'nd_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nd/dhs/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/nd/dhs/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nd/dhs/tanf`,
        }
      },
      {
        state: 'SC',
        status: 'complete',
        name: 'South Carolina TANF',
        fullName: 'South Carolina Family Independence',
        variable: 'sc_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/sc/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/sc/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/sc/tanf`,
        }
      },
      {
        state: 'VT',
        status: 'complete',
        name: 'Vermont Reach Up',
        fullName: 'Vermont Reach Up',
        variable: 'vt_reach_up',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/vt/dcf/reach_up`,
          variables: `${GITHUB_BASE}/variables/gov/states/vt/dcf/reach_up`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/vt/dcf/reach_up`,
        }
      },
      {
        state: 'VA',
        status: 'complete',
        name: 'Virginia TANF',
        fullName: 'Virginia Temporary Assistance for Needy Families',
        variable: 'va_tanf',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/va/dss/tanf`,
          variables: `${GITHUB_BASE}/variables/gov/states/va/dss/tanf`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/va/dss/tanf`,
        }
      },
      {
        state: 'WY',
        status: 'complete',
        name: 'Wyoming POWER',
        fullName: 'Wyoming Personal Opportunities With Employment Responsibilities',
        variable: 'wy_power',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/wy/dfs/power`,
          variables: `${GITHUB_BASE}/variables/gov/states/wy/dfs/power`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/wy/dfs/power`,
        }
      },
    ],
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/hhs/tanf`,
      variables: `${GITHUB_BASE}/variables/gov/hhs/tanf`,
      tests: `${TESTS_BASE}/policy/baseline/gov/hhs/tanf`,
    },
  },
  {
    id: 'ccdf',
    name: 'CCDF',
    fullName: 'Child Care and Development Fund',
    agency: 'HHS',
    status: 'partial',
    notes: 'CCDF is a federal block grant — every state and DC operate a CCDF-funded child-care subsidy program. The state list below tracks how many of those state programs are implemented end-to-end in policyengine-us (with the state agency\'s actual eligibility, copay, and payment-rate rules), not which states have CCDF at all.',
    coverage: '18 state programs implemented + 7 in open PRs',
    stateImplementations: [
      {
        state: 'AK',
        status: 'complete',
        name: 'Alaska CCAP',
        fullName: 'Alaska Child Care Assistance Program',
        variable: 'ak_ccap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ak/dpa/ccap`,
          variables: `${GITHUB_BASE}/variables/gov/states/ak/dpa/ccap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ak/dpa/ccap`,
        }
      },
      {
        state: 'CA',
        status: 'complete',
        name: 'CalWORKs Childcare',
        fullName: 'California CalWORKs Child Care',
        variable: 'ca_calworks_child_care',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ca/cdss/tanf/child_care`,
          variables: `${GITHUB_BASE}/variables/gov/states/ca/cdss/tanf/child_care`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ca/cdss/tanf/child_care`,
        }
      },
      {
        state: 'CO',
        status: 'complete',
        name: 'CCAP',
        fullName: 'Colorado Child Care Assistance Program',
        notes: 'CCCAP',
        variable: 'co_ccap_subsidy',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/co/ccap`,
          variables: `${GITHUB_BASE}/variables/gov/states/co/ccap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/co/ccap`,
        }
      },
      {
        state: 'CT',
        status: 'complete',
        name: 'Care 4 Kids',
        fullName: 'Connecticut Care 4 Kids (C4K)',
        variable: 'ct_c4k',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ct/oec/c4k`,
          variables: `${GITHUB_BASE}/variables/gov/states/ct/oec/c4k`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ct/oec/c4k`,
        }
      },
      {
        state: 'DE',
        status: 'complete',
        name: 'Purchase of Care',
        fullName: 'Delaware Purchase of Care (POC)',
        variable: 'de_poc',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/de/dss/poc`,
          variables: `${GITHUB_BASE}/variables/gov/states/de/dss/poc`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/de/dss/poc`,
        }
      },
      {
        state: 'IL',
        status: 'complete',
        name: 'CCAP',
        fullName: 'Child Care Assistance Program (Illinois)',
        notes: 'Only includes eligibility rules',
        variable: 'il_ccap_eligible',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/il/dhs/ccap`,
          variables: `${GITHUB_BASE}/variables/gov/states/il/dhs/ccap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/il/dhs/ccap`,
        }
      },
      {
        state: 'MA',
        status: 'complete',
        name: 'Massachusetts CCFA',
        fullName: 'Massachusetts Child Care Financial Assistance',
        githubLinks: {},
      },
      {
        state: 'ME',
        status: 'complete',
        name: 'Maine CCAP',
        fullName: 'Maine Child Care Assistance Program',
        variable: 'me_ccap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/me/dhhs/ccap`,
          variables: `${GITHUB_BASE}/variables/gov/states/me/dhhs/ccap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/me/dhhs/ccap`,
        }
      },
      {
        state: 'DC',
        status: 'complete',
        name: 'DC CCSP',
        fullName: 'DC Child Care Subsidy Program',
        variable: 'dc_ccsp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/dc/dhs/ccsp`,
          variables: `${GITHUB_BASE}/variables/gov/states/dc/dhs/ccsp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/dc/dhs/ccsp`,
        }
      },
      {
        state: 'NC',
        status: 'complete',
        name: 'North Carolina SCCA',
        fullName: 'North Carolina Subsidized Child Care Assistance',
        variable: 'nc_scca',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nc/ncdhhs/scca`,
          variables: `${GITHUB_BASE}/variables/gov/states/nc/ncdhhs/scca`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nc/ncdhhs/scca`,
        }
      },
      {
        state: 'NE',
        status: 'complete',
        name: 'Nebraska Child Care Subsidy',
        fullName: 'Nebraska Child Care Subsidy',
        variable: 'ne_child_care_subsidy',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ne/dhhs/child_care_subsidy`,
          variables: `${GITHUB_BASE}/variables/gov/states/ne/dhhs/child_care_subsidy`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ne/dhhs/child_care_subsidy`,
        }
      },
      {
        state: 'PA',
        status: 'complete',
        name: 'Child Care Works',
        fullName: 'Pennsylvania Child Care Works (CCW)',
        variable: 'pa_ccw',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/pa/dhs/ccw`,
          variables: `${GITHUB_BASE}/variables/gov/states/pa/dhs/ccw`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/pa/dhs/ccw`,
        }
      },
      {
        state: 'NH',
        status: 'complete',
        name: 'New Hampshire CCAP',
        fullName: 'New Hampshire Child Care Assistance Program',
        variable: 'nh_ccap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nh/dhhs/ccap`,
          variables: `${GITHUB_BASE}/variables/gov/states/nh/dhhs/ccap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nh/dhhs/ccap`,
        }
      },
      {
        state: 'NJ',
        status: 'complete',
        name: 'New Jersey CCAP',
        fullName: 'New Jersey Child Care Assistance Program',
        variable: 'nj_ccap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nj/njdhs/ccap`,
          variables: `${GITHUB_BASE}/variables/gov/states/nj/njdhs/ccap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nj/njdhs/ccap`,
        }
      },
      {
        state: 'RI',
        status: 'complete',
        name: 'Rhode Island CCAP',
        fullName: 'Rhode Island Child Care Assistance Program',
        variable: 'ri_ccap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ri/dhs/ccap`,
          variables: `${GITHUB_BASE}/variables/gov/states/ri/dhs/ccap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ri/dhs/ccap`,
        }
      },
      {
        state: 'SC',
        status: 'complete',
        name: 'South Carolina CCAP',
        fullName: 'South Carolina Child Care Assistance Program',
        variable: 'sc_ccap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/sc/dss/ccap`,
          variables: `${GITHUB_BASE}/variables/gov/states/sc/dss/ccap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/sc/dss/ccap`,
        }
      },
      {
        state: 'TX',
        status: 'complete',
        name: 'Texas CCS',
        fullName: 'Texas Child Care Services',
        variable: 'tx_ccs',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/tx/twc/ccs`,
          variables: `${GITHUB_BASE}/variables/gov/states/tx/twc/ccs`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/tx/twc/ccs`,
        }
      },
      {
        state: 'VA',
        status: 'complete',
        name: 'Virginia CCSP',
        fullName: 'Virginia Child Care Subsidy Program',
        variable: 'va_ccsp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/va/dss/ccsp`,
          variables: `${GITHUB_BASE}/variables/gov/states/va/dss/ccsp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/va/dss/ccsp`,
        }
      },
      // Open PRs in policyengine-us — implementation work in flight.
      {
        state: 'AL',
        status: 'inProgress',
        name: 'Alabama CCSP',
        fullName: 'Alabama Child Care Subsidy Program',
        notes: 'Open PR #8322',
        githubLinks: {
          variables: `https://github.com/PolicyEngine/policyengine-us/pull/8322`,
        }
      },
      {
        state: 'AR',
        status: 'inProgress',
        name: 'Arkansas SRA',
        fullName: 'Arkansas School Readiness Assistance (formerly CCAP)',
        notes: 'Open PR #8324',
        githubLinks: {
          variables: `https://github.com/PolicyEngine/policyengine-us/pull/8324`,
        }
      },
      {
        state: 'AZ',
        status: 'inProgress',
        name: 'Arizona CCAP',
        fullName: 'Arizona Child Care Assistance Program',
        notes: 'Open PR #8373',
        githubLinks: {
          variables: `https://github.com/PolicyEngine/policyengine-us/pull/8373`,
        }
      },
      {
        state: 'GA',
        status: 'inProgress',
        name: 'Georgia CAPS',
        fullName: 'Georgia Childcare and Parent Services',
        notes: 'Open PR #7958',
        githubLinks: {
          variables: `https://github.com/PolicyEngine/policyengine-us/pull/7958`,
        }
      },
      {
        state: 'MD',
        status: 'inProgress',
        name: 'Maryland CCS',
        fullName: 'Maryland Child Care Scholarship',
        notes: 'Open PR #7889',
        githubLinks: {
          variables: `https://github.com/PolicyEngine/policyengine-us/pull/7889`,
        }
      },
      {
        state: 'WA',
        status: 'inProgress',
        name: 'Washington WCCC',
        fullName: 'Washington Working Connections Child Care',
        notes: 'Open PR #8208',
        githubLinks: {
          variables: `https://github.com/PolicyEngine/policyengine-us/pull/8208`,
        }
      },
      {
        state: 'WV',
        status: 'inProgress',
        name: 'West Virginia CCAP',
        fullName: 'West Virginia Child Care Assistance Program',
        notes: 'Open PR #7948',
        githubLinks: {
          variables: `https://github.com/PolicyEngine/policyengine-us/pull/7948`,
        }
      },
    ],
    githubLinks: {},
  },
  {
    id: 'head_start',
    name: 'Head Start',
    fullName: 'Head Start / Early Head Start',
    agency: 'HHS',
    status: 'partial',
    coverage: 'US (federal); WA ECEAP as state pre-K equivalent',
    notes: 'Federal Head Start / Early Head Start implemented; currently adding immigration rules. Washington ECEAP (Early Childhood Education and Assistance Program) is implemented separately as a state-funded pre-K program at gov/states/wa/dcyf/eceap.',
    variable: 'head_start',
    stateImplementations: [
      {
        state: 'WA',
        status: 'complete',
        name: 'WA ECEAP',
        fullName: 'Washington Early Childhood Education and Assistance Program',
        notes: 'State-funded pre-K program (Head Start equivalent)',
        variable: 'wa_eceap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/wa/dcyf/eceap`,
          variables: `${GITHUB_BASE}/variables/gov/states/wa/dcyf/eceap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/wa/dcyf/eceap`,
        }
      },
    ],
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/hhs/head_start`,
      variables: `${GITHUB_BASE}/variables/gov/hhs/head_start`,
      tests: `${TESTS_BASE}/policy/baseline/gov/hhs/head_start`,
    },
  },
  {
    id: 'liheap',
    name: 'LIHEAP',
    fullName: 'Low Income Home Energy Assistance Program',
    agency: 'HHS',
    status: 'partial',
    coverage: 'DC, IL, MA, TX (state programs); OR in progress',
    stateImplementations: [
      {
        state: 'OR',
        status: 'inProgress',
        name: 'LIHEAP',
        fullName: 'Low Income Home Energy Assistance Program (Oregon)',
        githubLinks: {},
      },
      {
        state: 'DC',
        status: 'complete',
        name: 'DC LIHEAP',
        fullName: 'DC Low Income Home Energy Assistance Program',
        variable: 'dc_liheap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/dc/doee/liheap`,
          variables: `${GITHUB_BASE}/variables/gov/states/dc/doee/liheap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/dc/doee/liheap`,
        }
      },
      {
        state: 'MA',
        status: 'complete',
        name: 'Massachusetts LIHEAP',
        fullName: 'Massachusetts Low Income Home Energy Assistance Program',
        variable: 'ma_liheap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ma/doer/liheap`,
          variables: `${GITHUB_BASE}/variables/gov/states/ma/doer/liheap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ma/doer/liheap`,
        }
      },
      {
        state: 'IL',
        status: 'complete',
        name: 'Illinois LIHEAP',
        fullName: 'Illinois Low Income Home Energy Assistance Program',
        variable: 'il_liheap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/il/dceo/liheap`,
          variables: `${GITHUB_BASE}/variables/gov/states/il/dceo/liheap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/il/dceo/liheap`,
        }
      },
      {
        state: 'TX',
        status: 'complete',
        name: 'Texas CEAP',
        fullName: 'Texas Comprehensive Energy Assistance Program',
        notes: 'CEAP is Texas\'s LIHEAP-funded energy assistance program',
        variable: 'tx_ceap',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/tx/tdhca/ceap`,
          variables: `${GITHUB_BASE}/variables/gov/states/tx/tdhca/ceap`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/tx/tdhca/ceap`,
        }
      },
    ],
    githubLinks: {},
  },

  // SSA Programs
  {
    id: 'ssi',
    name: 'SSI',
    fullName: 'Supplemental Security Income',
    agency: 'SSA',
    status: 'complete',
    coverage: 'US',
    variable: 'ssi',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/ssa/ssi`,
      variables: `${GITHUB_BASE}/variables/gov/ssa/ssi`,
      tests: `${TESTS_BASE}/policy/baseline/gov/ssa/ssi`,
    },
  },
  {
    id: 'ssi_state_supplement',
    name: 'SSI State Supplement',
    fullName: 'SSI State Supplement',
    agency: 'SSA',
    status: 'partial',
    coverage: '17 of 45+DC states with SSP programs implemented',
    notes: 'SSI State Supplement programs exist in 45 states plus DC; 17 implemented in policyengine-us (AK, AL, CA, CO, CT, DE, GA, IL, IN, KY, MA, ME, MI, NM, SC, TX, WA)',
    stateImplementations: [
      {
        state: 'CA',
        status: 'complete',
        name: 'California SSP',
        fullName: 'California State Supplementary Payment',
        variable: 'ca_state_supplement',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ca/cdss/state_supplement`,
          variables: `${GITHUB_BASE}/variables/gov/states/ca/cdss/state_supplement`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ca/cdss/state_supplement`,
        }
      },
      {
        state: 'CO',
        status: 'complete',
        name: 'Colorado SSP',
        fullName: 'Colorado State Supplementary Payment',
        variable: 'co_state_supplement',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/co/ssa/state_supplement`,
          variables: `${GITHUB_BASE}/variables/gov/states/co/ssa/state_supplement`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/co/ssa/state_supplement`,
        }
      },
      {
        state: 'MA',
        status: 'complete',
        name: 'Massachusetts SSP',
        fullName: 'Massachusetts State Supplementary Payment',
        variable: 'ma_state_supplement',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ma/dta/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/ma/dta/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ma/dta/ssp`,
        }
      },
      {
        state: 'IL',
        status: 'complete',
        name: 'Illinois AABD',
        fullName: 'Illinois Aid to the Aged, Blind or Disabled',
        variable: 'il_aabd',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/il/dhs/aabd`,
          variables: `${GITHUB_BASE}/variables/gov/states/il/dhs/aabd`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/il/dhs/aabd`,
        }
      },
      {
        state: 'NY',
        status: 'notStarted',
        name: 'New York SSP',
        fullName: 'New York State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'PA',
        status: 'notStarted',
        name: 'Pennsylvania SSP',
        fullName: 'Pennsylvania State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'NJ',
        status: 'notStarted',
        name: 'New Jersey SSP',
        fullName: 'New Jersey State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'NV',
        status: 'notStarted',
        name: 'Nevada SSP',
        fullName: 'Nevada State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'CT',
        status: 'complete',
        name: 'Connecticut SSP',
        fullName: 'Connecticut State Supplementary Payment',
        variable: 'ct_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ct/dss/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/ct/dss/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ct/dss/ssp`,
        }
      },
      {
        state: 'MI',
        status: 'complete',
        name: 'Michigan SSP',
        fullName: 'Michigan State Supplementary Payment',
        variable: 'mi_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/mi/mdhhs/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/mi/mdhhs/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/mi/mdhhs/ssp`,
        }
      },
      {
        state: 'VT',
        status: 'notStarted',
        name: 'Vermont SSP',
        fullName: 'Vermont State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'RI',
        status: 'notStarted',
        name: 'Rhode Island SSP',
        fullName: 'Rhode Island State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'DE',
        status: 'complete',
        name: 'Delaware SSP',
        fullName: 'Delaware State Supplementary Payment',
        variable: 'de_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/de/dhss/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/de/dhss/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/de/dhss/ssp`,
        }
      },
      {
        state: 'HI',
        status: 'notStarted',
        name: 'Hawaii SSP',
        fullName: 'Hawaii State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'AL',
        status: 'complete',
        name: 'Alabama SSP',
        fullName: 'Alabama State Supplementary Payment',
        variable: 'al_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/al/dhr/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/al/dhr/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/al/dhr/ssp`,
        }
      },
      {
        state: 'AK',
        status: 'complete',
        name: 'Alaska SSP',
        fullName: 'Alaska State Supplementary Payment',
        variable: 'ak_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ak/dpa/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/ak/dpa/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ak/dpa/ssp`,
        }
      },
      {
        state: 'DC',
        status: 'notStarted',
        name: 'DC SSP',
        fullName: 'District of Columbia State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'FL',
        status: 'notStarted',
        name: 'Florida SSP',
        fullName: 'Florida State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'GA',
        status: 'complete',
        name: 'Georgia SSP',
        fullName: 'Georgia State Supplementary Payment',
        variable: 'ga_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ga/dhs/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/ga/dhs/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ga/dhs/ssp`,
        }
      },
      {
        state: 'ID',
        status: 'notStarted',
        name: 'Idaho SSP',
        fullName: 'Idaho State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'IN',
        status: 'complete',
        name: 'Indiana SSP',
        fullName: 'Indiana State Supplementary Payment',
        variable: 'in_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/in/fssa/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/in/fssa/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/in/fssa/ssp`,
        }
      },
      {
        state: 'IA',
        status: 'notStarted',
        name: 'Iowa SSP',
        fullName: 'Iowa State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'KS',
        status: 'notStarted',
        name: 'Kansas SSP',
        fullName: 'Kansas State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'KY',
        status: 'complete',
        name: 'Kentucky SSP',
        fullName: 'Kentucky State Supplementary Payment',
        variable: 'ky_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/ky/dcbs/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/ky/dcbs/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/ky/dcbs/ssp`,
        }
      },
      {
        state: 'LA',
        status: 'notStarted',
        name: 'Louisiana SSP',
        fullName: 'Louisiana State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'ME',
        status: 'complete',
        name: 'Maine SSP',
        fullName: 'Maine State Supplementary Payment',
        variable: 'me_ssp',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/me/dhhs/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/me/dhhs/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/me/dhhs/ssp`,
        }
      },
      {
        state: 'MD',
        status: 'notStarted',
        name: 'Maryland SSP',
        fullName: 'Maryland State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'MN',
        status: 'notStarted',
        name: 'Minnesota SSP',
        fullName: 'Minnesota State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'MO',
        status: 'notStarted',
        name: 'Missouri SSP',
        fullName: 'Missouri State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'MT',
        status: 'notStarted',
        name: 'Montana SSP',
        fullName: 'Montana State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'NE',
        status: 'notStarted',
        name: 'Nebraska SSP',
        fullName: 'Nebraska State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'NH',
        status: 'notStarted',
        name: 'New Hampshire SSP',
        fullName: 'New Hampshire State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'NM',
        status: 'complete',
        name: 'New Mexico SSI Supplement',
        fullName: 'New Mexico SSI State Supplement',
        variable: 'nm_ssi_state_supplement',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/nm/hca/ssi_supplement`,
          variables: `${GITHUB_BASE}/variables/gov/states/nm/hca/ssi_supplement`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/nm/hca/ssi_supplement`,
        }
      },
      {
        state: 'NC',
        status: 'notStarted',
        name: 'North Carolina SSP',
        fullName: 'North Carolina State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'OH',
        status: 'notStarted',
        name: 'Ohio SSP',
        fullName: 'Ohio State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'OK',
        status: 'notStarted',
        name: 'Oklahoma SSP',
        fullName: 'Oklahoma State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'OR',
        status: 'notStarted',
        name: 'Oregon SSP',
        fullName: 'Oregon State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'SC',
        status: 'complete',
        name: 'South Carolina SSI Supplement',
        fullName: 'South Carolina SSI State Supplement',
        variable: 'sc_ssi_state_supplement',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/sc/scdhhs/ssi_state_supplement`,
          variables: `${GITHUB_BASE}/variables/gov/states/sc/scdhhs/ssi_state_supplement`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/sc/scdhhs/ssi_state_supplement`,
        }
      },
      {
        state: 'SD',
        status: 'notStarted',
        name: 'South Dakota SSP',
        fullName: 'South Dakota State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'TX',
        status: 'complete',
        name: 'Texas SSI Supplement',
        fullName: 'Texas SSI State Supplement',
        variable: 'tx_ssi_state_supplement',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/tx/hhsc/ssi_state_supplement`,
          variables: `${GITHUB_BASE}/variables/gov/states/tx/hhsc/ssi_state_supplement`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/tx/hhsc/ssi_state_supplement`,
        }
      },
      {
        state: 'UT',
        status: 'notStarted',
        name: 'Utah SSP',
        fullName: 'Utah State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'VA',
        status: 'notStarted',
        name: 'Virginia SSP',
        fullName: 'Virginia State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'WA',
        status: 'complete',
        name: 'Washington SSP',
        fullName: 'Washington State Supplementary Payment',
        variable: 'wa_ssp_payment_category',
        githubLinks: {
          parameters: `${GITHUB_BASE}/parameters/gov/states/wa/dshs/ssp`,
          variables: `${GITHUB_BASE}/variables/gov/states/wa/dshs/ssp`,
          tests: `${TESTS_BASE}/policy/baseline/gov/states/wa/dshs/ssp`,
        }
      },
      {
        state: 'WI',
        status: 'notStarted',
        name: 'Wisconsin SSP',
        fullName: 'Wisconsin State Supplementary Payment',
        githubLinks: {}
      },
      {
        state: 'WY',
        status: 'notStarted',
        name: 'Wyoming SSP',
        fullName: 'Wyoming State Supplementary Payment',
        githubLinks: {}
      },
    ],
    githubLinks: {},
  },
  {
    id: 'social_security',
    name: 'Social Security',
    fullName: 'Social Security (Retirement, Disability, Survivors)',
    agency: 'SSA',
    status: 'complete',
    coverage: 'US',
    variable: 'social_security',
    notes: 'Includes retirement, disability (SSDI), survivors, and dependent benefits',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/ssa/ss`,
      variables: `${GITHUB_BASE}/variables/gov/ssa/ss`,
      tests: `${TESTS_BASE}/policy/baseline/gov/ssa/ss`,
    },
  },
  {
    id: 'medicare',
    name: 'Medicare',
    fullName: 'Medicare Parts A and B',
    agency: 'HHS',
    status: 'complete',
    coverage: 'US',
    variable: 'is_medicare_eligible',
    notes: 'Includes Part A (hospital) and Part B (medical) premiums with IRMAA adjustments',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/hhs/medicare`,
      variables: `${GITHUB_BASE}/variables/gov/hhs/medicare`,
      tests: `${TESTS_BASE}/policy/baseline/gov/hhs/medicare`,
    },
  },

  // HUD Programs
  {
    id: 'section_8',
    name: 'Section 8',
    fullName: 'Housing Choice Voucher Program',
    agency: 'HUD',
    status: 'inProgress',
    variable: 'hud_hap',
    notes: 'National rules; only have AMI for Los Angeles County and Colorado. Illinois, Massachusetts in progress',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/hud`,
      variables: `${GITHUB_BASE}/variables/gov/hud`,
      tests: `${TESTS_BASE}/policy/baseline/gov/hud`,
    },
  },

  // FCC Programs
  {
    id: 'lifeline',
    name: 'Lifeline',
    fullName: 'Lifeline Program',
    agency: 'FCC',
    status: 'complete',
    coverage: 'US',
    variable: 'lifeline',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/fcc/lifeline`,
      variables: `${GITHUB_BASE}/variables/gov/fcc/lifeline`,
      tests: `${TESTS_BASE}/policy/baseline/gov/fcc/lifeline`,
    },
  },
  {
    id: 'acp',
    name: 'Affordable Connectivity Program',
    fullName: 'Affordable Connectivity Program',
    agency: 'FCC',
    status: 'complete',
    coverage: 'US',
    variable: 'acp',
    notes: 'Provides discount on internet service for eligible households',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/fcc/acp`,
      variables: `${GITHUB_BASE}/variables/gov/fcc/acp`,
      tests: `${TESTS_BASE}/policy/baseline/gov/fcc/acp`,
    },
  },

  // ED Programs
  {
    id: 'pell_grant',
    name: 'Pell Grant',
    fullName: 'Federal Pell Grant',
    agency: 'ED',
    status: 'complete',
    coverage: 'US',
    variable: 'pell_grant',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/ed/pell_grant`,
      variables: `${GITHUB_BASE}/variables/gov/ed/pell_grant`,
      tests: `${TESTS_BASE}/policy/baseline/gov/ed/pell_grant`,
    },
  },

  // Federal Tax Credits
  {
    id: 'education_tax_credits',
    name: 'Education Tax Credits',
    fullName: 'Education Tax Credits (American Opportunity Credit, Lifetime Learning Credit)',
    category: 'Education',
    status: 'complete',
    coverage: 'US',
    variable: 'american_opportunity_credit',
    notes: 'Includes American Opportunity Credit and Lifetime Learning Credit',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/irs/credits/education`,
      variables: `${GITHUB_BASE}/variables/gov/irs/credits/education`,
      tests: `${TESTS_BASE}/policy/baseline/gov/irs/credits/education`,
    },
  },
  {
    id: 'clean_vehicle_credits',
    name: 'Clean Vehicle Credits',
    fullName: 'Clean Vehicle Tax Credits (New and Used)',
    category: 'Energy',
    status: 'complete',
    coverage: 'US',
    variable: 'clean_vehicle_credit',
    notes: 'Includes new clean vehicle credit and previously owned clean vehicle credit',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/irs/credits/clean_vehicle`,
      variables: `${GITHUB_BASE}/variables/gov/irs/credits/clean_vehicle`,
      tests: `${TESTS_BASE}/policy/baseline/gov/irs/credits/clean_vehicle`,
    },
  },
  {
    id: 'residential_clean_energy_credit',
    name: 'Residential Clean Energy Credit',
    fullName: 'Residential Clean Energy Credit',
    category: 'Energy',
    status: 'complete',
    coverage: 'US',
    variable: 'residential_clean_energy_credit',
    notes: 'Credit for solar, wind, geothermal, and fuel cell property',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/irs/credits/residential_clean_energy`,
      variables: `${GITHUB_BASE}/variables/gov/irs/credits/residential_clean_energy`,
      tests: `${TESTS_BASE}/policy/baseline/gov/irs/credits/residential_clean_energy`,
    },
  },

  // IRA Programs
  {
    id: 'ira_tax_credits',
    name: 'IRA Tax Credits',
    fullName: 'Inflation Reduction Act Tax Credits',
    category: 'Energy',
    status: 'complete',
    coverage: 'US',
    variable: 'energy_efficient_home_improvement_credit',
    notes: 'Energy Efficient Home Improvement Credit',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/irs/credits`,
      variables: `${GITHUB_BASE}/variables/gov/irs/credits`,
      tests: `${TESTS_BASE}/policy/baseline/gov/irs/credits`,
    },
  },
  {
    id: 'doe_high_efficiency_rebate',
    name: 'DOE High Efficiency Rebate',
    fullName: 'High Efficiency Electric Home Rebate (HOMES Rebate)',
    agency: 'DOE',
    category: 'Energy',
    status: 'complete',
    coverage: 'US',
    variable: 'high_efficiency_electric_home_rebate',
    notes: 'Rebates for heat pumps, water heaters, electric stoves, insulation, wiring, electrical panels',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/doe/high_efficiency_electric_home_rebate`,
      variables: `${GITHUB_BASE}/variables/gov/doe/high_efficiency_electric_home_rebate`,
      tests: `${TESTS_BASE}/policy/baseline/gov/doe/high_efficiency_electric_home_rebate`,
    },
  },
  {
    id: 'doe_efficiency_rebate',
    name: 'DOE Efficiency Rebate',
    fullName: 'Residential Efficiency and Electrification Rebate',
    agency: 'DOE',
    category: 'Energy',
    status: 'complete',
    coverage: 'US',
    variable: 'residential_efficiency_electrification_rebate',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/doe/residential_efficiency_electrification_rebate`,
      variables: `${GITHUB_BASE}/variables/gov/doe/residential_efficiency_electrification_rebate`,
      tests: `${TESTS_BASE}/policy/baseline/gov/doe/residential_efficiency_electrification_rebate`,
    },
  },

  // State Programs
  {
    id: 'co_oap',
    name: 'Colorado OAP',
    fullName: 'Colorado Old Age Pension',
    agency: 'State',
    status: 'complete',
    coverage: 'CO',
    variable: 'co_oap',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/co/ssa/oap`,
      variables: `${GITHUB_BASE}/variables/gov/states/co/ssa/oap`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/co/ssa/oap`,
    },
  },
  {
    id: 'co_chp',
    name: 'Colorado CHP',
    fullName: 'Colorado Child Health Plan Plus',
    agency: 'State',
    status: 'complete',
    coverage: 'CO',
    variable: 'co_chp',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/co/hcpf/chp`,
      variables: `${GITHUB_BASE}/variables/gov/states/co/hcpf/chp`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/co/hcpf/chp`,
    },
  },
  {
    id: 'dc_power',
    name: 'DC Power',
    fullName: 'DC Program on Work, Employment, and Responsibility',
    agency: 'State',
    status: 'complete',
    coverage: 'DC',
    variable: 'dc_power',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/dc/dhc/power`,
      variables: `${GITHUB_BASE}/variables/gov/states/dc/dhc/power`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/dc/dhc/power`,
    },
  },
  {
    id: 'dc_gac',
    name: 'DC GAC',
    fullName: 'DC General Assistance for Children',
    agency: 'State',
    status: 'complete',
    coverage: 'DC',
    variable: 'dc_gac',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/dc/dhc/gac`,
      variables: `${GITHUB_BASE}/variables/gov/states/dc/dhc/gac`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/dc/dhc/gac`,
    },
  },
  {
    id: 'ca_cvrp',
    name: 'California CVRP',
    fullName: 'California Clean Vehicle Rebate Project',
    agency: 'State',
    status: 'complete',
    coverage: 'CA',
    variable: 'ca_cvrp',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/ca/calepa/carb/cvrp`,
      variables: `${GITHUB_BASE}/variables/gov/states/ca/calepa/carb/cvrp`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/ca/calepa/carb/cvrp`,
    },
  },
  {
    id: 'ca_capi',
    name: 'California CAPI',
    fullName: 'California Cash Assistance Program for Immigrants',
    agency: 'State',
    status: 'complete',
    coverage: 'CA',
    variable: 'ca_capi',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/ca/cdss/capi`,
      variables: `${GITHUB_BASE}/variables/gov/states/ca/cdss/capi`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/ca/cdss/capi`,
    },
  },
  {
    id: 'care',
    name: 'California CARE',
    fullName: 'California Alternate Rates for Energy',
    agency: 'State',
    status: 'complete',
    coverage: 'CA',
    variable: 'ca_care',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/ca/cpuc/care`,
      variables: `${GITHUB_BASE}/variables/gov/states/ca/cpuc/care`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/ca/cpuc/care`,
    },
  },
  {
    id: 'fera',
    name: 'California FERA',
    fullName: 'Family Electric Rate Assistance Program',
    agency: 'State',
    status: 'complete',
    coverage: 'CA',
    variable: 'ca_fera',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/ca/cpuc/fera`,
      variables: `${GITHUB_BASE}/variables/gov/states/ca/cpuc/fera`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/ca/cpuc/fera`,
    },
  },
  {
    id: 'il_fpp',
    name: 'Illinois Family Planning Program',
    fullName: 'Illinois HFS Family Planning Program',
    agency: 'State',
    status: 'complete',
    coverage: 'IL',
    variable: 'il_fpp_eligible',
    notes: 'Only includes eligibility rules',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/il/hfs/fpp`,
      variables: `${GITHUB_BASE}/variables/gov/states/il/hfs/fpp`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/il/hfs/fpp`,
    },
  },
  {
    id: 'il_ibccp',
    name: 'Illinois IBCCP',
    fullName: 'Illinois Health Benefits for Persons with Breast or Cervical Cancer',
    agency: 'State',
    status: 'complete',
    coverage: 'IL',
    variable: 'il_bcc_eligible',
    notes: 'Only includes eligibility rules',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/il/hfs/bcc`,
      variables: `${GITHUB_BASE}/variables/gov/states/il/hfs/bcc`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/il/hfs/bcc`,
    },
  },
  {
    id: 'il_hbwd',
    name: 'Illinois HBWD',
    fullName: 'Illinois Health Benefits for Workers with Disabilities',
    agency: 'State',
    status: 'complete',
    coverage: 'IL',
    variable: 'il_hbwd',
    notes: 'Medicaid buy-in program for workers with disabilities',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/il/hfs/hbwd`,
      variables: `${GITHUB_BASE}/variables/gov/states/il/hfs/hbwd`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/il/hfs/hbwd`,
    },
  },
  {
    id: 'il_ihwap',
    name: 'Illinois IHWAP',
    fullName: 'Illinois Home Weatherization Assistance Program',
    agency: 'State',
    status: 'complete',
    coverage: 'IL',
    variable: 'il_ihwap_eligible',
    notes: 'Only includes eligibility rules',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/il/dceo/ihwap`,
      variables: `${GITHUB_BASE}/variables/gov/states/il/dceo/ihwap`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/il/dceo/ihwap`,
    },
  },
  {
    id: 'il_scretd',
    name: 'Illinois SCRETD',
    fullName: 'Illinois Senior Citizens Real Estate Tax Deferral Program',
    agency: 'State',
    status: 'complete',
    coverage: 'IL',
    variable: 'il_scretd_deferral_amount',
    notes: 'Deferral amount is a loan, not a benefit',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/il/idor/scretd`,
      variables: `${GITHUB_BASE}/variables/gov/states/il/idor/scretd`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/il/idor/scretd`,
    },
  },
  {
    id: 'il_ipass_assist',
    name: 'Illinois I-PASS Assist',
    fullName: 'Illinois Tollway I-PASS Assist Program',
    agency: 'State',
    status: 'complete',
    coverage: 'IL',
    variable: 'il_ipass_assist_eligible',
    notes: 'Only includes eligibility rules',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/il/tollway/ipass_assist`,
      variables: `${GITHUB_BASE}/variables/gov/states/il/tollway/ipass_assist`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/il/tollway/ipass_assist`,
    },
  },
  {
    id: 'il_bap',
    name: 'Illinois BAP',
    fullName: 'Illinois Chicago Department of Aging Benefit Access Program',
    agency: 'Local',
    status: 'complete',
    coverage: 'Chicago',
    variable: 'il_bap_eligible',
    notes: 'Only includes eligibility rules',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/il/idoa/bap`,
      variables: `${GITHUB_BASE}/variables/gov/states/il/idoa/bap`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/il/idoa/bap`,
    },
  },
  {
    id: 'il_cta_benefit',
    name: 'Illinois CTA Benefit',
    fullName: 'Illinois Chicago Transit Authority Benefit',
    agency: 'Local',
    status: 'complete',
    coverage: 'Chicago',
    variable: 'il_cta_benefit',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/il/rta/cta`,
      variables: `${GITHUB_BASE}/variables/gov/states/il/rta/cta`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/il/rta/cta`,
    },
  },
  {
    id: 'mbta_reduced_fare',
    name: 'MBTA Reduced Fare',
    fullName: 'Massachusetts Bay Transportation Authority Reduced Fare Program',
    agency: 'State',
    status: 'complete',
    notes: 'Includes eligiblity rules for the Reduced Fares, Tap Charlie Card, and Senior Charlie Card Program',
    coverage: 'MA',
    variable: 'ma_mbta_income_eligible_reduced_fare_eligible',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/ma/dot/mbta`,
      variables: `${GITHUB_BASE}/variables/gov/states/ma/dot/mbta`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/ma/dot/mbta`,
    },
  },
  {
    id: 'ma_eaedc',
    name: 'Massachusetts EAEDC',
    fullName: 'Emergency Aid to the Elderly, Disabled, and Children',
    agency: 'State',
    status: 'complete',
    coverage: 'MA',
    variable: 'ma_eaedc',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/ma/dta/tcap/eaedc`,
      variables: `${GITHUB_BASE}/variables/gov/states/ma/dta/tcap/eaedc`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/ma/dta/tcap/eaedc`,
    },
  },
  {
    id: 'ny_drive_clean_rebate',
    name: 'NY Drive Clean Rebate',
    fullName: '',
    agency: 'State',
    status: 'complete',
    coverage: 'NY',
    variable: 'ny_drive_clean_rebate',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/ny/nyserda/drive_clean`,
      variables: `${GITHUB_BASE}/variables/gov/states/ny/nyserda/drive_clean`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/ny/nyserda/drive_clean`,
    },
  },
  {
    id: 'tx_fpp_benefit',
    name: 'Texas FPP',
    fullName: 'Texas Family Planning Program',
    agency: 'State',
    status: 'complete',
    coverage: 'TX',
    variable: 'tx_fpp_benefit',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/tx/fpp`,
      variables: `${GITHUB_BASE}/variables/gov/states/tx/fpp`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/tx/fpp`,
    },
  },
  {
    id: 'tx_dart_benefit',
    name: 'Texas DART',
    fullName: 'Texas Dallas Area Rapid Transit Benefit',
    agency: 'Local',
    status: 'complete',
    coverage: 'Dallas County, TX',
    variable: 'tx_dart_benefit_person',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/states/tx/dart`,
      variables: `${GITHUB_BASE}/variables/gov/states/tx/dart`,
      tests: `${TESTS_BASE}/policy/baseline/gov/states/tx/dart`,
    },
  },
  {
    id: 'tx_harris_rides_subsidy',
    name: 'Harris County Rides Subsidy',
    fullName: 'Harris County Transportation Subsidy',
    agency: 'Local',
    status: 'complete',
    coverage: 'Harris County, TX',
    variable: 'tx_harris_rides_subsidy',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/tx/harris/rides`,
      variables: `${GITHUB_BASE}/variables/gov/local/tx/harris/rides`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/tx/harris/rides`,
    },
  },

  // Local Programs
  {
    id: 'ez_save',
    name: 'Los Angeles County EZ Save',
    fullName: '',
    agency: 'Local',
    status: 'complete',
    coverage: 'Los Angeles County',
    variable: 'ca_la_ez_save',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/la/dwp/ez_save`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/la/dwp/ez_save`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/la/dwp/ez_save`,
    },
  },
  {
    id: 'la_infant_supplement',
    name: 'Los Angeles County Infant Supplement',
    fullName: '',
    agency: 'Local',
    status: 'complete',
    coverage: 'Los Angeles County',
    variable: 'ca_la_infant_supplement',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/la/dss/infant_supplement`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/la/dss/infant_supplement`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/la/dss/infant_supplement`,
    },
  },
  {
    id: 'la_expectant_parent',
    name: 'Los Angeles County expectant parent payment',
    fullName: '',
    agency: 'Local',
    status: 'complete',
    coverage: 'Los Angeles County',
    variable: 'ca_la_expectant_parent_payment',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/la/dss/expectant_parent`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/la/dss/expectant_parent`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/la/dss/expectant_parent`,
    },
  },
  {
    id: 'la_general_relief',
    name: 'Los Angeles County General Relief',
    fullName: '',
    agency: 'Local',
    status: 'complete',
    coverage: 'Los Angeles County',
    variable: 'la_general_relief',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/la/general_relief`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/la/general_relief`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/la/general_relief`,
    },
  },
  {
    id: 'ca_riv_general_relief',
    name: 'Riverside County General Relief',
    fullName: '',
    agency: 'Local',
    status: 'complete',
    coverage: 'Riverside County',
    variable: 'ca_riv_general_relief',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/riv/general_relief`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/riv/general_relief`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/riv/general_relief`,
    },
  },
  {
    id: 'ca_riv_liheap',
    name: 'Riverside County LIHEAP',
    fullName: '',
    agency: 'Local',
    status: 'complete',
    coverage: 'Riverside County',
    notes: 'Only includes eligibility rules',
    variable: 'ca_riv_liheap_eligible',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/riv/liheap`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/riv/liheap`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/riv/liheap`,
    },
  },
  {
    id: 'share',
    name: 'Riverside County SHARE',
    fullName: 'Riverside County Sharing Households Assist Riverside Energy program',
    agency: 'Local',
    status: 'complete',
    coverage: 'Riverside County',
    variable: 'ca_riv_share_payment',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/riv/share`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/riv/share`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/riv/share`,
    },
  },
  {
    id: 'ca_ala_general_assistance',
    name: 'Alameda County General Assistance',
    fullName: '',
    agency: 'Local',
    status: 'complete',
    coverage: 'Alameda County',
    variable: 'ca_ala_general_assistance',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/ala/ga`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/ala/ga`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/ala/ga`,
    },
  },
  {
    id: 'nyc_income_tax',
    name: 'NYC Income Tax',
    fullName: 'New York City Income Tax',
    agency: 'Local',
    status: 'complete',
    coverage: 'New York City',
    variable: 'nyc_income_tax',
    notes: 'Local income tax for NYC residents',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ny/nyc/tax/income`,
      variables: `${GITHUB_BASE}/variables/gov/local/ny/nyc/tax/income`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ny/nyc/tax/income`,
    },
  },
  {
    id: 'sf_wftc',
    name: 'San Francisco WFTC',
    fullName: 'San Francisco Working Families Tax Credit',
    agency: 'Local',
    status: 'complete',
    coverage: 'San Francisco',
    variable: 'sf_wftc',
    notes: 'Local supplement to state and federal EITC',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/ca/sf/wftc`,
      variables: `${GITHUB_BASE}/variables/gov/local/ca/sf/wftc`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/ca/sf/wftc`,
    },
  },
  {
    id: 'montgomery_county_eitc',
    name: 'Montgomery County EITC',
    fullName: 'Montgomery County Earned Income Tax Credit',
    agency: 'Local',
    status: 'complete',
    coverage: 'Montgomery County, MD',
    variable: 'md_montgomery_eitc_refundable',
    notes: 'Refundable local EITC supplement',
    githubLinks: {
      parameters: `${GITHUB_BASE}/parameters/gov/local/md/montgomery/tax/income/credits/eitc/refundable`,
      variables: `${GITHUB_BASE}/variables/gov/local/md/montgomery/tax/income/credits/eitc/refundable`,
      tests: `${TESTS_BASE}/policy/baseline/gov/local/md/montgomery/tax/income/credits/eitc/refundable`,
    },
  },

  // Other Programs
  {
    id: 'chapter_7_bankruptcy',
    name: 'Chapter 7 Bankruptcy',
    fullName: '',
    category: 'Legal',
    status: 'inProgress',
    coverage: 'US',
    githubLinks: {},
  },
];

export const getStatusCount = () => {
  const counts = {
    complete: 0,
    partial: 0,
    inProgress: 0,
    notStarted: 0,
  };

  programs.forEach((program) => {
    // State and local programs count by their status
    if (program.agency === 'State' || program.agency === 'Local') {
      counts[program.status]++;
      return;
    }

    // Federal programs: analyze based on jurisdiction coverage
    if (program.id === 'tanf') {
      // TANF counts as 1 partial coverage program (mix of implemented/missing states)
      counts.partial++;
    } else if (program.stateImplementations && program.stateImplementations.length > 0) {
      // Federal program with state implementations
      const statuses = new Set<string>();
      program.stateImplementations.forEach((impl) => {
        statuses.add(impl.status);
      });

      // Determine overall status based on mix
      if (statuses.has('inProgress')) {
        counts.inProgress++;
      } else if (statuses.has('partial')) {
        counts.partial++;
      } else if (statuses.has('complete')) {
        counts.complete++;
      } else if (statuses.has('notStarted')) {
        counts.notStarted++;
      }
    } else {
      // Simple federal program (no state variation) or programs with uniform status
      // These only have checkmark in federal column or all states
      counts[program.status]++;
    }
  });

  return counts;
};