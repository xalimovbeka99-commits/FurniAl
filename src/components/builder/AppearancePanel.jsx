"use client";

/**
 * AppearancePanel (RIGHT) — how the piece LOOKS and its real size.
 * Dimensions (snapped to manufacturable ranges), material, handle, door type,
 * LED, plinth — plus a live indicative price using the shared pricing model.
 */
import { useMemo } from "react";
import { useFurnitureStore } from "@/store/furnitureStore";
import {
  MATERIALS, HANDLE_STYLES, DOOR_TYPES, LED_LIGHTING,
} from "@/lib/knowledgeBase";

export default function AppearancePanel() {
  const config = useFurnitureStore((s) => s.config);
  const setDimension = useFurnitureStore((s) => s.setDimension);
  const setMaterial = useFurnitureStore((s) => s.setMaterial);
  const setHandleStyle = useFurnitureStore((s) => s.setHandleStyle);
  const setDoorType = useFurnitureStore((s) => s.setDoorType);
  const setLed = useFurnitureStore((s) => s.setLed);
  const setPlinth = useFurnitureStore((s) => s.setPlinth);

  const { width, height, depth } = config.dimensions;

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-[#EDE8DC] bg-[#FAF9F5]/90 backdrop-blur-sm p-4 text-sm shadow-sm flex flex-col">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#5C626E]">Appearance & size</h2>

      <div className="flex-1 overflow-y-auto pr-1">
        <Slider label="Width" value={width} min={0.3} max={6} step={0.05}
          onChange={(v) => setDimension("width", v)} />
        <Slider label="Height" value={height} min={0.3} max={3} step={0.05}
          onChange={(v) => setDimension("height", v)} />
        <Slider label="Depth" value={depth} min={0.2} max={1.2} step={0.05}
          onChange={(v) => setDimension("depth", v)} />

        <Select label="Material" value={config.material} onChange={setMaterial}
          options={Object.entries(MATERIALS).map(([k, m]) => [k, m.label])} />
        <Select label="Handle" value={config.handleStyle} onChange={setHandleStyle}
          options={Object.entries(HANDLE_STYLES).map(([k, h]) => [k, h.label])} />
        <Select label="Door type" value={config.doorType} onChange={setDoorType}
          options={Object.entries(DOOR_TYPES).map(([k, d]) => [k, d.label])} />
        <Select label="LED lighting" value={config.ledLighting} onChange={setLed}
          options={Object.entries(LED_LIGHTING).map(([k, l]) => [k, l.label])} />

        <label className="mb-4 mt-2 flex items-center gap-2.5 cursor-pointer select-none text-xs text-[#5C626E] font-semibold hover:text-[#1C1E21] transition-colors">
          <input 
            type="checkbox" 
            checked={config.hasPlinth} 
            onChange={(e) => setPlinth(e.target.checked)} 
            className="rounded border-[#DFD9CC] text-[#00B4D8] focus:ring-[#00B4D8] h-4 w-4"
          />
          <span>Plinth / base</span>
        </label>

        {config.ai?.source && config.ai.source !== "default" && (
          <p className="mb-4 rounded-lg border border-[#C5A880]/30 bg-[#FAF6EE] p-2.5 text-xs text-[#C5A880] font-medium shadow-sm">
            Generated from your selection ({config.ai.source}). Confirm the real dimensions for your space.
          </p>
        )}
      </div>

      <OrderBadge config={config} />
    </aside>
  );
}

function OrderBadge({ config }) {
  const waLink = useMemo(() => {
    const { width: W, height: H, depth: D } = config.dimensions;
    const msg = encodeURIComponent(
      `Hi FurniAI! I'd like to order:\n` +
      `Type: ${config.type}\n` +
      `Material: ${config.material}\n` +
      `Size: ${(W * 1000).toFixed(0)}mm W × ${(H * 1000).toFixed(0)}mm H × ${(D * 1000).toFixed(0)}mm D\n` +
      `Door: ${config.doorType} | Handle: ${config.handleStyle} | LED: ${config.ledLighting}`
    );
    return `https://wa.me/?text=${msg}`;
  }, [config]);

  return (
    <div className="mt-auto rounded-xl border border-[#00B4D8]/20 bg-[#FAF9F5] p-4 text-[#1C1E21] shadow-inner relative overflow-hidden">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#C5A880] to-[#00B4D8]"></div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#5C626E] mb-2">Ready to order?</div>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] text-white font-mono text-[11px] tracking-wider py-2.5 hover:bg-[#1ebe5d] transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.852L.057 23.25a.75.75 0 00.916.916l5.398-1.475A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.95 0-3.775-.557-5.32-1.517l-.38-.233-3.942 1.077 1.077-3.942-.234-.382A9.952 9.952 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        Order via WhatsApp
      </a>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#5C626E]">
        <span>{label}</span>
        <span className="tabular-nums font-mono text-[#1C1E21]">{value.toFixed(2)} m</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs font-semibold text-[#5C626E]">{label}</label>
      <select 
        className="w-full rounded-lg border border-[#DFD9CC] bg-[#FAF9F5] px-3 py-2 text-xs text-[#1C1E21] focus:border-[#00B4D8] focus:outline-none transition-colors duration-150 shadow-sm"
        value={value} onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </div>
  );
}
