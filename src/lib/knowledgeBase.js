/**
 * FurniAI Knowledge Base
 * ----------------------
 * The single source of truth for everything the Sales Agent and Quote Generator
 * need to know about furniture, materials, hardware, and costs.
 *
 * This is deliberately a plain JS data module, NOT a vector DB. At MVP scale a
 * few hundred rows of structured data is faster, debuggable, and free. Move to
 * ChromaDB/Postgres only when this file genuinely becomes the bottleneck.
 *
 * All prices are PLACEHOLDERS in AED. Replace with your real supplier costs.
 * Keeping them in one file means a non-developer can update pricing safely.
 */

// ---------------------------------------------------------------------------
// MATERIALS — cost is per square metre of finished panel (board + finishing)
// ---------------------------------------------------------------------------
export const MATERIALS = {
  oak:       { label: "Oak",        costPerM2: 180, tier: "premium",  color: "#c8a878" },
  walnut:    { label: "Walnut",     costPerM2: 240, tier: "premium",  color: "#5c4033" },
  mahogany:  { label: "Mahogany",   costPerM2: 260, tier: "premium",  color: "#6f3329" },
  white:     { label: "White MDF",  costPerM2: 95,  tier: "standard", color: "#f5f5f0" },
  black:     { label: "Black MDF",  costPerM2: 100, tier: "standard", color: "#1a1a1a" },
  beige:     { label: "Beige",      costPerM2: 95,  tier: "standard", color: "#e8dcc4" },
  graphite:  { label: "Graphite",   costPerM2: 110, tier: "standard", color: "#3a3a3a" },
  sage:      { label: "Sage",       costPerM2: 110, tier: "standard", color: "#9caf88" },
  navy:      { label: "Navy",       costPerM2: 110, tier: "standard", color: "#2c3e50" },
  concrete:  { label: "Concrete",   costPerM2: 130, tier: "standard", color: "#9e9e9e" },
  linen:     { label: "Linen",      costPerM2: 140, tier: "standard", color: "#d9cab3" },
  dark_wood: { label: "Dark Wood",  costPerM2: 200, tier: "premium",  color: "#3b2a1a" },
};

// Default material when the customer doesn't specify one.
export const DEFAULT_MATERIAL = "oak";

// Handle styles — priced per handle.
export const HANDLE_STYLES = {
  gold_bar:    { label: "Gold Bar",    unitCost: 22 },
  silver_knob: { label: "Silver Knob", unitCost: 8 },
  black_strip: { label: "Black Strip", unitCost: 14 },
  hidden_push: { label: "Hidden Push", unitCost: 0 },  // mechanism, no visible handle
  chrome:      { label: "Chrome",      unitCost: 16 },
};

// Door types — surcharge per door panel, on top of the base material cost.
export const DOOR_TYPES = {
  solid_panel:   { label: "Solid Panel",   surchargePerDoor: 0 },
  glass_panel:   { label: "Glass Panel",   surchargePerDoor: 65 },
  full_mirror:   { label: "Full Mirror",   surchargePerDoor: 90 },
  frosted_glass: { label: "Frosted Glass", surchargePerDoor: 75 },
};

// LED lighting — flat add-on by mode.
export const LED_LIGHTING = {
  off:  { label: "No LED",     cost: 0 },
  warm: { label: "Warm White", cost: 120 },
  cool: { label: "Cool White", cost: 120 },
  rgb:  { label: "RGB",        cost: 180 },
};

// ---------------------------------------------------------------------------
// FURNITURE TYPES — smart defaults (metres) + a rough panel-area model + labour.
// `panelFactor` estimates total panel surface area as a multiple of the bounding
// box surface, accounting for internal shelves/dividers. Tune against real cut lists.
// ---------------------------------------------------------------------------
export const FURNITURE_TYPES = {
  wardrobe: {
    label: "Wardrobe",
    defaults: { width: 2.4, height: 2.8, depth: 0.6 },
    panelFactor: 1.6,
    doorsFor: (w) => Math.max(2, Math.round(w / 0.6)), // ~one door per 60cm
    laborBase: 200,
    complexity: 1.3,
  },
  kitchen: {
    label: "Kitchen",
    defaults: { width: 3.0, height: 2.2, depth: 0.6 },
    panelFactor: 2.0,
    doorsFor: (w) => Math.max(4, Math.round(w / 0.5)),
    laborBase: 450,
    complexity: 1.8,
  },
  office: {
    label: "Office",
    defaults: { width: 1.6, height: 0.75, depth: 0.7 },
    panelFactor: 1.3,
    doorsFor: () => 2,
    laborBase: 180,
    complexity: 1.2,
  },
  bed: {
    label: "Bed",
    defaults: { width: 1.6, height: 1.0, depth: 2.0 },
    panelFactor: 1.1,
    doorsFor: () => 0,
    laborBase: 160,
    complexity: 1.1,
  },
  cabinet: {
    label: "Cabinet",
    defaults: { width: 1.0, height: 1.8, depth: 0.45 },
    panelFactor: 1.5,
    doorsFor: (w) => Math.max(2, Math.round(w / 0.5)),
    laborBase: 150,
    complexity: 1.2,
  },
  shelves: {
    label: "Shelving Unit",
    defaults: { width: 1.2, height: 2.0, depth: 0.35 },
    panelFactor: 1.7,
    doorsFor: () => 0,
    laborBase: 120,
    complexity: 1.0,
  },
  table: {
    label: "Table",
    defaults: { width: 1.8, height: 0.75, depth: 0.9 },
    panelFactor: 1.0,
    doorsFor: () => 0,
    laborBase: 140,
    complexity: 1.0,
  },
  dressing_table: {
    label: "Dressing Table",
    defaults: { width: 1.2, height: 1.4, depth: 0.45 },
    panelFactor: 1.4,
    doorsFor: () => 0,
    laborBase: 170,
    complexity: 1.2,
  },
};

export const DEFAULT_FURNITURE_TYPE = "wardrobe";

// Convenience lookups used by the agent for validation / disambiguation.
export const KNOWN = {
  furnitureTypes: Object.keys(FURNITURE_TYPES),
  materials: Object.keys(MATERIALS),
  doorTypes: Object.keys(DOOR_TYPES),
  handleStyles: Object.keys(HANDLE_STYLES),
  ledModes: Object.keys(LED_LIGHTING),
};
