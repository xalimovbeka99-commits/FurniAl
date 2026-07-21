/**
 * Configurator Adapter (Section 4 / 26) — the ONLY bridge from a validated
 * FSL document to `/builder`'s existing FurnitureConfig shape. Nothing
 * upstream of this file (brain, validator) knows FurnitureConfig exists;
 * nothing downstream of this file (buildGeometry.js, FurnitureModel.jsx)
 * changes. It always finishes by calling the EXISTING `validateConfig()`
 * safety gate — this module never hands buildGeometry.js a raw object of
 * its own invention.
 *
 * FSL models a flat "N doors / N drawers / N shelves for the whole piece";
 * `/builder` models vertical modules (bays) with per-module counts. This
 * is a real structural mismatch, not a missing field — the translation
 * below is a deliberate, documented approximation:
 *   - each hinged/sliding door becomes its OWN module (realistic door
 *     widths) rather than N doors crammed into one module.
 *   - drawers become one drawerBank module (capped at 6 rows — the
 *     existing configSchema limit).
 *   - shelves are distributed across door modules when doors exist
 *     (shelves live behind wardrobe doors in practice); otherwise they
 *     become one standalone openShelf module.
 *   - hanging rails, drawer boxes, legs, countertops, mirrors-as-objects,
 *     and multi-cabinet layouts have no equivalent — see
 *     furniture-knowledge/components.js for the full support table.
 */
import { validateConfig } from "../configSchema.js";
import { HANDLE_STYLES } from "../knowledgeBase.js";
import { configuratorTypeFor, isConfiguratorSupportedType, pickConfiguratorMaterialKey } from "../furniture-knowledge/index.js";

const HANDLE_KEYWORDS = [
  ["gold", "gold_bar"],
  ["silver", "silver_knob"],
  ["black", "black_strip"],
  ["chrome", "chrome"],
  ["hidden", "hidden_push"],
  ["push", "hidden_push"],
  ["none", "hidden_push"],
  ["handleless", "hidden_push"],
  ["minimal", "hidden_push"],
];

function mapHandleStyle(handleStyleText) {
  const text = (handleStyleText || "").toLowerCase();
  for (const [keyword, key] of HANDLE_KEYWORDS) {
    if (text.includes(keyword) && HANDLE_STYLES[key]) return key;
  }
  return undefined; // let configSchema's own base default apply
}

function mapDoorType({ style, components }) {
  const text = (style?.door_style || "").toLowerCase();
  const hasMirrorComponent = components.some((c) => c.type === "mirror");
  if (text.includes("mirror") || hasMirrorComponent) return "full_mirror";
  if (text.includes("frosted")) return "frosted_glass";
  if (text.includes("glass")) return "glass_panel";
  return "solid_panel";
}

function mapLedLighting(components) {
  const led = components.find((c) => c.type === "internal_led");
  if (!led) return "off";
  const mode = String(led.properties?.mode || "").toLowerCase();
  if (mode.includes("rgb")) return "rgb";
  if (mode.includes("cool")) return "cool";
  return "warm"; // a visible default when LED was requested without a specific color temperature
}

/** Build the door/drawer/shelf module list, or null to fall back to the type's own default layout. */
function buildModules(components) {
  const doorInstances = [];
  for (const c of components) {
    if (c.type === "hinged_door") for (let i = 0; i < c.quantity; i++) doorInstances.push("hinged");
    if (c.type === "sliding_door") for (let i = 0; i < c.quantity; i++) doorInstances.push("sliding");
  }
  const drawerTotal = components.filter((c) => c.type === "drawer").reduce((s, c) => s + c.quantity, 0);
  const shelfTotal = components.filter((c) => c.type === "shelf" || c.type === "open_shelf").reduce((s, c) => s + c.quantity, 0);

  if (doorInstances.length === 0 && drawerTotal === 0 && shelfTotal === 0) return null;

  const cappedDoors = doorInstances.slice(0, 6); // configSchema caps the whole modules array at 8 anyway
  const modules = cappedDoors.map((kind, i) => ({
    kind: "door",
    widthRatio: 1,
    doorCount: 1,
    drawerRows: 0,
    shelfCount: 0,
    hingeSide: i % 2 === 0 ? "left" : "right",
    slideType: kind === "sliding" ? "sliding" : "hinged",
  }));

  if (shelfTotal > 0) {
    if (modules.length > 0) {
      const per = Math.floor(shelfTotal / modules.length);
      let remainder = shelfTotal - per * modules.length;
      modules.forEach((m) => {
        m.shelfCount = per + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
      });
    } else {
      modules.push({ kind: "openShelf", widthRatio: 1, doorCount: 0, drawerRows: 0, shelfCount: Math.min(shelfTotal, 8), hingeSide: "left", slideType: "hinged" });
    }
  }

  if (drawerTotal > 0) {
    modules.push({ kind: "drawerBank", widthRatio: 1, doorCount: 0, drawerRows: Math.min(drawerTotal, 6), shelfCount: 0, hingeSide: "left", slideType: "hinged" });
  }

  return modules;
}

/**
 * @param {object} fsl a candidate FSL document (need not be error-free — partial mapping is attempted whenever the type is supported)
 * @returns {{ attempted: boolean, config: object|null, warnings: string[] }}
 *   attempted=false means furniture_type has no configurator mapping at all — nothing to map.
 */
export function fslToFurnitureConfig(fsl) {
  const fslType = fsl.project?.furniture_type;
  if (!isConfiguratorSupportedType(fslType)) {
    return { attempted: false, config: null, warnings: [] };
  }

  const components = fsl.components || [];
  const materialMatch = pickConfiguratorMaterialKey({ primary_color: fsl.style?.primary_color, finish: fsl.materials?.facades?.finish });
  const modules = buildModules(components);

  const raw = {
    type: configuratorTypeFor(fslType),
    style: fsl.style?.theme || undefined,
    material: materialMatch.key,
    handleStyle: mapHandleStyle(fsl.style?.handle_style),
    doorType: mapDoorType({ style: fsl.style, components }),
    ledLighting: mapLedLighting(components),
    hasPlinth: components.some((c) => c.type === "plinth") ? true : undefined,
    dimensions: {
      width: fsl.dimensions?.width_mm != null ? fsl.dimensions.width_mm / 1000 : undefined,
      height: fsl.dimensions?.height_mm != null ? fsl.dimensions.height_mm / 1000 : undefined,
      depth: fsl.dimensions?.depth_mm != null ? fsl.dimensions.depth_mm / 1000 : undefined,
    },
    ...(modules ? { modules } : {}),
  };

  const { config, warnings } = validateConfig(raw, { source: modules ? "text" : "template" });
  if (!materialMatch.matched) {
    warnings.push(`No confident material/colour match for "${fsl.style?.primary_color || "unspecified"}" — used the default swatch.`);
  }
  return { attempted: true, config, warnings };
}
