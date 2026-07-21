import { describe, it, expect } from "vitest";
import { validateFsl } from "./validator.js";
import { completeWardrobeFsl, needsClarificationWardrobeFsl } from "./fixtures.js";
import { ERROR_CODES } from "./errors.js";

describe("validateFsl", () => {
  it("accepts a fully-specified wardrobe with no errors and reports configurator compatibility per-component", () => {
    const result = validateFsl(completeWardrobeFsl(), { target: "configurator" });
    expect(result.errors).toEqual([]);
    // hanging_rail has no configurator equivalent today — this must be visible, not hidden.
    expect(result.compatibility.compatible).toBe(false);
    expect(result.compatibility.unsupported_fields.some((f) => f.message.includes("hanging_rail"))).toBe(true);
  });

  it("does not error on a document that is legitimately missing information yet", () => {
    const result = validateFsl(needsClarificationWardrobeFsl(), { target: "concept" });
    expect(result.errors).toEqual([]);
  });

  it("rejects a structurally invalid (too-shallow) dimension with INVALID_DIMENSION", () => {
    const fsl = completeWardrobeFsl();
    fsl.dimensions.depth_mm = 50;
    const result = validateFsl(fsl);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: ERROR_CODES.INVALID_DIMENSION, field: "dimensions.depth_mm" })
    );
  });

  it("rejects a negative dimension with INVALID_DIMENSION", () => {
    const fsl = completeWardrobeFsl();
    fsl.dimensions.width_mm = -100;
    const result = validateFsl(fsl);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: ERROR_CODES.INVALID_DIMENSION, field: "dimensions.width_mm" }));
  });

  it("warns (does not error) on an unusually shallow but structurally valid depth", () => {
    const fsl = completeWardrobeFsl();
    fsl.dimensions.depth_mm = 400; // below hanging-clearance recommendation, above the hard minimum
    const result = validateFsl(fsl);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "UNUSUAL_WARDROBE_DEPTH" }));
  });

  it("rejects an unknown component type with INVALID_COMPONENT", () => {
    const fsl = completeWardrobeFsl();
    fsl.components.push({ id: "x-1", type: "banana_slicer", quantity: 1, position: null, dimensions: null, material_ref: null, properties: {} });
    const result = validateFsl(fsl);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: ERROR_CODES.INVALID_COMPONENT, field: "components[5].type" }));
  });

  it("rejects a non-positive component quantity with INVALID_COMPONENT", () => {
    const fsl = completeWardrobeFsl();
    fsl.components[0].quantity = 0;
    const result = validateFsl(fsl);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: ERROR_CODES.INVALID_COMPONENT }));
  });

  it("handles an unsupported/unknown furniture_type as a controlled error, not a crash", () => {
    const fsl = completeWardrobeFsl();
    fsl.project.furniture_type = "spaceship";
    const result = validateFsl(fsl);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: ERROR_CODES.UNSUPPORTED_FURNITURE_TYPE }));
    expect(result.compatibility.compatible).toBe(false);
  });

  it("reports full configurator compatibility for a document with no unsupported components", () => {
    const fsl = completeWardrobeFsl();
    fsl.components = fsl.components.filter((c) => c.type !== "hanging_rail");
    const result = validateFsl(fsl, { target: "configurator" });
    expect(result.compatibility.compatible).toBe(true);
    expect(result.compatibility.unsupported_fields).toEqual([]);
  });
});
