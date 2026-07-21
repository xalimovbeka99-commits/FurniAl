/**
 * FurniAI Tool Registry (CAD Lab, v0) — the first 10 tools from vision
 * Section 33 only. Every tool: NAME, DESCRIPTION, INPUT SCHEMA, a `run()`
 * handler that goes through the engines (never touches Three.js, never lets
 * raw AI input reach geometry unsanitized — same defense-in-depth pattern
 * proven in api/chat.js's sanitizeConfig()).
 *
 * `run(input, project)` is pure: returns `{ project, output, warnings }` and
 * never mutates its arguments. Mutating tools return a NEW project; read-only
 * tools return the same project reference unchanged.
 */
import {
  createBaseCabinetAssembly,
  findAssembly,
  findEntity,
  replaceAssembly,
  appendChangeLog,
  newId,
} from "../ir/furnitureIR.js";
import { recalculateAssembly } from "../engines/parametricEngine.js";
import { propagateParameterChange, propagateShelfChange } from "../engines/changePropagationEngine.js";
import { validateAssembly } from "../engines/validationEngine.js";
import { analyzeProduction, generateCutList } from "../engines/productionEngine.js";
import { MATERIALS, DEFAULT_MATERIAL_ID, isKnownMaterial } from "../ir/materials.js";

const RANGES_MM = {
  width: [200, 1200],
  height: [300, 1000],
  depth: [250, 700],
  boardThickness: [6, 50],
  backThickness: [2, 12],
};

const clamp = (v, [min, max], fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const materialOrDefault = (v) => (isKnownMaterial(v) ? v : DEFAULT_MATERIAL_ID);

function resolveAssembly(project, assemblyId, warnings) {
  let assembly = assemblyId ? findAssembly(project, assemblyId) : null;
  if (!assembly && project.assemblies.length === 1) {
    assembly = project.assemblies[0];
    if (assemblyId) warnings.push(`Unknown assemblyId "${assemblyId}" — used the only assembly in the project instead.`);
  }
  if (!assembly) throw new ToolError(`No assembly found for assemblyId "${assemblyId}". Call create_base_cabinet first.`);
  return assembly;
}

class ToolError extends Error {}

// --- Tools -------------------------------------------------------------

const create_base_cabinet = {
  name: "create_base_cabinet",
  description: "Create a new base cabinet carcass (sides, top, bottom, back). No shelves/doors yet — use add_shelf afterwards.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      width: { type: "number", description: "mm" },
      height: { type: "number", description: "mm" },
      depth: { type: "number", description: "mm" },
      boardThickness: { type: "number", description: "mm, default 18" },
      backThickness: { type: "number", description: "mm, default 4" },
      materialId: { type: "string", enum: Object.keys(MATERIALS) },
    },
    required: ["width", "height", "depth"],
  },
  run(input, project) {
    const warnings = [];
    const width = clamp(input.width, RANGES_MM.width, 600);
    const height = clamp(input.height, RANGES_MM.height, 720);
    const depth = clamp(input.depth, RANGES_MM.depth, 560);
    const boardThickness = clamp(input.boardThickness, RANGES_MM.boardThickness, 18);
    const backThickness = clamp(input.backThickness, RANGES_MM.backThickness, 4);
    const materialId = materialOrDefault(input.materialId);
    if (input.materialId && materialId !== input.materialId) warnings.push(`Unknown materialId "${input.materialId}" -> ${materialId}`);

    let assembly = createBaseCabinetAssembly({
      name: typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 60) : "Base Cabinet",
      width, height, depth, boardThickness, backThickness, materialId,
    });
    assembly = recalculateAssembly(assembly);

    let nextProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      assemblies: [...project.assemblies, assembly],
    };
    nextProject = appendChangeLog(nextProject, {
      tool: "create_base_cabinet",
      trace: [`created BASE_CABINET ${assembly.id}: ${width}x${height}x${depth}mm`, `3D populated: ${assembly.parts.length} panels`],
    });

    return {
      project: nextProject,
      output: {
        createdAssemblyId: assembly.id,
        createdPartIds: assembly.parts.map((p) => p.id),
        warnings,
      },
      warnings,
    };
  },
};

const set_dimensions = {
  name: "set_dimensions",
  description: "Resize an existing assembly. Only pass the dimensions that are changing; unspecified ones are kept.",
  input_schema: {
    type: "object",
    properties: {
      assemblyId: { type: "string" },
      width: { type: "number", description: "mm" },
      height: { type: "number", description: "mm" },
      depth: { type: "number", description: "mm" },
    },
    required: ["assemblyId"],
  },
  run(input, project) {
    const warnings = [];
    const assembly = resolveAssembly(project, input.assemblyId, warnings);
    const patch = { dimensions: {} };
    for (const axis of ["width", "height", "depth"]) {
      if (input[axis] !== undefined) patch.dimensions[axis] = clamp(input[axis], RANGES_MM[axis], assembly.dimensions[axis]);
    }
    const { assembly: updated, trace } = propagateParameterChange(assembly, patch);
    let nextProject = replaceAssembly(project, updated);
    nextProject = appendChangeLog(nextProject, { tool: "set_dimensions", trace });
    return { project: nextProject, output: { assemblyId: updated.id, dimensions: updated.dimensions, trace, warnings }, warnings };
  },
};

const add_shelf = {
  name: "add_shelf",
  description: "Add one adjustable shelf to an assembly at a given height fraction (0 = just above the bottom, 1 = just below the top).",
  input_schema: {
    type: "object",
    properties: {
      assemblyId: { type: "string" },
      positionRatio: { type: "number", description: "0-1, defaults to evenly spaced if omitted" },
      materialId: { type: "string", enum: Object.keys(MATERIALS) },
    },
    required: ["assemblyId"],
  },
  run(input, project) {
    const warnings = [];
    const assembly = resolveAssembly(project, input.assemblyId, warnings);
    const materialId = input.materialId ? materialOrDefault(input.materialId) : assembly.materialId;
    if (input.materialId && materialId !== input.materialId) warnings.push(`Unknown materialId "${input.materialId}" -> ${materialId}`);

    const count = assembly.shelves.length;
    const defaultRatio = (count + 1) / (count + 2); // next even slot, biased toward existing spacing
    const positionRatio = input.positionRatio !== undefined ? clamp(input.positionRatio, [0, 1], defaultRatio) : defaultRatio;
    const shelfId = newId("shelf");

    const { assembly: updated, trace } = propagateShelfChange(assembly, (shelves) => [...shelves, { id: shelfId, positionRatio, materialId }]);
    let nextProject = replaceAssembly(project, updated);
    nextProject = appendChangeLog(nextProject, { tool: "add_shelf", trace });
    const createdPart = updated.parts.find((p) => p.role === `shelf_${updated.shelves.findIndex((s) => s.id === shelfId) + 1}`);
    return { project: nextProject, output: { assemblyId: updated.id, shelfId, createdPartIds: createdPart ? [createdPart.id] : [], trace, warnings }, warnings };
  },
};

const remove_shelf = {
  name: "remove_shelf",
  description: "Remove a shelf by its shelfId (as returned by add_shelf or listed in get_entity/get_project_summary).",
  input_schema: {
    type: "object",
    properties: { assemblyId: { type: "string" }, shelfId: { type: "string" } },
    required: ["assemblyId", "shelfId"],
  },
  run(input, project) {
    const warnings = [];
    const assembly = resolveAssembly(project, input.assemblyId, warnings);
    if (!assembly.shelves.some((s) => s.id === input.shelfId)) {
      warnings.push(`shelfId "${input.shelfId}" not found — nothing removed.`);
      return { project, output: { assemblyId: assembly.id, removed: false, warnings }, warnings };
    }
    const { assembly: updated, trace } = propagateShelfChange(assembly, (shelves) => shelves.filter((s) => s.id !== input.shelfId));
    let nextProject = replaceAssembly(project, updated);
    nextProject = appendChangeLog(nextProject, { tool: "remove_shelf", trace });
    return { project: nextProject, output: { assemblyId: updated.id, removed: true, trace, warnings }, warnings };
  },
};

const apply_material = {
  name: "apply_material",
  description: "Set the material for a whole assembly, or for one specific shelf part (targetPartId). Other panel roles don't support a per-part override yet — falls back to the whole-assembly material with a warning.",
  input_schema: {
    type: "object",
    properties: {
      assemblyId: { type: "string" },
      materialId: { type: "string", enum: Object.keys(MATERIALS) },
      targetPartId: { type: "string" },
    },
    required: ["assemblyId", "materialId"],
  },
  run(input, project) {
    const warnings = [];
    const assembly = resolveAssembly(project, input.assemblyId, warnings);
    const materialId = materialOrDefault(input.materialId);
    if (materialId !== input.materialId) warnings.push(`Unknown materialId "${input.materialId}" -> ${materialId}`);

    if (input.targetPartId) {
      const shelfIndex = assembly.parts.findIndex((p) => p.id === input.targetPartId && p.role.startsWith("shelf_"));
      if (shelfIndex >= 0) {
        const shelfOrdinal = Number(assembly.parts[shelfIndex].role.split("_")[1]) - 1;
        const { assembly: updated, trace } = propagateShelfChange(assembly, (shelves) =>
          shelves.map((s, i) => (i === shelfOrdinal ? { ...s, materialId } : s))
        );
        let nextProject = replaceAssembly(project, updated);
        nextProject = appendChangeLog(nextProject, { tool: "apply_material", trace });
        return { project: nextProject, output: { assemblyId: updated.id, targetPartId: input.targetPartId, materialId, trace, warnings }, warnings };
      }
      warnings.push(`targetPartId "${input.targetPartId}" is not an independently-materialable part yet — applied to the whole assembly instead.`);
    }

    const { assembly: updated, trace } = propagateParameterChange(assembly, { materialId });
    let nextProject = replaceAssembly(project, updated);
    nextProject = appendChangeLog(nextProject, { tool: "apply_material", trace });
    return { project: nextProject, output: { assemblyId: updated.id, materialId, trace, warnings }, warnings };
  },
};

const get_entity = {
  name: "get_entity",
  description: "Look up the full engineering data for one entity (assembly or panel) by id.",
  input_schema: { type: "object", properties: { entityId: { type: "string" } }, required: ["entityId"] },
  run(input, project) {
    const found = findEntity(project, input.entityId);
    if (!found) return { project, output: { found: false, entityId: input.entityId }, warnings: [`entityId "${input.entityId}" not found`] };
    return { project, output: { found: true, entity: found.entity }, warnings: [] };
  },
};

const get_project_summary = {
  name: "get_project_summary",
  description: "Compact semantic summary of the current project — use this instead of dumping the whole IR into context.",
  input_schema: { type: "object", properties: {} },
  run(_input, project) {
    const summary = {
      projectId: project.id,
      name: project.name,
      assemblies: project.assemblies.map((a) => ({
        id: a.id,
        assemblyType: a.assemblyType,
        name: a.name,
        dimensionsMm: a.dimensions,
        materialId: a.materialId,
        partCount: a.parts.length,
        shelves: a.shelves.map((s) => ({ id: s.id, positionRatio: s.positionRatio })),
      })),
    };
    return { project, output: summary, warnings: [] };
  },
};

const validate_project = {
  name: "validate_project",
  description: "Run the ValidationEngine against one assembly (or all assemblies if assemblyId is omitted).",
  input_schema: { type: "object", properties: { assemblyId: { type: "string" } } },
  run(input, project) {
    const targets = input.assemblyId ? project.assemblies.filter((a) => a.id === input.assemblyId) : project.assemblies;
    const results = targets.map((a) => ({ assemblyId: a.id, ...validateAssembly(a) }));
    return { project, output: { results }, warnings: [] };
  },
};

const analyze_production = {
  name: "analyze_production",
  description: "Part count, panel area, machining summary for an assembly.",
  input_schema: { type: "object", properties: { assemblyId: { type: "string" } }, required: ["assemblyId"] },
  run(input, project) {
    const warnings = [];
    const assembly = resolveAssembly(project, input.assemblyId, warnings);
    return { project, output: { assemblyId: assembly.id, analysis: analyzeProduction(assembly) }, warnings };
  },
};

const generate_cut_list = {
  name: "generate_cut_list",
  description: "Factory cut list (mm) for an assembly, derived from the same parts the 3D view renders.",
  input_schema: { type: "object", properties: { assemblyId: { type: "string" } }, required: ["assemblyId"] },
  run(input, project) {
    const warnings = [];
    const assembly = resolveAssembly(project, input.assemblyId, warnings);
    return { project, output: { assemblyId: assembly.id, cutList: generateCutList(assembly) }, warnings };
  },
};

export const TOOLS = [
  create_base_cabinet,
  set_dimensions,
  add_shelf,
  remove_shelf,
  apply_material,
  get_entity,
  get_project_summary,
  validate_project,
  analyze_production,
  generate_cut_list,
];

export const TOOL_BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

/** Anthropic-format tool schemas (name/description/input_schema only). */
export function anthropicToolSchemas() {
  return TOOLS.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
}

/**
 * Run a tool by name against a project. Never throws for AI-facing errors —
 * ToolError (unknown assembly, etc.) is caught and returned as a tool-level
 * error so the planner can recover in-conversation instead of 500ing.
 */
export function runTool(name, input, project) {
  const tool = TOOL_BY_NAME[name];
  if (!tool) return { project, output: null, warnings: [], error: `Unknown tool "${name}"` };
  try {
    return { ...tool.run(input || {}, project), error: null };
  } catch (err) {
    if (err instanceof ToolError) return { project, output: null, warnings: [], error: err.message };
    throw err;
  }
}
