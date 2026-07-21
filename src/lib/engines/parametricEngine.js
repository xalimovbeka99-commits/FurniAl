/**
 * ParametricEngine — recalculates an assembly's parts[] from its high-level
 * parameters. v0 strategy: full rebuild on every change (deliberately, per
 * the vision doc's Section 12: "do not over-engineer a distributed reactive
 * graph system" for the first slice). Part IDs are role-derived (see
 * furnitureIR.partId), so a full rebuild still keeps the same id for "the
 * left side panel" across a resize — selection survives recalculation even
 * without a dependency graph.
 */
import { buildBaseCabinetParts } from "../rules/baseCabinetRules.js";

const RULE_SETS = {
  BASE_CABINET: buildBaseCabinetParts,
};

export function recalculateAssembly(assembly) {
  const ruleSet = RULE_SETS[assembly.assemblyType];
  if (!ruleSet) {
    throw new Error(`ParametricEngine: no rule set registered for assemblyType "${assembly.assemblyType}"`);
  }
  const parts = ruleSet(assembly);
  return {
    ...assembly,
    parts,
    parameters: {
      ...assembly.dimensions,
      ...assembly.construction,
    },
    updatedAt: new Date().toISOString(),
  };
}
