/**
 * FurnitureKnowledgeService (Section 18) — single entry point the brain and
 * validator use to look up category rules. Everything else in this
 * directory is data; this file is the only place that dispatches on
 * furniture_type, so adding a category later means one new branch here
 * plus (ideally) its own dedicated rules file like wardrobe.js.
 */
import * as wardrobe from "./wardrobe.js";
import { genericKnowledgeFor } from "./genericCategory.js";
import { FURNITURE_TYPES } from "../fsl/enums.js";

export { CONFIGURATOR_TYPE_MAP, isConfiguratorSupportedType, configuratorTypeFor } from "./categories.js";
export { CONFIGURATOR_COMPONENT_SUPPORT, componentSupport, isComponentConfiguratorSupported } from "./components.js";
export { pickConfiguratorMaterialKey, isKnownConfiguratorMaterialKey } from "./materials.js";

function wardrobeKnowledge() {
  return {
    furnitureType: wardrobe.FURNITURE_TYPE,
    dimensionRules: wardrobe.DIMENSION_RULES,
    defaultMaterials: wardrobe.DEFAULT_MATERIALS,
    defaultStyle: wardrobe.DEFAULT_STYLE,
    allowedComponents: wardrobe.ALLOWED_COMPONENTS,
    semanticWarnings: wardrobe.semanticWarnings,
    defaultComponentQuantity: wardrobe.defaultComponentQuantity,
    defaultComponentProperties: wardrobe.defaultComponentProperties,
    defaultMaterialRefFor: wardrobe.defaultMaterialRefFor,
  };
}

const KNOWLEDGE_BY_TYPE = {
  wardrobe: wardrobeKnowledge,
};

/** The only category with dedicated rules today — everything else uses the generic fallback. */
export const CATEGORIES_WITH_DEDICATED_KNOWLEDGE = Object.freeze(Object.keys(KNOWLEDGE_BY_TYPE));

/**
 * @param {string} furnitureType one of fsl/enums FURNITURE_TYPES
 * @returns normalized knowledge: { furnitureType, dimensionRules, defaultMaterials, defaultStyle, allowedComponents, semanticWarnings }
 */
export function getCategoryKnowledge(furnitureType) {
  if (!FURNITURE_TYPES.includes(furnitureType)) return null;
  const dedicated = KNOWLEDGE_BY_TYPE[furnitureType];
  return dedicated ? dedicated() : genericKnowledgeFor(furnitureType);
}
