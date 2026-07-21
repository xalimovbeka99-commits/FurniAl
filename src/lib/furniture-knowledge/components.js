/**
 * Furniture knowledge — component support map (Section 14).
 * ----------------------------------------------------------------------
 * Honest, per-component mapping from the FSL component vocabulary onto
 * what `/builder`'s buildGeometry.js actually produces today. This is
 * read by the FSL validator (for warnings) and the configurator adapter
 * (for `unsupported_fields`) — one source, so they can't disagree.
 *
 * mode:
 *   "mapped"      -> translates into a real FurnitureConfig field/part.
 *   "implicit"    -> always present on any carcass (a side panel exists
 *                    whether or not the request mentions it); not
 *                    independently controllable per-component yet.
 *   "unsupported" -> FSL can describe it; the configurator cannot render
 *                    it yet at any fidelity.
 */
import { COMPONENT_TYPES } from "../fsl/enums.js";

export const CONFIGURATOR_COMPONENT_SUPPORT = Object.freeze({
  side_panel: { mode: "implicit", note: "Generated automatically as part of the carcass shell." },
  top_panel: { mode: "implicit", note: "Generated automatically as part of the carcass shell." },
  bottom_panel: { mode: "implicit", note: "Generated automatically as part of the carcass shell." },
  back_panel: { mode: "implicit", note: "Generated automatically as part of the carcass shell." },
  divider: { mode: "implicit", note: "Generated automatically between modules." },
  shelf: { mode: "mapped", note: "Maps to a module's shelfCount." },
  open_shelf: { mode: "mapped", note: "Maps to an openShelf module." },
  hinged_door: { mode: "mapped", note: "Maps to a module's doorCount with hingeSide." },
  sliding_door: {
    mode: "unsupported",
    note: "Stored as data but rendered identically to a hinged door — no distinct slide mechanism exists in the current configurator.",
  },
  drawer: { mode: "mapped", note: "Maps to a module's drawerRows (front panel only)." },
  drawer_box: { mode: "unsupported", note: "Only the drawer front is modelled, not a full interior box." },
  hanging_rail: { mode: "unsupported", note: "No hanging-rail geometry exists in the current configurator." },
  handle: { mode: "mapped", note: "Maps to the single piece-wide handleStyle — not positioned per instance." },
  mirror: { mode: "mapped", note: "Only supported as a door finish (doorType full_mirror), not a freestanding mirror." },
  internal_led: { mode: "mapped", note: "Maps to the piece-wide ledLighting mode (warm/cool/rgb)." },
  plinth: { mode: "mapped", note: "Maps to hasPlinth + plinthHeight." },
  leg: { mode: "unsupported", note: "No leg geometry exists in the current configurator." },
  countertop: { mode: "unsupported", note: "No countertop panel exists in the current configurator." },
  base_cabinet: { mode: "unsupported", note: "The configurator models one carcass, not a multi-cabinet run." },
  wall_cabinet: { mode: "unsupported", note: "The configurator models one carcass, not a multi-cabinet run." },
  tall_cabinet: { mode: "unsupported", note: "The configurator models one carcass, not a multi-cabinet run." },
  corner_cabinet: { mode: "unsupported", note: "Corner geometry is not modelled by buildGeometry.js." },
  end_panel: { mode: "unsupported", note: "Not modelled as an independent part." },
  filler_panel: { mode: "unsupported", note: "Not modelled as an independent part." },
});

// Defense-in-depth: every COMPONENT_TYPES entry must have a support row, and
// vice versa, or the two files have silently drifted apart.
const supportKeys = Object.keys(CONFIGURATOR_COMPONENT_SUPPORT);
const missing = COMPONENT_TYPES.filter((t) => !supportKeys.includes(t));
if (missing.length > 0) {
  throw new Error(`CONFIGURATOR_COMPONENT_SUPPORT is missing entries for: ${missing.join(", ")}`);
}

export function componentSupport(type) {
  return CONFIGURATOR_COMPONENT_SUPPORT[type] || { mode: "unsupported", note: "Unknown component type." };
}

export function isComponentConfiguratorSupported(type) {
  return componentSupport(type).mode !== "unsupported";
}
