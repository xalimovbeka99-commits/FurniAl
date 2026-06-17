/**
 * FurniAI Quote Generator (Pricing Engine)
 * ----------------------------------------
 * Pure, deterministic functions. No network, no AI, no side effects — so it's
 * trivially testable and the same input always yields the same quote.
 *
 * Input is the design-spec JSON described in MASTER_PLAN Phase One, e.g.:
 *   {
 *     furnitureType: "wardrobe", primaryColor: "walnut", doorType: "full_mirror",
 *     handleStyle: "gold_bar", drawerRows: 3, hangerRods: true, ledLighting: "warm",
 *     width: 2.4, height: 2.8, depth: 0.6
 *   }
 *
 * Output is a structured quote with a full line-item breakdown.
 */

import {
  MATERIALS, DEFAULT_MATERIAL,
  HARDWARE, HANDLE_STYLES, DOOR_TYPES, LED_LIGHTING,
  FURNITURE_TYPES, DEFAULT_FURNITURE_TYPE,
  DELIVERY, DEFAULT_DELIVERY,
  MARGIN, CURRENCY,
} from "./knowledgeBase.js";

const round = (n) => Math.round(n * 100) / 100;

/**
 * Estimate total finished panel area (m²) from the bounding box + a per-type
 * factor that accounts for internal shelves and dividers.
 */
function estimatePanelArea(type, { width, height, depth }) {
  const boundingSurface =
    2 * (width * height) + 2 * (width * depth) + 2 * (height * depth);
  return boundingSurface * type.panelFactor;
}

/**
 * Generate a full quote from a design spec.
 * Unknown / missing fields fall back to knowledge-base defaults so the engine
 * never throws on partial input — it just prices the best interpretation.
 *
 * @returns {{ ok: boolean, quote?: object, warnings: string[] }}
 */
export function generateQuote(spec = {}) {
  const warnings = [];

  // --- Resolve furniture type ------------------------------------------------
  const typeKey = FURNITURE_TYPES[spec.furnitureType]
    ? spec.furnitureType
    : DEFAULT_FURNITURE_TYPE;
  if (spec.furnitureType && typeKey !== spec.furnitureType) {
    warnings.push(`Unknown furniture type "${spec.furnitureType}", defaulted to ${typeKey}.`);
  }
  const type = FURNITURE_TYPES[typeKey];

  // --- Resolve dimensions ----------------------------------------------------
  const dims = {
    width: numOr(spec.width, type.defaults.width),
    height: numOr(spec.height, type.defaults.height),
    depth: numOr(spec.depth, type.defaults.depth),
  };
  if (spec.width == null && spec.height == null && spec.depth == null) {
    warnings.push(`No dimensions given; used standard ${type.label.toLowerCase()} defaults.`);
  }

  // --- Resolve material ------------------------------------------------------
  const matKey = MATERIALS[spec.primaryColor] ? spec.primaryColor : DEFAULT_MATERIAL;
  if (spec.primaryColor && matKey !== spec.primaryColor) {
    warnings.push(`Unknown material "${spec.primaryColor}", defaulted to ${matKey}.`);
  }
  const material = MATERIALS[matKey];

  // --- Material cost ---------------------------------------------------------
  const panelArea = estimatePanelArea(type, dims);
  const materialCost = panelArea * material.costPerM2;

  // --- Doors + handles + door surcharge -------------------------------------
  const doorCount = type.doorsFor(dims.width);
  const doorType = DOOR_TYPES[spec.doorType] || DOOR_TYPES.solid_panel;
  const doorSurcharge = doorCount * doorType.surchargePerDoor;

  const handle = HANDLE_STYLES[spec.handleStyle] || HANDLE_STYLES.silver_knob;
  const handleCost = doorCount * handle.unitCost;
  const hingeCost = doorCount * 2 * HARDWARE.hinge.unitCost; // ~2 hinges/door

  // --- Drawers ---------------------------------------------------------------
  const drawerRows = clampInt(spec.drawerRows, 0, 6);
  const drawerCost = drawerRows * HARDWARE.drawerSlide.unitCost;

  // --- Other hardware --------------------------------------------------------
  const hangerCost = spec.hangerRods ? HARDWARE.hangerRod.unitCost : 0;
  const confirmatCost = panelArea * HARDWARE.confirmatSet.unitCost;
  const led = LED_LIGHTING[spec.ledLighting] || LED_LIGHTING.off;
  const ledCost = led.cost;

  const hardwareCost =
    handleCost + hingeCost + drawerCost + hangerCost + confirmatCost + ledCost + doorSurcharge;

  // --- Labour ----------------------------------------------------------------
  const laborCost = type.laborBase * type.complexity;

  // --- Margin + delivery -----------------------------------------------------
  const subtotal = materialCost + hardwareCost + laborCost;
  const marginAmount = subtotal * MARGIN;

  const deliveryKey = DELIVERY[spec.delivery] != null ? spec.delivery : DEFAULT_DELIVERY;
  const deliveryCost = DELIVERY[deliveryKey];

  const total = subtotal + marginAmount + deliveryCost;

  return {
    ok: true,
    warnings,
    quote: {
      currency: CURRENCY,
      furnitureType: typeKey,
      furnitureLabel: type.label,
      material: { key: matKey, label: material.label },
      dimensions: dims,
      panelAreaM2: round(panelArea),
      lineItems: [
        { label: `Material — ${material.label} (${round(panelArea)} m²)`, amount: round(materialCost) },
        { label: `Doors & handles (${doorCount}× ${handle.label}, ${doorType.label})`, amount: round(handleCost + hingeCost + doorSurcharge) },
        { label: `Drawers (${drawerRows} row${drawerRows === 1 ? "" : "s"})`, amount: round(drawerCost) },
        { label: "Hanger rod", amount: round(hangerCost) },
        { label: "Fixings & assembly hardware", amount: round(confirmatCost) },
        { label: `LED lighting (${led.label})`, amount: round(ledCost) },
        { label: `Labour & production`, amount: round(laborCost) },
        { label: `Margin (${Math.round(MARGIN * 100)}%)`, amount: round(marginAmount) },
        { label: `Delivery (${deliveryKey.replace(/_/g, " ")})`, amount: round(deliveryCost) },
      ].filter((li) => li.amount > 0 || li.label.startsWith("Material") || li.label.startsWith("Labour")),
      breakdown: {
        material: round(materialCost),
        hardware: round(hardwareCost),
        labor: round(laborCost),
        margin: round(marginAmount),
        delivery: round(deliveryCost),
      },
      total: round(total),
    },
  };
}

/** One-line human-readable summary, handy for WhatsApp/SMS. */
export function quoteSummaryLine(quote) {
  const d = quote.dimensions;
  return `${d.width}m ${quote.material.label} ${quote.furnitureLabel.toLowerCase()}: ` +
    Object.entries(quote.breakdown)
      .map(([k, v]) => `${v} ${k}`)
      .join(" + ") +
    ` = ${quote.total} ${quote.currency}`;
}

// --- helpers ---------------------------------------------------------------
function numOr(v, fallback) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
