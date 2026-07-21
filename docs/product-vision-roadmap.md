# FurniAI — Product Vision & Roadmap

Written 2026-07-22, from the founder's own description of the target product,
checked against what actually exists in this repository today (not against
older docs, several of which describe an abandoned pricing/checkout-first
model — see `furniai-existing-system-analysis.md`).

## The vision, in one paragraph

A client — on any device, phone, tablet, or PC — hands FurniAI a starting
point: a photo, a PDF, a hand drawing, or just a spoken or typed description.
An AI "brain," reasoning through FurniAI's own internal furniture
representation, turns that into a real, detailed 3D model. The client then
becomes their own designer inside that 3D view: add, remove, resize, swap
material or texture, live. Once they're happy, the same brain produces
production-grade output — CNC-ready blueprints, nesting layouts, cut lists,
board specs — equivalent to what a CAD/SketchUp/BAZIS operator would hand a
factory. The brain's furniture expertise comes from a large body of
furniture/architecture/production reference material, so it reasons like an
experienced furniture engineer, not a template-filler. Eventually all of this
is exposed as an API for other systems to call.

## The six pillars, and where each one actually stands

| # | Pillar | Status | Where the code lives |
|---|---|---|---|
| 1 | Multi-channel input (photo / PDF / drawing / typed / voice, any device) | **Text only** at the time of writing; image/PDF input and browser-voice input were added the same day — see "Status update" below. | `src/app/api/v1/furniture/generate/route.js` |
| 2 | AI brain + internal furniture "language" | **Real, working first version.** Natural language → validated structured spec. | `src/lib/furniture-brain/brain.js`, `src/lib/fsl/` (schema/enums/validator) |
| 3 | Deep furniture knowledge (learned from a large reference corpus) | **One category only, hand-authored.** Not learned from ingested reference material. | `src/lib/furniture-knowledge/wardrobe.js`; everything else falls back to `genericCategory.js` |
| 4 | Live 3D model the client edits themselves | **Real but narrow.** Parametric, genuinely reactive — but covers fewer types/shapes than the live product already does elsewhere. | `src/components/builder/`, `src/lib/buildGeometry.js`, `src/lib/furnitureConfig.js` |
| 5 | Production output (CNC, nesting, blueprints, board specs) | **Cut list + drilling notes only.** No true nesting/sheet optimization, no CAD-grade drawing sheets, no BAZIS/CNC file export. | `src/lib/production.js` |
| 6 | Public API | **First surface exists.** One endpoint, not yet versioned/hardened/documented for external consumers. | `src/app/api/v1/furniture/generate/route.js` |

The short version: **pillar 2 (the brain + its own language) is the one
piece you've already built for real**, with 34 passing tests behind it. The
other five are either missing, partial, or exist in the *wrong* place (see
below).

## The complication a roadmap has to account for: two codebases

This repo contains two independent, non-interoperating implementations of
FurniAI, and each one is ahead of the other on a different pillar:

- **The live static site** (`index.html` / `app.js` / `styles.css`,
  deployed at `furnia.vercel.app`) has the **broader 3D and production
  feature set**: 11 furniture types including L/U walk-in closets and
  corner kitchen runs, 13 materials with reflective/procedural finishes, and
  a full client-side production document (cut list, hardware list, SVG
  orthographic drawings, printable PDF). Its AI agent (`api/chat.js`) is a
  single blunt tool (`set_furniture_config`) with no structured internal
  representation — it re-sends the whole config every turn.
- **The Next.js app** (`src/`, not deployed) has the **better AI
  architecture** — `buildGeometry.js` is a genuinely pure `config → parts`
  function, and FSL v1 is a real structured brain — but only renders 5 of
  10 furniture types, each as one plain rectangular carcass. No corner
  geometry, no L/U shapes, no multi-cabinet kitchen runs.

Every pillar above will eventually need to live in one place. Building
pillars 3–6 only inside `src/` risks recreating a more sophisticated system
that customers never see, since `src/` isn't deployed.

**Decision (2026-07-22): the Next.js app (`src/`) is the long-term home.**
The live static site's 3D/production strengths (corner cabinets, L/U
shapes, kitchen runs, material palette, production documents) get migrated
into `src/` over time; the static site is not the target to build further
into. This resolves what the original draft of this roadmap flagged as the
single biggest open decision — see "Open questions" below for the ones
still outstanding.

## A prior attempt at pillar 2, and why it's not the current direction

Before FSL v1, an earlier experiment (`/cad-lab`: a tool-registry + IR
system — `src/lib/ir/`, `src/lib/tools/`, `src/lib/engines/`,
`src/lib/rules/`) tried to solve the same "AI brain with structured output"
problem. It was superseded by FSL v1 and the `/cad-lab` page/route/store
were removed from the repo on 2026-07-21. Its supporting modules
(`src/lib/ir/`, `tools/`, `engines/`, `rules/`) were fully orphaned (nothing
imported from them) and have now been deleted (2026-07-22).

## Status update — 2026-07-22

Phase 1 (input expansion) work started same day this roadmap was written:

- `POST /api/v1/furniture/generate` now accepts an `attachments` array
  (images and/or a PDF) alongside `message`, using Claude's native vision
  input — no separate OCR/CV pipeline. See `docs/furniture-generation-api.md`
  for the request contract.
- `/fsl-lab` gained a file-attach control and a browser-speech-to-text mic
  button (Web Speech API) that fills the `message` field — voice reuses the
  existing text path client-side, exactly as this roadmap originally
  proposed, with no server-side voice handling.
- Orphaned `/cad-lab` support modules deleted (see above).

## Recommended sequencing

Not a commitment, a proposed order — each phase is independently useful and
ships on its own:

1. **Input expansion (pillar 1).** ~~Add image and PDF input to the
   `furniture-brain` request path~~ — done 2026-07-22, see "Status update"
   above. Remaining: surface attachment support in a real client, not just
   `/fsl-lab`.
2. **Knowledge expansion (pillar 3).** Add dedicated
   `furniture-knowledge/<type>.js` files for the next few categories
   (kitchen, bookcase, office cabinet are the ones `/builder` can already
   render — see `fsl-v1.md`'s compatibility table). Separately, decide how
   "deep expertise" actually gets built: hand-authored rule files (current
   pattern — precise, slow to scale) versus ingesting real reference
   material (supplier catalogs, joinery standards, CNC/BAZIS specs) into a
   retrieval system the brain consults. These are very different engineering
   efforts and worth deciding explicitly rather than defaulting into one.
3. **Geometry expansion (pillar 4).** Bring `buildGeometry.js` and the
   configurator up to parity with what the *live* site already renders —
   corner/L/U carcasses, multi-cabinet kitchen runs — so more FSL output
   becomes `ready` instead of `partially_supported`. This is "catch up to
   your own live product," not new ground.
4. **Production expansion (pillar 5).** Real sheet-nesting optimization
   (today's cut list has no layout/yield logic at all) and CAD-grade
   drawing sheets (SVG/PDF), aimed at an actual BAZIS or CNC-importable
   export format rather than a CSV a human retypes.
5. **API hardening (pillar 6).** Version `/api/v1/furniture/generate`
   properly, add auth and rate limiting, write external-facing docs. Low
   effort relative to the others since the contract already exists.

## Open questions (need your call, not a guess)

1. **How should furniture expertise actually be built** — more hand-written
   rule files per category (current, proven pattern), or ingesting real
   reference documents into a retrieval layer the brain queries at
   generation time? Different systems, different cost/timeline.
2. **What's acceptable cost/latency for multimodal input?** Vision/PDF
   analysis is a per-request AI cost and adds latency versus the plain text
   path — worth setting a rough budget as usage grows.
3. **When does the static site → `src/` migration actually start**, and in
   what order (geometry first, then production, then cut the static site
   over)? The long-term home is decided; the migration plan itself isn't
   written yet.
