import { describe, it, expect } from "vitest";
import { fslToFurnitureConfig } from "./adapter.js";
import { completeWardrobeFsl } from "../fsl/fixtures.js";

describe("fslToFurnitureConfig", () => {
  it("maps a complete wardrobe onto a valid FurnitureConfig via the existing configSchema gate", () => {
    const { attempted, config, warnings } = fslToFurnitureConfig(completeWardrobeFsl());
    expect(attempted).toBe(true);
    expect(config.type).toBe("wardrobe");
    expect(config.material).toBe("white");
    expect(config.dimensions).toEqual({ width: 2.4, height: 2.6, depth: 0.6 });
    // One door becomes one module (realistic door widths) — 4 requested doors => 4 door modules.
    expect(config.modules.filter((m) => m.kind === "door")).toHaveLength(4);
    expect(config.modules.some((m) => m.kind === "drawerBank" && m.drawerRows === 6)).toBe(true);
    expect(Array.isArray(warnings)).toBe(true);
  });

  it("returns attempted:false for a furniture_type with no configurator mapping", () => {
    const fsl = completeWardrobeFsl();
    fsl.project.furniture_type = "bathroom_vanity";
    const { attempted, config } = fslToFurnitureConfig(fsl);
    expect(attempted).toBe(false);
    expect(config).toBeNull();
  });

  it("falls back to the type's default module layout when no components were requested", () => {
    const fsl = completeWardrobeFsl();
    fsl.components = [];
    const { config } = fslToFurnitureConfig(fsl);
    expect(config.modules.length).toBeGreaterThan(0);
  });

  it("never lets an out-of-range dimension reach the configurator unclamped", () => {
    const fsl = completeWardrobeFsl();
    fsl.dimensions.width_mm = 50000; // absurd, well beyond even FSL's own wardrobe max
    const { config } = fslToFurnitureConfig(fsl);
    expect(config.dimensions.width).toBeLessThanOrEqual(6.0); // configSchema's own clampDimension ceiling
  });
});
