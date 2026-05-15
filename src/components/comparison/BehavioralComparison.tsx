import 'server-only';
import {
  behavioralParametersByDomain,
  ELASTICITY_KINDS,
} from '../../data/comparisons';
import { BehavioralDomainBlock } from './BehavioralDomainBlock';
import { h2Style, proseStyle, sectionStyle } from './comparisonStyles';
import type { ComparisonData } from '../../types/comparison';

/**
 * Compare-mode body for `/behavioral`. Renders the same two sub-sections
 * as MethodsView's behavioral blocks — Elasticities and Other behavioral
 * assumptions — but scoped to the active model set (host PE + selected
 * peers). The column shape is shared with Methods via `BehavioralDomainBlock`.
 *
 * `data` should already be filtered so `data.models` is the active set in
 * host-first order; `activeModelIds` is the same set as a fast lookup for
 * filtering the behavioral rows.
 */
export default function BehavioralComparison({
  data,
  activeModelIds,
}: {
  data: ComparisonData;
  activeModelIds: string[];
}) {
  const activeSet = new Set(activeModelIds);
  const scopedData: ComparisonData = {
    ...data,
    behavioralParameters: data.behavioralParameters.filter((row) =>
      activeSet.has(row.model),
    ),
  };
  const elasticityGroups = behavioralParametersByDomain(scopedData, (r) =>
    ELASTICITY_KINDS.has(r.kind),
  );
  const otherGroups = behavioralParametersByDomain(
    scopedData,
    (r) => !ELASTICITY_KINDS.has(r.kind),
  );

  return (
    <>
      {elasticityGroups.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Elasticities</h2>
          <p style={proseStyle}>
            Numeric response parameters — elasticities, semi-elasticities,
            and participation elasticities — grouped by behavioral domain.
            Each row is a scalar value (or a published range) with its
            population, margin, and citation, so values are directly
            comparable across models.
          </p>
          <BehavioralDomainBlock data={scopedData} groups={elasticityGroups} />
        </section>
      )}

      {otherGroups.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>Other behavioral assumptions</h2>
          <p style={proseStyle}>
            Non-scalar behavioral mechanics: choice and take-up models,
            tax-incidence assumptions, functional forms, calibration targets,
            and explicit not-modeled / undisclosed cases. These describe model
            structure rather than a single coefficient.
          </p>
          <BehavioralDomainBlock data={scopedData} groups={otherGroups} />
        </section>
      )}
    </>
  );
}
