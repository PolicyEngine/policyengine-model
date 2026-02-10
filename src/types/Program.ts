export type CoverageStatus = 'complete' | 'partial' | 'inProgress' | 'notStarted';

export interface Program {
  id: string;
  name: string;
  fullName: string;
  agency?: string;
  category?: string;
  status: CoverageStatus;
  coverage?: string;
  hasStateVariation?: boolean;
  stateImplementations?: {
    state: string;
    status: CoverageStatus;
    name?: string;
  }[];
  variable?: string;
  notes?: string;
}
