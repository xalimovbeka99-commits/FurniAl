import { describe, it, expect } from "vitest";
import { buildGeometry, panelAreaFromParts, partsToCutList } from "./buildGeometry.js";
import { createDefaultConfig } from "./furnitureConfig.js";

// Characterization tests (master plan §25/§27 Phase 0): pin down buildGeometry.js's
// current panel-generation behavior before Phase 1 touches it. buildGeometry is pure
// maths (no Three.js/React dependency), so this exercises the exact same logic that
// renders the 3D view and feeds the cut list — see the file's own header comment.

describe("buildGeometry — default wardrobe config", () => {
  const config = createDefaultConfig("wardrobe");
  const parts = buildGeometry(config);

  it("produces the fixed carcass shell parts: 2 sides, 1 top, 1 bottom, 1 back, 1 plinth", () => {
    expect(parts.filter((p) => p.role === "side")).toHaveLength(2);
    expect(parts.filter((p) => p.role === "top")).toHaveLength(1);
    expect(parts.filter((p) => p.role === "bottom")).toHaveLength(1);
    expect(parts.filter((p) => p.role === "back")).toHaveLength(1);
    expect(parts.filter((p) => p.role === "plinth")).toHaveLength(1); // wardrobe has hasPlinth: true
  });

  it("produces one divider per gap between modules (3 modules -> 2 dividers)", () => {
    expect(config.modules).toHaveLength(3);
    expect(parts.filter((p) => p.role === "divider")).toHaveLength(2);
  });

  it("produces shelves matching each module's shelfCount (4 + 2 + 0 = 6)", () => {
    expect(parts.filter((p) => p.role === "shelf")).toHaveLength(6);
  });

  it("produces drawer fronts matching the drawer bank's drawerRows (3)", () => {
    expect(parts.filter((p) => p.role === "drawerFront")).toHaveLength(3);
  });

  it("produces one door panel per module's doorCount (1 + 1 = 2)", () => {
    expect(parts.filter((p) => p.role === "door")).toHaveLength(2);
  });

  it("gives every part a unique id, a 3-value positive size, and a 3-value position", () => {
    const ids = parts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of parts) {
      expect(p.size).toHaveLength(3);
      expect(p.position).toHaveLength(3);
      for (const dim of p.size) {
        expect(Number.isFinite(dim)).toBe(true);
        expect(dim).toBeGreaterThan(0);
      }
      for (const coord of p.position) {
        expect(Number.isFinite(coord)).toBe(true);
      }
    }
  });

  it("carries the config's material onto every part", () => {
    expect(parts.every((p) => p.material === config.material)).toBe(true);
  });
});

describe("buildGeometry — no plinth", () => {
  it("omits the plinth part when hasPlinth is false", () => {
    const config = createDefaultConfig("office"); // hasPlinth: false
    const parts = buildGeometry(config);
    expect(parts.filter((p) => p.role === "plinth")).toHaveLength(0);
  });
});

describe("panelAreaFromParts", () => {
  it("sums the largest face of each part", () => {
    const parts = [
      { size: [1, 2, 0.02] }, // faces: 2, 0.02, 0.04 -> largest 2
      { size: [0.5, 0.5, 0.02] }, // faces: 0.25, 0.01, 0.01 -> largest 0.25
    ];
    expect(panelAreaFromParts(parts)).toBeCloseTo(2.25, 10);
  });

  it("returns 0 for an empty parts list", () => {
    expect(panelAreaFromParts([])).toBe(0);
  });
});

describe("partsToCutList", () => {
  it("groups parts with identical (sorted) dimensions and material into one row with a quantity", () => {
    const parts = [
      { role: "shelf", size: [0.5, 0.018, 0.3], material: "oak" },
      { role: "shelf", size: [0.3, 0.5, 0.018], material: "oak" }, // same dims, different order
      { role: "shelf", size: [0.5, 0.018, 0.3], material: "walnut" }, // different material -> separate row
    ];
    const cutList = partsToCutList(parts);
    expect(cutList).toHaveLength(2);
    const oakRow = cutList.find((r) => r.material === "oak");
    expect(oakRow).toMatchObject({ role: "shelf", length: 500, width: 300, thickness: 18, qty: 2, material: "oak" });
    const walnutRow = cutList.find((r) => r.material === "walnut");
    expect(walnutRow.qty).toBe(1);
  });

  it("converts metres to rounded millimetres", () => {
    const cutList = partsToCutList([{ role: "top", size: [2.399, 0.018, 0.6001], material: "oak" }]);
    expect(cutList[0]).toMatchObject({ length: 2399, width: 600, thickness: 18 });
  });
});
