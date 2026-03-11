export interface Variable {
  name: string;
  label: string;
  documentation: string | null;
  entity: string;
  valueType: 'float' | 'int' | 'bool' | 'Enum' | 'str';
  definitionPeriod: string;
  unit: string | null;
  moduleName: string | null;
  indexInModule: number;
  isInputVariable: boolean;
  defaultValue: number | string | boolean | null;
  adds: string[] | null;
  subtracts: string[] | null;
  hidden_input: boolean;
  category: string | null;
  possibleValues?: Array<{ value: string; label: string }>;
}

export interface ParameterLeaf {
  type: 'parameter';
  parameter: string;
  description: string | null;
  label: string;
  unit: string | null;
  period: string | null;
  values: Record<string, number | string | boolean>;
}

export interface ParameterNode {
  type: 'parameterNode';
  parameter: string;
  description: string | null;
  label: string;
}

export type Parameter = ParameterLeaf | ParameterNode;

export interface Metadata {
  variables: Record<string, Variable>;
  parameters: Record<string, Parameter>;
}
