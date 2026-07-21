import { describe, it, expect } from "vitest";
import { generateFurnitureSpecification } from "./furnitureGenerationService.js";
import { createFakeProvider } from "../ai-provider/fakeProvider.js";
import { FslError } from "../fsl/errors.js";

const PRIMARY_STORY =
  "Create a modern white wardrobe, 2400 mm wide, 2600 mm high and 600 mm deep, with four hinged doors, six drawers, internal shelves, hanging rails and LED lighting.";

describe("generateFurnitureSpecification", () => {
  it("returns a success response with status ready is downgraded to partially_supported when the configurator can't render everything (target: configurator)", async () => {
    const provider = createFakeProvider();
    const { httpStatus, body } = await generateFurnitureSpecification(
      { message: PRIMARY_STORY, options: { allow_defaults: true, target: "configurator", include_explanation: true } },
      { aiProvider: provider }
    );

    expect(httpStatus).toBe(200);
    expect(body.status).toBe("success");
    expect(body.data.fsl.status).toBe("partially_supported"); // hanging_rail has no configurator equivalent — must be honest about it
    expect(body.data.configurator.compatible).toBe(false);
    expect(body.data.configurator.unsupported_fields.length).toBeGreaterThan(0);
    expect(body.data.configurator.adapter_payload).not.toBeNull();
    expect(body.data.configurator.adapter_payload.type).toBe("wardrobe");
    expect(body.data.interpretation).toBeDefined();
    expect(body.errors).toEqual([]);
  });

  it("returns status ready for a fully compatible configurator-target request", async () => {
    const provider = createFakeProvider({
      furniture_type: "wardrobe",
      project_name: null,
      description: "a simple wardrobe",
      dimensions: { width_mm: 1200, height_mm: 2000, depth_mm: 600 },
      style: { theme: "modern", primary_color: "white", secondary_color: null, finish: null, door_style: null, handle_style: null },
      materials: { body: null, facades: null, back_panel: null },
      components: [{ type: "hinged_door", quantity: 2 }],
      features_mentioned: [],
      explicit_fields: ["furniture_type", "dimensions.width_mm", "dimensions.height_mm", "dimensions.depth_mm", "style.theme", "style.primary_color"],
      ambiguities: [],
    });

    const { body } = await generateFurnitureSpecification({ message: "a simple 2-door wardrobe", options: { target: "configurator" } }, { aiProvider: provider });
    expect(body.data.fsl.status).toBe("ready");
    expect(body.data.configurator.compatible).toBe(true);
    expect(body.data.configurator.unsupported_fields).toEqual([]);
  });

  it("returns needs_clarification (HTTP 200) when critical dimensions are withheld and defaults are disallowed", async () => {
    const provider = createFakeProvider({
      furniture_type: "wardrobe",
      dimensions: { width_mm: null, height_mm: null, depth_mm: null },
      style: {},
      materials: {},
      components: [],
      features_mentioned: [],
      explicit_fields: ["furniture_type"],
      ambiguities: [],
    });

    const { httpStatus, body } = await generateFurnitureSpecification(
      { message: "a wardrobe", options: { allow_defaults: false } },
      { aiProvider: provider }
    );

    expect(httpStatus).toBe(200);
    expect(body.status).toBe("needs_clarification");
    expect(body.data.fsl.status).toBe("needs_clarification");
    expect(body.data.fsl.missing_information.length).toBe(3);
  });

  it("returns a stable INVALID_DIMENSION error response for an explicit, impossible dimension", async () => {
    const provider = createFakeProvider({
      furniture_type: "wardrobe",
      dimensions: { width_mm: -100, height_mm: 2400, depth_mm: 600 },
      style: {},
      materials: {},
      components: [],
      features_mentioned: [],
      explicit_fields: ["furniture_type", "dimensions.width_mm", "dimensions.height_mm", "dimensions.depth_mm"],
      ambiguities: [],
    });

    const { httpStatus, body } = await generateFurnitureSpecification({ message: "a -100mm wide wardrobe", options: {} }, { aiProvider: provider });
    expect(httpStatus).toBe(422);
    expect(body.status).toBe("error");
    expect(body.data).toBeNull();
    expect(body.errors[0].code).toBe("INVALID_DIMENSION");
  });

  it("maps an AI provider timeout to a 504 without leaking internals", async () => {
    const provider = createFakeProvider(() => {
      throw new FslError("AI_PROVIDER_TIMEOUT", "The AI provider did not respond in time.");
    });
    const { httpStatus, body } = await generateFurnitureSpecification({ message: "a wardrobe", options: {} }, { aiProvider: provider });
    expect(httpStatus).toBe(504);
    expect(body.status).toBe("error");
    expect(body.errors[0].code).toBe("AI_PROVIDER_TIMEOUT");
  });

  it("maps a structured-output failure to a 502", async () => {
    const provider = createFakeProvider(() => {
      throw new FslError("STRUCTURED_OUTPUT_ERROR", "The AI provider did not return a valid structured response.");
    });
    const { httpStatus, body } = await generateFurnitureSpecification({ message: "a wardrobe", options: {} }, { aiProvider: provider });
    expect(httpStatus).toBe(502);
    expect(body.errors[0].code).toBe("STRUCTURED_OUTPUT_ERROR");
  });

  it("omits the interpretation block when include_explanation is false", async () => {
    const provider = createFakeProvider();
    const { body } = await generateFurnitureSpecification(
      { message: PRIMARY_STORY, options: { include_explanation: false } },
      { aiProvider: provider }
    );
    expect(body.data.interpretation).toBeUndefined();
    expect(body.data.fsl).toBeDefined();
  });

  it("lets a genuine bug (non-FslError) propagate instead of being silently swallowed", async () => {
    const provider = createFakeProvider(() => {
      throw new Error("unexpected bug");
    });
    await expect(generateFurnitureSpecification({ message: "a wardrobe", options: {} }, { aiProvider: provider })).rejects.toThrow("unexpected bug");
  });
});
