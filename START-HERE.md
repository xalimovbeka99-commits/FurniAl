# FurniAI — START HERE

This is the clean, consolidated **fresh start**: same system, same method, same code
and patterns we built — gathered into one project so you can begin again and try new
things without fighting the old codebase.

Read `FurniAI-Master-Specification.md` for the full vision. This file is the quick map.

## The one idea that fixes "it wouldn't change"

The old site wouldn't change because its models were **hardcoded** — every new design
meant editing code. Here, **a design is data.** New wardrobes, kitchens, anything:
you add a preset to `src/lib/designs.js`. The 3D model, price, cut list, and factory
PDF all follow automatically. The code underneath never changes.

```
edit designs.js  ─→  3D model + price + cut list + factory PDF  (all automatic)
```

So your workflow is: add/tweak presets, see the result, repeat until it's right.
The system stays stable while you iterate.

## What's in here

```
FurniAI-Master-Specification.md     the full plan (vision → factory)

src/lib/
  knowledgeBase.js     catalog: materials, hardware, prices, type defaults (EDIT prices here)
  furnitureConfig.js   config factory, manufacturable defaults, dimension clamping
  buildGeometry.js     PURE: config → 3D parts → cut list            ✓ tested
  configSchema.js      validation gate — sanitizes any AI/preset config
  designs.js           ★ THE GALLERY — add new wardrobes/kitchens here  ✓ tested
  pricing.js           PURE: config → price in AED                    ✓ tested
  production.js        PURE: config + orderId → cut list + CSV (CNC/PDF path)  ✓ tested
  salesAgent.js        conversational quoting (Claude tool-use)
  whatsapp.js          WhatsApp Cloud API helper

src/store/furnitureStore.js          live config + all edit actions
src/components/builder/*.jsx         3D model + left (structure) & right (appearance) panels
src/app/builder/page.jsx             the customize page: left | 3D | right
src/app/api/quote|sales-agent|whatsapp   server routes
```

## Same system, only the options change

When you want to "try new things," you touch **data**, not the engine:

| To change… | Edit… | Code changes? |
|------------|-------|---------------|
| Prices, materials, hardware | `knowledgeBase.js` | No |
| New wardrobe / kitchen / etc. | `designs.js` | No |
| Sizes, defaults per type | `knowledgeBase.js` defaults | No |
| How a piece is built geometrically | `buildGeometry.js` | Yes (rare) |

That separation is the point. The engine (`buildGeometry`, store, panels, pricing,
production) is stable and tested; your creativity lives in the catalogs.

## The pipeline (all deterministic — no CAD, no AI in the build)

```
designs.js preset → customize (panels) → price → pay → freeze config + OrderID
   → production.js → cut list CSV + production PDF (English, mm) → factory / BAZIS
```

No 3ds Max, no AutoCAD, no SketchUp, no 3D-mesh export. The factory works from
**PDF + CSV**, exactly as agreed. Every file carries the OrderID for traceability.

## Run it

You already have `three`, `@react-three/fiber`, `zustand`, and the Anthropic SDK.
Add drei if missing, set your key, and open `/builder`:

```bash
npm install @react-three/drei
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local
npm run dev
```

## Verified in this build

- All 7 starter designs validate and produce real cut lists (0 problems).
- Production pack + CSV generate correct mm dimensions with OrderID on every row.
- Geometry builder: correct parts, in-bounds, reflows on resize.
- All JavaScript syntax-checked; React/r3f compiles clean.

## Build order from here (each ships on its own)

1. **Gallery page** — render `designs.js`, click → `loadConfig` → `/builder`.
2. **Variant generator** — expand 8–12 designs into 100–500 via materials/sizes (see note at the bottom of `designs.js`).
3. **AI infer** — `/api/infer`: gallery label → Claude → `validateConfig` → load.
4. **Commerce** — checkout + payment + freeze config on payment.
5. **Production export** — wire `production.js` to a PDF renderer + factory dispatch.
6. **AI vision** — match a specific gallery image more closely.
