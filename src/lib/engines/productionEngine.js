/**
 * ProductionEngine — analysis + cut list, derived FROM the Furniture IR's
 * parts[] (never from the 3D scene, never re-derived independently — see
 * the "two independent readings of cfg" fragility noted for the static
 * site's generatePanelList() in docs/furniai-existing-system-analysis.md).
 * No AI involved.
 */

const prettyRole = (role) => {
  if (role.startsWith("shelf")) return `Shelf ${role.split("_")[1]}`;
  return { side_left: "Left Side", side_right: "Right Side", top: "Top Panel", bottom: "Bottom Panel", back: "Back Panel" }[role] || role;
};

/** Cut list: one row per part, mm, grouped by identical dimensions+material. */
export function generateCutList(assembly) {
  const map = new Map();
  for (const p of assembly.parts) {
    const { width, height, thickness } = p.dimensions;
    const key = `${p.role}|${width}x${height}x${thickness}|${p.materialId}`;
    const existing = map.get(key);
    if (existing) {
      existing.qty += 1;
    } else {
      map.set(key, {
        partId: p.id,
        partName: prettyRole(p.role),
        role: p.role,
        length: Math.round(width),
        width: Math.round(height),
        thickness: Math.round(thickness),
        material: p.materialId,
        edgeBanding: p.edges.length ? p.edges.map((e) => `${e.side}: ${e.thicknessMm}mm ${e.materialId}`).join("; ") : "None",
        grain: p.grainDirection,
        qty: 1,
      });
    }
  }
  return [...map.values()];
}

/** Production analysis — part counts, area, machining summary (Section 23-24). */
export function analyzeProduction(assembly) {
  const parts = assembly.parts;
  const partsByRole = parts.reduce((acc, p) => ((acc[p.role] = (acc[p.role] || 0) + 1), acc), {});
  const totalAreaM2 = parts.reduce((sum, p) => {
    const { width, height } = p.dimensions;
    return sum + (width * height) / 1_000_000;
  }, 0);
  const machiningOps = parts.reduce((sum, p) => sum + p.machining.length, 0);
  return {
    totalParts: parts.length,
    partsByRole,
    totalAreaM2: Math.round(totalAreaM2 * 1000) / 1000,
    machiningOperations: machiningOps,
    materials: [...new Set(parts.map((p) => p.materialId))],
  };
}
