/**
 * furnitureStore — the live FurnitureConfig + every action that mutates it.
 * ------------------------------------------------------------------------
 * Both tool panels (left = structure, right = appearance) and the AI loader
 * write through these actions. The 3D model reads `config` and rebuilds.
 *
 * This replaces the old store that held hardcoded kitchen/wardrobe models.
 * If you already have a furnitureStore.js, merge these actions into it rather
 * than keeping two stores.
 */
import { create } from "zustand";
import {
  createDefaultConfig,
  clampDimension,
} from "@/lib/furnitureConfig";

export const useFurnitureStore = create((set) => ({
  config: createDefaultConfig("wardrobe"),
  selectedModule: null, // index of module being edited, or null

  // --- whole-config ---------------------------------------------------------
  /** Replace the entire config (used by the gallery/AI loader in Stage 2/3). */
  loadConfig: (config) => set({ config, selectedModule: null }),

  /** Switch furniture type — regenerates a fresh default layout for it. */
  setType: (type) => set({ config: createDefaultConfig(type), selectedModule: null }),

  // --- appearance (right panel) --------------------------------------------
  setMaterial: (material) => set((s) => ({ config: { ...s.config, material } })),
  setStyle: (style) => set((s) => ({ config: { ...s.config, style } })),
  setHandleStyle: (handleStyle) => set((s) => ({ config: { ...s.config, handleStyle } })),
  setDoorType: (doorType) => set((s) => ({ config: { ...s.config, doorType } })),
  setLed: (ledLighting) => set((s) => ({ config: { ...s.config, ledLighting } })),
  setPlinth: (hasPlinth) => set((s) => ({ config: { ...s.config, hasPlinth } })),

  setDimension: (axis, value) =>
    set((s) => ({
      config: {
        ...s.config,
        dimensions: { ...s.config.dimensions, [axis]: clampDimension(axis, value) },
      },
    })),

  // --- structure (left panel) ----------------------------------------------
  selectModule: (index) => set({ selectedModule: index }),

  addModule: () =>
    set((s) => {
      const modules = [
        ...s.config.modules,
        { kind: "door", widthRatio: 0.25, doorCount: 1, drawerRows: 0, shelfCount: 2, hingeSide: "left", slideType: "hinged" },
      ];
      return { config: { ...s.config, modules } };
    }),

  removeModule: (index) =>
    set((s) => {
      if (s.config.modules.length <= 1) return s; // keep at least one
      const modules = s.config.modules.filter((_, i) => i !== index);
      return { config: { ...s.config, modules }, selectedModule: null };
    }),

  updateModule: (index, patch) =>
    set((s) => {
      const modules = s.config.modules.map((m, i) => (i === index ? { ...m, ...patch } : m));
      return { config: { ...s.config, modules } };
    }),

  setModuleRatio: (index, widthRatio) =>
    set((s) => {
      const modules = s.config.modules.map((m, i) =>
        i === index ? { ...m, widthRatio: Math.max(0.05, widthRatio) } : m
      );
      return { config: { ...s.config, modules } };
    }),
}));
