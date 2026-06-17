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
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white p-4 text-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Appearance & size</h2>

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

      <label className="mb-4 mt-1 flex items-center gap-2">
        <input type="checkbox" checked={config.hasPlinth} onChange={(e) => setPlinth(e.target.checked)} />
        <span className="text-neutral-600">Plinth / base</span>
      </label>

      {config.ai?.source && config.ai.source !== "default" && (
        <p className="mb-3 rounded bg-amber-50 p-2 text-xs text-amber-800">
          Generated from your selection ({config.ai.source}). Confirm the real dimensions for your space.
        </p>
      )}

      <PriceBadge config={config} />
    </aside>
  );
}

function PriceBadge({ config }) {
  // Lightweight client estimate. The authoritative quote still comes from
  // /api/quote (pricing.js) — this is just live feedback while editing.
  const total = useMemo(() => estimate(config), [config]);
  return (
    <div className="mt-2 rounded-lg bg-neutral-900 p-3 text-white">
      <div className="text-xs text-neutral-400">Indicative price</div>
      <div className="text-xl font-semibold tabular-nums">
        {total.toLocaleString()} {CURRENCY}
      </div>
      <div className="mt-1 text-[11px] text-neutral-400">Estimate — final quote confirmed at checkout</div>
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
      <div className="mb-1 flex justify-between text-neutral-600">
        <span>{label}</span>
        <span className="tabular-nums text-neutral-900">{value.toFixed(2)} m</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-neutral-600">{label}</label>
      <select className="w-full rounded border border-neutral-300 px-2 py-1.5"
        value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </div>
  );
}
