# BaseCabinetRuleSet

Deterministic construction knowledge for `assemblyType: "BASE_CABINET"` in the
CAD Lab experiment (`src/lib/rules/baseCabinetRules.js`). This is the only rule
set implemented in the first vertical slice — see
`docs/furniai-existing-system-analysis.md` for why the others (wall cabinet,
wardrobe, corner, drawer unit, TV unit) are deferred.

All units mm. Coordinate frame: X centred on cabinet width, Y=0 at the floor,
Z centred on cabinet depth (front is +Z) — same convention as
`src/lib/buildGeometry.js`, just mm instead of metres.

## Inputs

- `dimensions`: `width` (W), `height` (H), `depth` (D)
- `construction`: `boardThickness` (T), `backThickness` (BT)
- `shelves[]`: each `{ positionRatio }`, 0–1 fraction of interior height

## Derived values

```
innerWidth  = W - 2T
innerHeight = H - 2T
```

## Panels

| Role | Face size (width × height) | Thickness | Position (x, y, z) |
|---|---|---|---|
| `side_left` | D × H | T | (-W/2 + T/2, H/2, 0) |
| `side_right` | D × H | T | (W/2 - T/2, H/2, 0) |
| `top` | innerWidth × D | T | (0, H - T/2, 0) |
| `bottom` | innerWidth × D | T | (0, T/2, 0) |
| `back` | innerWidth × innerHeight | BT | (0, H/2, -D/2 + BT/2) |
| `shelf_N` | (innerWidth - 4) × (D - BT - 20) | T | (0, T + innerHeight × positionRatio, BT/2) |

Sides span the full cabinet height (top/bottom panels sit *between* them, not
on top of them) — the standard 32mm-system carcass layout, and the same
choice `buildGeometry.js` already makes.

## Edge banding (`edgesFor`)

- `side_left` / `side_right` / `top` / `bottom`: front edge, 2mm PVC (ABS_WHITE_2MM)
- `shelf_*`: front edge, 1mm PVC (ABS_WHITE_1MM)
- `back`: none

## Machining

Each shelf drills one `SHELF_PIN_HOLE` (Ø5mm, 12mm deep) into each side
panel's inner face, at the shelf's Y height, 37mm back from the panel's front
edge (typical 32mm-system front-row setback).

**Deliberate v0 simplification**: this places exactly one hole pair per
shelf, at the shelf's actual height — not a full 32mm-pitch adjustable hole
column front-and-back (4 holes per shelf per side) a real cutting file would
need. Real, derived-from-real-geometry, just coarser than production
tooling. Upgrading to the full hole pattern is a rule-set change, not an
architecture change.

## Validation

- Every panel's three face dimensions must be finite and positive
  (`NO_INVALID_NAN_GEOMETRY`).
- Any panel with a face dimension under 40mm gets a `warnings` entry
  (`MIN_PANEL_DIMENSION`) — still built, flagged, not silently dropped.
- Shelves are clamped to `positionRatio ∈ [0,1]` before use
  (`SHELF_INSIDE_CABINET`, coarse version — see `ValidationEngine` for the
  fuller check against actual interior bounds).
