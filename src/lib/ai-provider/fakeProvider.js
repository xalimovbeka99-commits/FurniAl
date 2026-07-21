/**
 * Fake AI provider — used by tests (Section 23: "tests must not call a
 * paid live AI API by default") and available for local/manual exercising
 * of the brain and API route without an ANTHROPIC_API_KEY.
 *
 * Three ways to use it:
 *   createFakeProvider()               -> built-in heuristic NL extractor
 *   createFakeProvider(fixedResult)    -> always returns this exact object
 *   createFakeProvider(fn)             -> fn(message) is the extractor;
 *                                          may return a promise or throw
 *                                          (including FslError, to simulate
 *                                          provider failures deterministically)
 */
import { FURNITURE_TYPES, COMPONENT_TYPES, THEMES } from "../fsl/enums.js";

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function parseCount(str) {
  if (str == null) return null;
  const lower = String(str).toLowerCase();
  if (lower in WORD_NUMBERS) return WORD_NUMBERS[lower];
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

const NUMBER_WORD_PATTERN = "(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\\d+)";

const TYPE_KEYWORDS = [
  ["walk_in_closet", ["walk-in closet", "walk in closet", "walk-in wardrobe"]],
  ["bathroom_vanity", ["vanity", "bathroom cabinet"]],
  ["tv_unit", ["tv unit", "tv stand", "media unit"]],
  ["shoe_cabinet", ["shoe cabinet", "shoe rack"]],
  ["bookcase", ["bookcase", "bookshelf"]],
  ["office_cabinet", ["office cabinet", "office storage"]],
  ["sideboard", ["sideboard", "buffet"]],
  ["wardrobe", ["wardrobe"]],
  ["kitchen", ["kitchen"]],
  ["custom_cabinet", ["cabinet"]],
];

const COLOR_WORDS = ["white", "black", "beige", "graphite", "grey", "gray", "sage", "navy", "concrete", "linen", "oak", "walnut", "mahogany"];

function detectFurnitureType(text) {
  for (const [type, keywords] of TYPE_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return type;
  }
  return null;
}

function detectDimension(text, axisWord) {
  const primary = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*mm\\s*${axisWord}`, "i");
  const m1 = text.match(primary);
  if (m1) return Number(m1[1]);
  const secondary = new RegExp(`${axisWord}[^\\d]{0,12}(\\d+(?:\\.\\d+)?)\\s*mm`, "i");
  const m2 = text.match(secondary);
  if (m2) return Number(m2[1]);
  return null;
}

function detectComponent(text, keywordPattern, type) {
  const re = new RegExp(`${NUMBER_WORD_PATTERN}\\s+${keywordPattern}`, "i");
  const m = text.match(re);
  if (m) return { type, quantity: parseCount(m[1]) };
  if (new RegExp(keywordPattern, "i").test(text)) return { type, quantity: null };
  return null;
}

/** Built-in heuristic extractor — good enough for realistic tests, not a real NLU model. */
function heuristicExtract(message) {
  const text = message.toLowerCase();
  const explicit_fields = [];
  const furniture_type = detectFurnitureType(text);
  if (furniture_type) explicit_fields.push("furniture_type");

  const width_mm = detectDimension(text, "wide") ?? detectDimension(text, "width");
  const height_mm = detectDimension(text, "high") ?? detectDimension(text, "height");
  const depth_mm = detectDimension(text, "deep") ?? detectDimension(text, "depth");
  if (width_mm != null) explicit_fields.push("dimensions.width_mm");
  if (height_mm != null) explicit_fields.push("dimensions.height_mm");
  if (depth_mm != null) explicit_fields.push("dimensions.depth_mm");

  const theme = THEMES.find((t) => t !== "custom" && text.includes(t)) || null;
  if (theme) explicit_fields.push("style.theme");
  const primary_color = COLOR_WORDS.find((c) => text.includes(c)) || null;
  if (primary_color) explicit_fields.push("style.primary_color");

  const components = [];
  const doorMatch =
    detectComponent(text, "hinged\\s+doors?", "hinged_door") ||
    detectComponent(text, "sliding\\s+doors?", "sliding_door") ||
    detectComponent(text, "doors?", "hinged_door");
  if (doorMatch) components.push(doorMatch);
  const drawerMatch = detectComponent(text, "drawers?", "drawer");
  if (drawerMatch) components.push(drawerMatch);
  const shelfMatch = detectComponent(text, "shelv(?:es|ing)", "shelf");
  if (shelfMatch) components.push(shelfMatch);
  const railMatch = detectComponent(text, "hanging\\s+rails?|hanging\\s+rods?", "hanging_rail");
  if (railMatch) components.push(railMatch);
  const mirrorMatch = detectComponent(text, "mirror(?:ed)?\\s*doors?|mirrors?", "mirror");
  if (mirrorMatch) components.push(mirrorMatch);
  if (/\bled\b|lighting/i.test(text)) components.push({ type: "internal_led", quantity: 1 });

  const features_mentioned = [];
  if (/soft.close/i.test(text)) features_mentioned.push("soft_close");
  if (/\bled\b|lighting/i.test(text)) features_mentioned.push("internal_led");

  return {
    furniture_type: FURNITURE_TYPES.includes(furniture_type) ? furniture_type : null,
    project_name: null,
    description: message.trim().slice(0, 240),
    dimensions: { width_mm, height_mm, depth_mm },
    style: { theme, primary_color, secondary_color: null, finish: null, door_style: null, handle_style: null },
    materials: { body: null, facades: null, back_panel: null },
    components: components.filter((c) => COMPONENT_TYPES.includes(c.type)),
    features_mentioned,
    explicit_fields,
    ambiguities: [],
  };
}

export function createFakeProvider(script) {
  if (typeof script === "function") {
    return { async extractRequirements(message) { return script(message); } };
  }
  if (script && typeof script === "object") {
    return { async extractRequirements() { return JSON.parse(JSON.stringify(script)); } };
  }
  return { async extractRequirements(message) { return heuristicExtract(message); } };
}
