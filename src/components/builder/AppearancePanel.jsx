"use client";

/**
 * AppearancePanel (RIGHT) — how the piece LOOKS and its real size.
 * Dimensions (snapped to manufacturable ranges), material, handle, door type,
 * LED, plinth — plus a live indicative price using the shared pricing model.
 */
import { useMemo } from "react";
import { useFurnitureStore } from "@/store/furnitureStore";
import {
  MATERIALS, HANDLE_STYLES, DOOR_TYPES, LED_LIGHTING, CURRENCY,
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

      <PriceBadge config={config} />
    </aside>
  );
}

function PriceBadge({ config }) {
  // Lightweight client estimate. The authoritative quote still comes from
  // /api/quote (pricing.js) — this is just live feedback while editing.
  const total = useMemo(() => estimate(config), [config]);
  return (
    <div className="mt-auto rounded-xl border border-[#00B4D8]/20 bg-[#FAF9F5] p-4 text-[#1C1E21] shadow-inner relative overflow-hidden">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#C5A880] to-[#00B4D8]"></div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#5C626E] mb-0.5">Indicative price</div>
      <div className="text-2xl font-bold font-mono tracking-tight text-[#00B4D8] tabular-nums">
        {total.toLocaleString()} <span className="text-xs font-sans font-medium text-[#5C626E]">{CURRENCY}</span>
      </div>
      <div className="mt-1 text-[10px] leading-tight text-[#5C626E]/80">Estimate — final quote confirmed at checkout</div>
    </div>
  );
}

// Mirror of the server pricing model, kept intentionally simple for live UI.
function estimate(config) {
  const { width: W, height: H, depth: D } = config.dimensions;
  const surface = 2 * (W * H) + 2 * (W * D) + 2 * (H * D);
  const matCost = surface * 1.6 * (MATERIALS[config.material]?.costPerM2 || 150);
  const led = LED_LIGHTING[config.ledLighting]?.cost || 0;
  const subtotal = matCost + 260 + led;
  return Math.round((subtotal * 1.35 + 50) * 100) / 100;
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
