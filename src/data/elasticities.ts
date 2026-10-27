export interface SubstitutionElasticity {
  decile: string;
  lower: number;
  central: number;
  higher: number;
}

export interface ElasticityDefaults {
  incomeElasticity: { lower: number; central: number; higher: number };
  substitutionElasticities: SubstitutionElasticity[];
  capitalGainsPersistent: number;
  capitalGainsTransitory: number;
}

export const cboDefaults: ElasticityDefaults = {
  incomeElasticity: { lower: -0.10, central: -0.05, higher: 0.00 },
  substitutionElasticities: [
    { decile: '0-10%', lower: 0.15, central: 0.31, higher: 0.47 },
    { decile: '10-20%', lower: 0.15, central: 0.28, higher: 0.42 },
    { decile: '20-30%', lower: 0.15, central: 0.28, higher: 0.42 },
    { decile: '30-40%', lower: 0.15, central: 0.27, higher: 0.38 },
    { decile: '40-50%', lower: 0.15, central: 0.27, higher: 0.38 },
    { decile: '50-60%', lower: 0.15, central: 0.25, higher: 0.35 },
    { decile: '60-70%', lower: 0.15, central: 0.25, higher: 0.35 },
    { decile: '70-80%', lower: 0.15, central: 0.22, higher: 0.29 },
    { decile: '80-90%', lower: 0.15, central: 0.22, higher: 0.29 },
    { decile: '90-100%', lower: 0.15, central: 0.22, higher: 0.29 },
  ],
  capitalGainsPersistent: -0.79,
  capitalGainsTransitory: -1.20,
};

// UK capital gains realisation response (policyengine-uk
// gov.simulation.capital_gains_responses): realised gains scale by
// ((1 - t1) / (1 - t0)) ^ elasticity. The central value and the sensitivities
// are Advani, Lonsdale and Summers's; the separate Business Asset Disposal
// Relief value is the OBR's, used only when switched on.
export const ukCapitalGains = {
  retentionElasticity: 1.0,
  sensitivities: [0.5, 2.0],
  separateBadrElasticity: 1.4,
};

export const BLOG_URL = 'https://policyengine.org/us/research/us-behavioral-responses';

export const sources = {
  laborSupply: 'CBO, "How the Supply of Labor Responds to Changes in Fiscal Policy" (2012)',
  elasticityReview: 'CBO, "A Review of Recent Research on Labor Supply Elasticities" (Working Paper 2012-12)',
  capitalGains: 'CBO, "New Evidence on the Tax Elasticity of Capital Gains" (Working Paper 2012-09)',
  ukCapitalGains: 'Advani, Lonsdale and Summers (2024), "Reforming Capital Gains Tax", CenTax, pages 36-37',
};

export const UK_CAPITAL_GAINS_SOURCE_URL =
  'https://centax.org.uk/wp-content/uploads/2024/10/AdvaniLonsdaleSummers2024_CGTReform.pdf';
