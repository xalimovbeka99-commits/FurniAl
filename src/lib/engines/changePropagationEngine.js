/**
 * ChangePropagationEngine — applies a parameter mutation to an assembly,
 * recalculates it, and produces a human-readable trace of what happened.
 *
 * v0 is intentionally simple (see ParametricEngine): propagation IS
 * "recalculate every panel." The "graph" here is just the fixed, documented
 * fact that every BASE_CABINET panel depends on dimensions+construction+
 * shelves — recorded as a trace string, not a real dependency graph yet.
 */
import { recalculateAssembly } from "./parametricEngine.js";

const AFFECTED_BY_DIMENSION_CHANGE = ["bottom", "top", "back", "side_left", "side_right", "shelves"];

/**
 * @param {object} assembly current assembly
 * @param {object} patch partial updates to dimensions/construction/materialId
 * @returns {{ assembly: object, trace: string[] }}
 */
export function propagateParameterChange(assembly, patch) {
  const before = assembly.dimensions;
  const nextAssembly = {
    ...assembly,
    dimensions: { ...assembly.dimensions, ...(patch.dimensions || {}) },
    construction: { ...assembly.construction, ...(patch.construction || {}) },
    materialId: patch.materialId || assembly.materialId,
  };

  const trace = [];
  const dimsChanged = Object.entries(patch.dimensions || {}).filter(
    ([axis, v]) => v !== undefined && v !== before[axis]
  );
  for (const [axis, v] of dimsChanged) {
    trace.push(`${axis}: ${before[axis]}mm -> ${v}mm`);
  }
  if (dimsChanged.length) {
    trace.push(`invalidated: innerWidth/innerHeight`);
    trace.push(`recalculated: ${AFFECTED_BY_DIMENSION_CHANGE.join(", ")}`);
  }
  if (patch.materialId && patch.materialId !== assembly.materialId) {
    trace.push(`materialId: ${assembly.materialId} -> ${patch.materialId}`);
    trace.push(`recalculated: all panel materialId defaults`);
  }

  const recalculated = recalculateAssembly(nextAssembly);
  trace.push(`3D updated: ${recalculated.parts.length} panels`);
  trace.push(`cut list + validation invalidated (recompute on next read)`);

  return { assembly: recalculated, trace };
}

/**
 * Add/remove a shelf feature, then recalculate. Same propagation shape as
 * a dimension change, scoped to the shelf list.
 */
export function propagateShelfChange(assembly, mutateShelves) {
  const before = assembly.shelves.length;
  const shelves = mutateShelves([...assembly.shelves]);
  const nextAssembly = { ...assembly, shelves };
  const trace = [
    `shelves: ${before} -> ${shelves.length}`,
    `recalculated: shelf panels + shelf-pin machining on side_left/side_right`,
  ];
  const recalculated = recalculateAssembly(nextAssembly);
  trace.push(`3D updated: ${recalculated.parts.length} panels`);
  trace.push(`cut list + validation invalidated (recompute on next read)`);
  return { assembly: recalculated, trace };
}
