/**
 * production.js — the factory output. Pure, deterministic, no AI.
 * ===============================================================
 * Turns a FROZEN order config into the data the factory needs:
 *   • a cut list (panels in mm, with edge banding + grain)
 *   • a CSV string ready to save / hand to the operator / enter into BAZIS
 *   • a production-pack data object (header + cut list + drilling + summary)
 *     that a PDF renderer turns into the printable factory sheet.
 *
 * Same order in → identical files out, every time. A drill position is maths,
 * never a guess. This is the CNC/PDF path agreed for the factory (no CAD, no
 * 3D-mesh export — BAZIS or the operator works from PDF + CSV).
 */
import { buildGeometry, partsToCutList } from "./buildGeometry.js";
import { MATERIALS } from "./knowledgeBase.js";

const PANEL_THK_MM = 18;

/** Decide edge banding + grain per part role (simple, factory-sane defaults). */
function finishFor(role) {
  switch (role) {
    case "door":
    case "drawerFront":
      return { edgeBanding: "All edges: 2mm PVC", grain: "Vertical" };
    case "side":
      return { edgeBanding: "Front edge: 2mm PVC", grain: "Vertical" };
    case "shelf":
      return { edgeBanding: "Front edge: 1mm PVC", grain: "Horizontal" };
    case "top":
    case "bottom":
      return { edgeBanding: "Front edge: 2mm PVC", grain: "Horizontal" };
    case "back":
      return { edgeBanding: "None", grain: "—" };
    default:
      return { edgeBanding: "Front edge: 1mm PVC", grain: "—" };
  }
}

/** Build the enriched cut list (mm) from a config. */
export function buildCutList(config) {
  const parts = buildGeometry(config);
  const rows = partsToCutList(parts).map((r, i) => {
    const f = finishFor(r.role);
    return {
      partId: `${r.role.slice(0, 2).toUpperCase()}-${String(i + 1).padStart(2, "0")}`,
      partName: prettyRole(r.role),
      material: MATERIALS[r.material]?.label || r.material,
      length: r.length,
      width: r.width,
      thickness: r.thickness,
      qty: r.qty,
      edgeBanding: f.edgeBanding,
      grain: f.grain,
    };
  });
  return rows;
}

/** Drilling / hardware spec derived from the config (mm). */
export function buildDrillingSpec(config) {
  const spec = [];
  const H = Math.round(config.dimensions.height * 1000);
  (config.modules || []).forEach((m, i) => {
    if (m.doorCount > 0) {
      const hinges = H > 1800 ? 5 : H > 1200 ? 4 : 3;
      spec.push(`Section ${i + 1}: ${m.doorCount} door(s), ${hinges} hinge cups Ø35mm × 12.5mm deep per door, hinge side ${m.hingeSide}.`);
    }
    if (m.drawerRows > 0) {
      spec.push(`Section ${i + 1}: ${m.drawerRows} drawer slide pair(s), full-extension, pilot holes per slide template.`);
    }
    if (m.shelfCount > 0) {
      spec.push(`Section ${i + 1}: shelf-pin holes Ø5mm, 32mm system, ${m.shelfCount} adjustable shelf position(s).`);
    }
  });
  spec.push("Carcass joinery: confirmat Ø4.5mm pilot holes per connector map; back panel groove 6mm × 10mm, 12mm from rear edge.");
  return spec;
}

/** Full production-pack data — the PDF renderer consumes this. */
export function buildProductionPack(order) {
  const { orderId, config, customer = {}, price = null, createdAt = new Date().toISOString() } = order;
  const d = config.dimensions;
  return {
    orderId,
    createdAt,
    header: {
      furnitureType: config.type,
      style: config.style,
      material: MATERIALS[config.material]?.label || config.material,
      dimensionsMm: {
        width: Math.round(d.width * 1000),
        height: Math.round(d.height * 1000),
        depth: Math.round(d.depth * 1000),
      },
      customerName: customer.name || "—",
      deliveryZone: customer.deliveryZone || "—",
      priceAed: price,
    },
    cutList: buildCutList(config),
    drilling: buildDrillingSpec(config),
    summary: summarise(config),
  };
}

/** Cut list → CSV string (English headers, mm). Filename should include orderId. */
export function cutListToCSV(orderId, config) {
  const rows = buildCutList(config);
  const header = ["OrderID", "PartID", "PartName", "Material", "Length_mm", "Width_mm", "Thickness_mm", "Qty", "EdgeBanding", "Grain"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      orderId, r.partId, csv(r.partName), csv(r.material),
      r.length, r.width, r.thickness, r.qty, csv(r.edgeBanding), csv(r.grain),
    ].join(","));
  }
  return lines.join("\r\n");
}

// --- helpers ---------------------------------------------------------------
function summarise(config) {
  const parts = buildGeometry(config);
  const byRole = parts.reduce((a, p) => ((a[p.role] = (a[p.role] || 0) + 1), a), {});
  return {
    totalParts: parts.length,
    panelThicknessMm: PANEL_THK_MM,
    sections: (config.modules || []).length,
    partsByRole: byRole,
  };
}
function prettyRole(role) {
  return {
    side: "Side Panel", top: "Top Panel", bottom: "Bottom Panel", back: "Back Panel",
    plinth: "Plinth", divider: "Divider", shelf: "Shelf", door: "Door", drawerFront: "Drawer Front",
  }[role] || role;
}
function csv(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
