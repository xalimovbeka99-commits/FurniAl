/**
 * ValidationEngine + ConstraintEngine (merged for v0 — split them apart if
 * a second assembly type needs materially different constraint logic).
 *
 * Returns structured violations (vision Section 17) AND a level-by-level
 * status (Section 18). Levels this repo has NOT implemented are reported as
 * NOT_VERIFIED, never as VALID — no fake production readiness.
 */

import { worldExtentsMm } from "../ir/furnitureIR.js";

const LEVELS = ["SCHEMA", "PARAMETRIC", "GEOMETRIC", "CONSTRUCTION", "PRODUCTION", "MACHINE"];

function violation(constraint, severity, entityId, message) {
  return { constraint, severity, entityId, message };
}

function checkPositiveDimensions(assembly) {
  const v = [];
  for (const [axis, val] of Object.entries(assembly.dimensions)) {
    if (!(Number.isFinite(val) && val > 0)) {
      v.push(violation("POSITIVE_DIMENSION", "ERROR", assembly.id, `dimensions.${axis} must be a positive number, got ${val}`));
    }
  }
  return v;
}

function checkValidThickness(assembly) {
  const v = [];
  const { boardThickness, backThickness } = assembly.construction;
  if (!(boardThickness >= 6 && boardThickness <= 50)) {
    v.push(violation("VALID_THICKNESS", "ERROR", assembly.id, `boardThickness ${boardThickness}mm outside manufacturable range 6-50mm`));
  }
  if (!(backThickness >= 2 && backThickness <= 12)) {
    v.push(violation("VALID_THICKNESS", "WARNING", assembly.id, `backThickness ${backThickness}mm outside typical range 2-12mm`));
  }
  return v;
}

function checkNoNaNGeometry(assembly) {
  const v = [];
  for (const part of assembly.parts) {
    const { width, height, thickness } = part.dimensions;
    if (![width, height, thickness].every(Number.isFinite)) {
      v.push(violation("NO_INVALID_NAN_GEOMETRY", "ERROR", part.id, `part has non-finite dimensions`));
    }
    if (part.warnings?.length) {
      for (const w of part.warnings) {
        v.push(violation("MIN_PANEL_DIMENSION", "WARNING", part.id, w));
      }
    }
  }
  return v;
}

function checkAssemblyBounds(assembly) {
  const v = [];
  const { width: W, height: H, depth: D } = assembly.dimensions;
  for (const part of assembly.parts) {
    const { x, y, z } = part.transform.position;
    const [extentX, extentY, extentZ] = worldExtentsMm(part);
    if (Math.abs(x) + extentX / 2 > W / 2 + 1) {
      v.push(violation("ASSEMBLY_BOUNDS", "ERROR", part.id, `part extends outside assembly width bounds`));
    }
    if (y - extentY / 2 < -1 || y + extentY / 2 > H + 1) {
      v.push(violation("ASSEMBLY_BOUNDS", "ERROR", part.id, `part extends outside assembly height bounds`));
    }
    if (Math.abs(z) + extentZ / 2 > D / 2 + 5) {
      v.push(violation("ASSEMBLY_BOUNDS", "WARNING", part.id, `part is near/outside assembly depth bounds`));
    }
  }
  return v;
}

function checkShelvesInsideCabinet(assembly) {
  const v = [];
  assembly.shelves.forEach((shelf, i) => {
    if (!(shelf.positionRatio >= 0 && shelf.positionRatio <= 1)) {
      v.push(violation("SHELF_INSIDE_CABINET", "ERROR", `shelf_${i + 1}`, `positionRatio ${shelf.positionRatio} outside 0-1`));
    }
  });
  return v;
}

/**
 * @returns {{ violations: object[], levels: Record<string,string>, ok: boolean }}
 */
export function validateAssembly(assembly) {
  const violations = [
    ...checkPositiveDimensions(assembly),
    ...checkValidThickness(assembly),
    ...checkShelvesInsideCabinet(assembly),
    ...checkNoNaNGeometry(assembly),
    ...checkAssemblyBounds(assembly),
  ];

  const hasError = (level) => violations.some((v) => v.severity === "ERROR" && levelOf(v.constraint) === level);

  const levels = {
    SCHEMA: assembly.entityType === "ASSEMBLY" && assembly.assemblyType ? "VALID" : "ERROR",
    PARAMETRIC: hasError("PARAMETRIC") ? "ERROR" : "VALID",
    GEOMETRIC: hasError("GEOMETRIC") ? "ERROR" : violations.some((v) => v.constraint === "NO_INVALID_NAN_GEOMETRY") ? "ERROR" : "VALID",
    // Real construction rules (clearances, span limits, hinge/fastener edge
    // distance) are not implemented yet — reporting EXPERIMENTAL is honest;
    // reporting VALID would be a fabricated readiness claim (vision Section 18).
    CONSTRUCTION: "EXPERIMENTAL",
    PRODUCTION: "EXPERIMENTAL",
    MACHINE: "NOT_VERIFIED",
  };

  const ok = !violations.some((v) => v.severity === "ERROR");
  return { violations, levels, ok };
}

function levelOf(constraint) {
  if (["POSITIVE_DIMENSION", "VALID_THICKNESS", "SHELF_INSIDE_CABINET"].includes(constraint)) return "PARAMETRIC";
  if (["NO_INVALID_NAN_GEOMETRY", "ASSEMBLY_BOUNDS", "MIN_PANEL_DIMENSION"].includes(constraint)) return "GEOMETRIC";
  return "UNKNOWN";
}

export { LEVELS };
