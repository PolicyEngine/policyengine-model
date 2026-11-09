export type CoverageStatus = 'complete' | 'partial' | 'inProgress' | 'notStarted';
export type Agency = 'USDA' | 'HHS' | 'SSA' | 'IRS' | 'HUD' | 'DOE' | 'ED' | 'DOL' | 'FCC' | 'ACA' | 'State' | 'Local';

export interface StateImplementation {
  state: string;
  status: CoverageStatus;
  notes?: string;
  name?: string; // State-specific program name
  fullName?: string; // State-specific full name
  variable?: string; // Variable name for flowchart visualization
  githubLinks?: {
    parameters?: string;
    variables?: string;
    tests?: string;
  };
}

export interface Program {
  id: string;
  name: string;
  fullName: string;
  agency?: Agency;
  category?: string;
  status: CoverageStatus;
  coverage?: string;
  hasFederalRules?: boolean;
  description?: string;
  stateImplementations?: StateImplementation[];
  hasStateVariation?: boolean; // Indicates program has full state-by-state variation
  variable?: string; // Variable name for flowchart visualization
  parameterPrefix?: string; // Registry parameter_prefix, e.g. gov.hmrc.income_tax
  githubLinks: {
    parameters?: string;
    variables?: string;
    tests?: string;
  };
  notes?: string;
  registryNotes?: string; // Registry notes as written, without the years `notes` appends
  verifiedYears?: string;
  lastUpdated?: string;
}