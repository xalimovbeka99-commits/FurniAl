/**
 * buildGeometry — pure function: FurnitureConfig -> flat list of parts.
 * --------------------------------------------------------------------
 * No Three.js, no React. Just maths. Each part is:
 *   { id, role, size: [w, h, d] (metres), position: [x, y, z] (centre), material }
 *
 * The SAME list is rendered as <boxGeometry> meshes AND converted to a cut list.
 * That's the whole point: the model is parametric all the way down to the panel,
 * so anything you see can be cut, priced, and machined.
 *
 * Coordinate frame: piece is centred on X, sits on the floor at Y=0, depth
 * centred on Z. Units are metres.
 */
import { PANEL_THICKNESS as T, BACK_THICKNESS as BT, normaliseModules } from "./furnitureConfig.js";

export function buildGeometry(config) {
  const parts = [];
  const { width: W, height: H, depth: D } = config.dimensions;
  const mat = config.material;
  let id = 0;
  const push = (role, size, position, extra = {}) =>
    parts.push({ id: `P${id++}`, role, size, position, material: mat, ...extra });

  // Plinth raises the carcass; everything above sits on top of it.
  const plinth = config.hasPlinth ? config.plinthHeight : 0;
  const carcassH = H - plinth;
  const baseY = plinth;             // floor of the carcass interior
  const midY = baseY + carcassH / 2;

  // --- Carcass shell -------------------------------------------------------
  // Sides
  push("side", [T, carcassH, D], [-W / 2 + T / 2, midY, 0]);
  push("side", [T, carcassH, D], [W / 2 - T / 2, midY, 0]);
  // Top + bottom (between the sides)
  const innerW = W - 2 * T;
  push("top", [innerW, T, D], [0, baseY + carcassH - T / 2, 0]);
  push("bottom", [innerW, T, D], [0, baseY + T / 2, 0]);
  // Back
  push("back", [innerW, carcassH - 2 * T, BT], [0, midY, -D / 2 + BT / 2]);

  // Plinth (recessed slightly)
  if (plinth > 0) {
    push("plinth", [W - 0.04, plinth, T], [0, plinth / 2, D / 2 - 0.05]);
  }

  // --- Modules (vertical bays, left -> right) ------------------------------
  const modules = normaliseModules(config.modules || []);
  const interiorLeft = -W / 2 + T;     // inner face of left side
  const interiorW = innerW;
  const interiorBottom = baseY + T;
  const interiorH = carcassH - 2 * T;

  let cursorX = interiorLeft;
  modules.forEach((mod, i) => {
    const modW = interiorW * mod.widthRatio;
    const modCenterX = cursorX + modW / 2;

    // Divider between modules (not after the last one)
    if (i < modules.length - 1) {
      push("divider", [T, interiorH, D - BT], [cursorX + modW + T / 2, midY, BT / 2]);
    }

    // Shelves
    if (mod.shelfCount > 0) {
      const gaps = mod.shelfCount + 1;
      for (let s = 1; s <= mod.shelfCount; s++) {
        const y = interiorBottom + (interiorH * s) / gaps;
        push("shelf", [modW - 0.004, T, D - BT - 0.02], [modCenterX, y, BT / 2], { module: i });
      }
    }

    // Drawer fronts
    if (mod.drawerRows > 0) {
      const rowH = interiorH / mod.drawerRows;
      for (let r = 0; r < mod.drawerRows; r++) {
        const y = interiorBottom + rowH * (r + 0.5);
        push("drawerFront", [modW - 0.006, rowH - 0.006, T], [modCenterX, y, D / 2 - T / 2], {
          module: i,
          handle: config.handleStyle,
        });
      }
    }

    // Doors
    if (mod.doorCount > 0) {
      const doorW = modW / mod.doorCount;
      for (let dn = 0; dn < mod.doorCount; dn++) {
        const x = cursorX + doorW * (dn + 0.5);
        push("door", [doorW - 0.006, interiorH - 0.006, T], [x, interiorBottom + interiorH / 2, D / 2 - T / 2], {
          module: i,
          hingeSide: mod.hingeSide,
          doorType: config.doorType,
          handle: config.handleStyle,
        });
      }
    }

    cursorX += modW + (i < modules.length - 1 ? T : 0);
  });

  return parts;
}

/** Total finished panel area in m² (drives material cost). */
export function panelAreaFromParts(parts) {
  // Largest face of each part × quantity (parts already expanded, qty = 1 each).
  return parts.reduce((sum, p) => {
    const [w, h, d] = p.size;
    const faces = [w * h, w * d, h * d].sort((a, b) => b - a);
    return sum + faces[0];
  }, 0);
}

/** Convert parts to a factory cut list (mm), grouped by identical dimensions. */
export function partsToCutList(parts) {
  const mm = (m) => Math.round(m * 1000);
  const map = new Map();
  for (const p of parts) {
    const [w, h, d] = p.size;
    // length = longest, width = next, thickness = smallest
    const [length, width, thk] = [w, h, d].sort((a, b) => b - a);
    const key = `${p.role}|${mm(length)}x${mm(width)}x${mm(thk)}|${p.material}`;
    const row = map.get(key);
    if (row) row.qty += 1;
    else
      map.set(key, {
        role: p.role,
        length: mm(length),
        width: mm(width),
        thickness: mm(thk),
        material: p.material,
        qty: 1,
      });
  }
  return [...map.values()];
}
