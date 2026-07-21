# Wardrobe knowledge (FSL / Furniture Generation API)

Deterministic knowledge for `furniture_type: "wardrobe"` in the **Furniture
Generation API** (`src/lib/furniture-knowledge/wardrobe.js`) — read by
`FurnitureBrain` (defaults) and the `FSL Validator` (range/semantic checks).
This is a different system from `base-cabinet-rules.md` in this same
directory, which belongs to the separate CAD Lab experiment
(`assemblyType: "BASE_CABINET"`, `/cad-lab`) — the two don't share code or
data, only this directory.

All numbers are **configurable application rules for FurniAI's concept
stage** — not a building code or hinge-hardware spec. See
[docs/fsl-v1.md](../fsl-v1.md) for how these feed into `assumptions[]` /
`warnings[]` / `missing_information[]`.

## Dimensions (mm)

| Axis | Hard bounds (error outside) | Standard range (warn outside) | Default |
|---|---|---|---|
| width_mm | 300–6000 | 600–3600 | 2400 |
| height_mm | 600–3200 | 1800–2800 | 2400 |
| depth_mm | 250–900 | 500–700 | 600 |

Depth additionally has a `hangingClearanceMin` of 550mm — below that, a
`UNUSUAL_WARDROBE_DEPTH` warning fires (still valid, just flagged) even if
the value is within the standard range.

## Default materials

| Part | Material | Thickness | Finish (no colour known) |
|---|---|---|---|
| body | mdf | 18mm | white_matte |
| facades | mdf | 18mm | white_matte |
| back_panel | hdf | 6mm | white |

When `style.primary_color`/`style.finish` are known (explicit or defaulted),
the finish string is recomposed as `${color}_${sheen}` for body/facades and
just `${color}` for back_panel — see `mergeMaterials()` in
`furniture-brain/brain.js`.

## Default style

`theme: modern`, `primary_color: white`, `finish: matte`,
`door_style: flat_panel`, `handle_style: minimal`.

## Component rules

- Door width sanity: total width ÷ door count should land in **350–700mm**
  per door. Outside that range: `DOOR_WIDTH_TOO_NARROW` /
  `DOOR_WIDTH_TOO_WIDE` warnings (never blocks).
- `maxDrawersPerColumn`: 6 (matches the existing `/builder` `configSchema.js`
  clamp — see `cleanModule()`).

## Component defaults (applied only when a component is mentioned without a count/property, and `allow_defaults: true`)

| Component | Default quantity | Default properties |
|---|---|---|
| shelf / open_shelf | 2 | `adjustable: true` |
| hanging_rail | 1 | — |
| internal_led | 1 | `activation: "door_sensor"` |
| hinged_door / sliding_door / drawer | 1 (if genuinely uncounted) | `soft_close: true` |

These are simple, deliberately-documented v1 placeholders — **not** an
attempt to reverse-engineer the master prompt's Section 3 illustrative
example's shelf/rail counts, since that example never states the formula
that produced them.

## Allowed components

`side_panel, top_panel, bottom_panel, back_panel, divider, shelf,
hinged_door, sliding_door, drawer, hanging_rail, handle, mirror,
internal_led, plinth, end_panel, filler_panel`

Anything else in `fsl/enums.js COMPONENT_TYPES` (e.g. `countertop`,
`corner_cabinet`) is still schema-valid on a wardrobe document — it just
produces an `ATYPICAL_COMPONENT_FOR_CATEGORY` warning rather than an error.

## What this does NOT cover

Corner/L/U wardrobe shapes, per-door material overrides, sliding-door track
hardware, and multi-section runs are all out of scope for this rule set —
see [fsl-v1.md](../fsl-v1.md#known-limitations-v1).
