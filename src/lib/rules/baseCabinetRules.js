/**
 * BaseCabinetRuleSet — deterministic construction knowledge for BASE_CABINET
 * assemblies. Pure functions: (assembly) -> parts[]. No AI, no Three.js.
 *
 * Formulas documented in docs/furniture-knowledge/base-cabinet-rules.md —
 * keep that file in sync if you change the maths here.
 *
 * Coordinate frame (mm): X centred on cabinet width, Y=0 at the floor,
 * Z centred on cabinet depth (front is +Z). Same convention as the existing
 * src/lib/buildGeometry.js, just in millimetres instead of metres.
 */
import { partId } from "../ir/furnitureIR.js";

const MIN_PANEL_MM = 40; // below this a panel is not a real manufacturable part

/** Edge banding assignment per panel role — mirrors src/lib/production.js's finishFor(). */
function edgesFor(role) {
  switch (role) {
    case "side_left":
    case "side_right":
      return [{ side: "FRONT", materialId: "ABS_WHITE_2MM", thicknessMm: 2 }];
    case "top":
    case "bottom":
      return [{ side: "FRONT", materialId: "ABS_WHITE_2MM", thicknessMm: 2 }];
    case "back":
      return [];
    default:
      if (role.startsWith("shelf"))
        return [{ side: "FRONT", materialId: "ABS_WHITE_1MM", thicknessMm: 1 }];
      return [];
  }
}

/** Shelf-pin machining for the two side panels supporting a shelf at height y. */
function shelfPinHoles(assemblyId, shelfY, depthMm) {
  const drillDepthMm = 12;
  const setbackMm = 37; // typical 32mm-system front pin setback from the panel's front edge
  return ["side_left", "side_right"].map((sideRole) => ({
    type: "SHELF_PIN_HOLE",
    onPart: partId(assemblyId, sideRole),
    face: "INNER",
    x: depthMm / 2 - setbackMm, // local to the panel: distance from its front edge
    y: shelfY,
    diameter: 5,
    depth: drillDepthMm,
  }));
}

/**
 * Build the full parts[] for a BASE_CABINET assembly from its high-level
 * parameters (dimensions/construction/shelves). ALWAYS regenerates every
 * panel from scratch — this is the "full rebuild" propagation strategy the
 * vision doc explicitly sanctions for v0 (no dependency graph yet).
 */
export function buildBaseCabinetParts(assembly) {
  const { width: W, height: H, depth: D } = assembly.dimensions;
  const { boardThickness: T, backThickness: BT } = assembly.construction;
  const mat = assembly.materialId;
  const id = assembly.id;

  if (![W, H, D, T, BT].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("buildBaseCabinetParts: all dimensions must be positive finite numbers");
  }

  const parts = [];
  const push = (role, name, dims, position, extra = {}) => {
    parts.push({
      id: partId(id, role),
      entityType: "PANEL",
      name,
      role,
      dimensions: dims, // { width, height, thickness } — panel-local face size + board thickness
      transform: { position, rotation: { x: 0, y: 0, z: 0 } },
      materialId: extra.materialId || mat,
      grainDirection: extra.grainDirection || "HEIGHT",
      edges: edgesFor(role),
      machining: extra.machining || [],
      parameters: {},
      dependencies: [],
    });
  };

  const innerW = W - 2 * T;
  const innerH = H - 2 * T;

  // Sides
  push("side_left", "Left Side", { width: D, height: H, thickness: T }, { x: -W / 2 + T / 2, y: H / 2, z: 0 });
  push("side_right", "Right Side", { width: D, height: H, thickness: T }, { x: W / 2 - T / 2, y: H / 2, z: 0 });
  // Top + bottom, between the sides
  push("top", "Top Panel", { width: innerW, height: D, thickness: T }, { x: 0, y: H - T / 2, z: 0 });
  push("bottom", "Bottom Panel", { width: innerW, height: D, thickness: T }, { x: 0, y: T / 2, z: 0 });
  // Back, set into a groove near the rear
  push("back", "Back Panel", { width: innerW, height: innerH, thickness: BT }, { x: 0, y: H / 2, z: -D / 2 + BT / 2 });

  // Shelves — positionRatio is 0 (just above bottom) .. 1 (just below top), of interior height
  const interiorBottom = T;
  assembly.shelves.forEach((shelf, i) => {
    const role = `shelf_${i + 1}`;
    const y = interiorBottom + innerH * clamp01(shelf.positionRatio);
    const shelfDims = { width: innerW - 4, height: D - BT - 20, thickness: T };
    push(role, `Shelf ${i + 1}`, shelfDims, { x: 0, y, z: BT / 2 }, {
      materialId: shelf.materialId || mat,
      machining: [],
    });
    // Drill the shelf-pin holes into the side panels that carry this shelf.
    const holes = shelfPinHoles(id, y, D);
    for (const hole of holes) {
      const target = parts.find((p) => p.id === hole.onPart);
      if (target) target.machining.push(hole);
    }
  });

  for (const p of parts) {
    const [a, b, c] = [p.dimensions.width, p.dimensions.height, p.dimensions.thickness];
    if (![a, b, c].every((n) => Number.isFinite(n))) {
      throw new Error(`buildBaseCabinetParts: NaN geometry produced for part "${p.id}"`);
    }
    if (Math.min(a, b) < MIN_PANEL_MM) {
      p.warnings = [`Panel face below ${MIN_PANEL_MM}mm minimum — not realistically manufacturable`];
    }
  }

  return parts;
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}
