export interface ElasticityParam {
  parameter: string;
  value: number;
  description: string;
  source: string;
}

export const elasticityParams: ElasticityParam[] = [
  {
    parameter: 'Substitution elasticity of labor income',
    value: 0.25,
    description: 'How much labor income changes in response to a 1% change in the net-of-tax rate, holding utility constant.',
    source: 'Saez, Slemrod, and Giertz (2012)',
  },
  {
    parameter: 'Income elasticity of labor income',
    value: -0.05,
    description: 'How much labor income changes in response to a 1% increase in after-tax income, holding the net-of-tax rate constant.',
    source: 'CBO (2021)',
  },
  {
    parameter: 'Substitution elasticity of capital gains',
    value: 0.5,
    description: 'How much realized capital gains change in response to tax rate changes. Captures both real and timing responses.',
    source: 'CBO (2021)',
  },
  {
    parameter: 'Income elasticity of capital gains',
    value: 0.0,
    description: 'Income effect on capital gains realization. Typically assumed to be zero as gains are discretionary.',
    source: 'CBO (2021)',
  },
];
