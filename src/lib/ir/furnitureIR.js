/**
 * Furniture IR — FurniAI's internal engineering language (CAD Lab experiment).
 * ==============================================================================
 * This is intentionally independent of Three.js and of the two existing config
 * shapes in this repo (index.html's flat cfg, src/lib/furnitureConfig.js's
 * FurnitureConfig). It is the versioned source of engineering truth for the
 * CAD Lab: the 3D view, validation, and production outputs are all VIEWS of
 * this data, derived by other engines — never the other way around.
 *
 * Units: millimetres everywhere (vision doc Section 36: mm is canonical).
 * The renderer is the only place this gets divided by 1000 for Three.js.
 *
 * Scope note: only what the first vertical slice (one base cabinet, create +
 * resize + shelves) needs is modelled. Fields like `edges`/`machining` are
 * real but deliberately simple — see docs/furniture-knowledge/base-cabinet-rules.md.
 */

export const IR_SCHEMA_VERSION = "0.1.0";

// --- IDs ---------------------------------------------------------------
// Assembly/project IDs are random (only need to be unique). Part IDs are
// DERIVED from the assembly id + a stable role key, not a counter — so a
// panel keeps the same id across a resize/recalculation, which is what lets
// the UI keep an entity selected through a parametric change.
export function newId(prefix) {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `${prefix}_${rand}`;
}

export function partId(assemblyId, role) {
  return `${assemblyId}__${role}`;
}

// --- Factory helpers -----------------------------------------------------

/** A brand new, empty CAD Lab project. */
export function createProject(name = "Untitled Project") {
  return {
    id: newId("proj"),
    entityType: "PROJECT",
    schemaVersion: IR_SCHEMA_VERSION,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assemblies: [],
    changeLog: [], // ChangePropagationEngine appends human-readable trace entries here
  };
}

/**
 * A new BASE_CABINET assembly shell — dimensions/construction only, no parts
 * yet. ParametricEngine.recalculateAssembly() fills in `parts` from these
 * high-level parameters; nothing here hand-builds geometry.
 */
export function createBaseCabinetAssembly({
  name = "Base Cabinet",
  width = 600,
  height = 720,
  depth = 560,
  boardThickness = 18,
  backThickness = 4,
  materialId = "WHITE_MDF_18",
} = {}) {
  const id = newId("asm");
  return {
    id,
    entityType: "ASSEMBLY",
    assemblyType: "BASE_CABINET",
    name,
    dimensions: { width, height, depth },
    construction: { boardThickness, backThickness },
    materialId,
    shelves: [], // [{ id, positionRatio (0-1 of interior height), materialId }]
    parts: [], // filled by ParametricEngine — never hand-edited
    parameters: { width, height, depth, boardThickness, backThickness },
    dependencies: [], // reserved; v0 uses full-rebuild propagation, not a graph
    updatedAt: new Date().toISOString(),
  };
}

// --- Lookups ---------------------------------------------------------------

export function findAssembly(project, assemblyId) {
  return project.assemblies.find((a) => a.id === assemblyId) || null;
}

/** Resolve any entity (assembly or part) by id, for the inspector panel. */
export function findEntity(project, entityId) {
  for (const asm of project.assemblies) {
    if (asm.id === entityId) return { entity: asm, assembly: asm };
    const part = asm.parts.find((p) => p.id === entityId);
    if (part) return { entity: part, assembly: asm };
  }
  return null;
}

export function replaceAssembly(project, updatedAssembly) {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    assemblies: project.assemblies.map((a) =>
      a.id === updatedAssembly.id ? updatedAssembly : a
    ),
  };
}

/**
 * Canonical local-face-dims -> world-axis-extents mapping. The ONE place
 * this conversion happens — ValidationEngine and the 3D renderer both call
 * this instead of each re-deriving it, so they can't silently disagree
 * (see docs/furniai-existing-system-analysis.md on the static site's
 * cut-list-vs-3D-builder fragility this is specifically meant to avoid).
 * Returns [worldX, worldY, worldZ] in mm. Rotation is identity for every
 * BASE_CABINET panel today, so this is a fixed per-role lookup, not a full
 * local->world transform.
 */
export function worldExtentsMm(part) {
  const { width, height, thickness } = part.dimensions;
  if (part.role === "side_left" || part.role === "side_right") return [thickness, height, width];
  if (part.role === "back") return [width, height, thickness];
  // top, bottom, shelf_* — horizontal panels, thin along Y
  return [width, thickness, height];
}

export function appendChangeLog(project, entry) {
  return {
    ...project,
    changeLog: [
      ...project.changeLog,
      { at: new Date().toISOString(), ...entry },
    ],
  };
}
