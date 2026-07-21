import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAnthropicProvider } from "./anthropicProvider.js";
import { EXTRACT_TOOL_NAME } from "./extractionSchema.js";

const createMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({ messages: { create: createMock } })),
}));

function toolUseResponse(input) {
  return { content: [{ type: "tool_use", name: EXTRACT_TOOL_NAME, id: "tool_1", input }] };
}

describe("createAnthropicProvider", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("throws AI_PROVIDER_ERROR immediately if no API key is configured", () => {
    expect(() => createAnthropicProvider({ apiKey: "" })).toThrow(expect.objectContaining({ code: "AI_PROVIDER_ERROR" }));
  });

  it("returns a normalized extraction on a clean tool_use response", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({ furniture_type: "wardrobe", dimensions: { width_mm: 2400 }, components: [], explicit_fields: ["furniture_type"] })
    );
    const provider = createAnthropicProvider({ apiKey: "test-key" });
    const result = await provider.extractRequirements("a 2400mm wardrobe");
    expect(result.furniture_type).toBe("wardrobe");
    expect(result.dimensions).toEqual({ width_mm: 2400, height_mm: null, depth_mm: null });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("attempts exactly one repair when the first response has no valid tool_use block, then succeeds", async () => {
    createMock
      .mockResolvedValueOnce({ content: [{ type: "text", text: "sorry, I won't call the tool" }] })
      .mockResolvedValueOnce(toolUseResponse({ furniture_type: "kitchen", dimensions: {}, components: [], explicit_fields: ["furniture_type"] }));

    const provider = createAnthropicProvider({ apiKey: "test-key" });
    const result = await provider.extractRequirements("a kitchen");
    expect(result.furniture_type).toBe("kitchen");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("fails safely with STRUCTURED_OUTPUT_ERROR when both attempts are malformed — never exposes raw provider output", async () => {
    createMock.mockResolvedValue({ content: [{ type: "text", text: "still no tool call" }] });
    const provider = createAnthropicProvider({ apiKey: "test-key" });
    await expect(provider.extractRequirements("a wardrobe")).rejects.toMatchObject({ code: "STRUCTURED_OUTPUT_ERROR" });
    expect(createMock).toHaveBeenCalledTimes(2); // one call + exactly one bounded repair, never unbounded retries
  });

  it("maps an aborted/timed-out call to AI_PROVIDER_TIMEOUT", async () => {
    createMock.mockImplementation(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    const provider = createAnthropicProvider({ apiKey: "test-key", timeoutMs: 5 });
    await expect(provider.extractRequirements("a wardrobe")).rejects.toMatchObject({ code: "AI_PROVIDER_TIMEOUT" });
  });

  it("maps any other provider failure to a generic AI_PROVIDER_ERROR without leaking the raw error", async () => {
    createMock.mockRejectedValue(new Error("connection reset by peer at 10.0.0.5:443"));
    const provider = createAnthropicProvider({ apiKey: "test-key" });
    const rejection = await provider.extractRequirements("a wardrobe").catch((e) => e);
    expect(rejection.code).toBe("AI_PROVIDER_ERROR");
    expect(rejection.message).not.toContain("10.0.0.5");
  });
});
