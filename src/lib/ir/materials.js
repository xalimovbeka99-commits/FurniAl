/**
 * MaterialEngine (v0) — minimal, per vision Section 19: "Initial
 * implementation: WHITE_MDF_18." One material family, a few colours, enough
 * to prove the pipeline. Add more when a rule set actually needs them.
 *
 * The visual colour and the manufacturing materialId are the SAME key —
 * no separate "render material" vs "production material" to keep in sync.
 */
export const MATERIALS = {
  WHITE_MDF_18: { label: "White MDF 18mm", category: "MDF", thicknessMm: 18, color: "#f2efe9" },
  BLACK_MDF_18: { label: "Black MDF 18mm", category: "MDF", thicknessMm: 18, color: "#232323" },
  OAK_PLY_18: { label: "Oak Plywood 18mm", category: "PLYWOOD", thicknessMm: 18, color: "#c8a878" },
  WALNUT_MFC_18: { label: "Walnut MFC 18mm", category: "MFC", thicknessMm: 18, color: "#5b3a29" },
};

export const DEFAULT_MATERIAL_ID = "WHITE_MDF_18";

export function isKnownMaterial(id) {
  return Object.prototype.hasOwnProperty.call(MATERIALS, id);
}
