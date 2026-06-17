"use client";

/**
 * StructurePanel (LEFT) — what the piece IS.
 * Furniture type, and per-module structure: kind, door/drawer/shelf counts.
 * Click a door/drawer in the 3D view to select its module here.
 */
import { useFurnitureStore } from "@/store/furnitureStore";
import { FURNITURE_TYPES } from "@/lib/knowledgeBase";

const MODULE_KINDS = [
  ["door", "Doors"],
  ["drawerBank", "Drawers"],
  ["openShelf", "Open shelves"],
  ["applianceGap", "Appliance gap"],
];

export default function StructurePanel() {
  const config = useFurnitureStore((s) => s.config);
  const setType = useFurnitureStore((s) => s.setType);
  const addModule = useFurnitureStore((s) => s.addModule);
  const removeModule = useFurnitureStore((s) => s.removeModule);
  const updateModule = useFurnitureStore((s) => s.updateModule);
  const selectedModule = useFurnitureStore((s) => s.selectedModule);
  const selectModule = useFurnitureStore((s) => s.selectModule);

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-r border-neutral-200 bg-white p-4 text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Structure</h2>

      <label className="mb-1 block text-neutral-600">Furniture type</label>
      <select
        className="mb-5 w-full rounded border border-neutral-300 px-2 py-1.5"
        value={config.type}
        onChange={(e) => setType(e.target.value)}
      >
        {Object.entries(FURNITURE_TYPES).map(([key, t]) => (
          <option key={key} value={key}>{t.label}</option>
        ))}
      </select>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-neutral-600">Sections ({config.modules.length})</span>
        <button onClick={addModule} className="rounded bg-neutral-900 px-2 py-1 text-xs text-white">
          Add section
        </button>
      </div>

      <div className="space-y-2">
        {config.modules.map((m, i) => {
          const selected = selectedModule === i;
          return (
            <div
              key={i}
              onClick={() => selectModule(i)}
              className={`cursor-pointer rounded border p-3 ${
                selected ? "border-emerald-600 bg-emerald-50" : "border-neutral-200"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Section {i + 1}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeModule(i); }}
                  className="text-xs text-neutral-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>

              <select
                className="mb-2 w-full rounded border border-neutral-300 px-2 py-1"
                value={m.kind}
                onChange={(e) => updateModule(i, { kind: e.target.value })}
              >
                {MODULE_KINDS.map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>

              {m.kind === "door" && (
                <Row label="Doors" value={m.doorCount}
                  onChange={(v) => updateModule(i, { doorCount: v })} min={1} max={4} />
              )}
              {m.kind === "drawerBank" && (
                <Row label="Drawer rows" value={m.drawerRows}
                  onChange={(v) => updateModule(i, { drawerRows: v })} min={1} max={6} />
              )}
              {(m.kind === "door" || m.kind === "openShelf") && (
                <Row label="Shelves" value={m.shelfCount}
                  onChange={(v) => updateModule(i, { shelfCount: v })} min={0} max={8} />
              )}
              {m.kind === "door" && (
                <div className="mt-2 flex gap-1">
                  {["left", "right"].map((side) => (
                    <button key={side}
                      onClick={(e) => { e.stopPropagation(); updateModule(i, { hingeSide: side }); }}
                      className={`flex-1 rounded border px-2 py-1 text-xs ${
                        m.hingeSide === side ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
                      }`}>
                      Hinge {side}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function Row({ label, value, onChange, min, max }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <span className="text-neutral-600">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); onChange(Math.max(min, value - 1)); }}
          className="h-6 w-6 rounded border border-neutral-300">−</button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <button onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + 1)); }}
          className="h-6 w-6 rounded border border-neutral-300">+</button>
      </div>
    </div>
  );
}
