# ADR-001: FSL as the provider-independent contract between AI interpretation and furniture rendering

## Context

FurniAI needed a way to turn a free-text furniture idea into something the
existing `/builder` configurator (`furnitureConfig.js` + `buildGeometry.js`)
can render, without letting an AI model's raw output drive geometry
directly, and without hard-coupling the interpretation logic to one AI
vendor or to `/builder`'s specific internal shape.

The repository already contained two other systems solving adjacent
problems: `api/chat.js` (a single Claude tool mapped onto the static site's
flat `cfg`, live in production) and `src/app/api/cad-lab/route.js` (a
multi-turn, tool-call-based engine over a versioned "Furniture IR", scoped
to one assembly type — `BASE_CABINET` — with no wardrobe/door/drawer
support yet). Neither fit this task's primary user story (a wardrobe with
doors, drawers, shelves, rails, and LED) without either touching the live
site or first building out CAD Lab's assembly-type coverage.

## Decision

Introduce **FSL v1** as its own versioned, JSON-serializable document format
— independent of the AI provider's output shape, independent of
`FurnitureConfig`/`buildGeometry.js`'s internals, and independent of CAD
Lab's `furnitureIR.js`. Concretely:

- The AI model's job is narrowed to **extraction only** (a small schema:
  what did the user explicitly say), not FSL assembly — see
  `ai-provider/extractionSchema.js` and `promptTemplate.js`.
- **`FurnitureBrain`** (deterministic code) turns extraction + category
  knowledge into an FSL candidate, deciding explicit-vs-default-vs-missing
  itself rather than trusting the model's self-reported confidence.
- **`FSL Validator`** (deterministic) is the sole authority on whether a
  document is well-formed, and computes configurator compatibility as a
  separate concern from schema validity.
- **`Configurator Adapter`** is the only file that knows both FSL and
  `FurnitureConfig`; it finishes by calling the existing `configSchema.js`
  `validateConfig()` gate rather than handing `buildGeometry.js` anything
  of its own invention.

## Alternatives considered

1. **Have the AI emit a full FSL document directly.** Rejected: this
   re-introduces exactly the failure mode Section 20 warns against — an
   AI free to invent structure, dimensions, or enum values that only get
   caught after the fact. Narrowing the model's job to extraction, with
   defaulting done in deterministic code, makes "never fabricate certainty"
   enforceable instead of just requested in a prompt.
2. **Extend CAD Lab's `furnitureIR.js` instead of introducing FSL.**
   Rejected for this task: CAD Lab is a live, working, deliberately-scoped
   experiment (one assembly type, no doors/drawers/wardrobes). Adopting it
   as the target would mean building wardrobe/door/drawer/shelf modelling
   into CAD Lab first — a materially larger, differently-shaped task than
   "interpret a wardrobe idea and hand it to the configurator that already
   understands wardrobes." The two systems can converge later if CAD Lab's
   assembly coverage grows to match; nothing here forecloses that.
3. **Skip a validator and let the configurator adapter sanitize everything.**
   Rejected: conflates two different concerns (schema/semantic correctness
   vs. one specific configurator's rendering ability) into one file,
   making it impossible to answer "is this FSL document valid?" without
   also asking "can `/builder` render it?" — the whole point of
   `partially_supported` as a distinct status is that those two questions
   can have different answers.
4. **Make `/builder`'s `FurnitureConfig` the interchange format directly**
   (skip FSL). Rejected: `FurnitureConfig` is shaped around one renderer's
   internals (metres, module width-ratios, one material/door-type/LED-mode
   for the whole piece). Baking AI interpretation directly into that shape
   would mean every future renderer, export format, or persistence layer
   inherits `/builder`'s modelling limits permanently.

## Consequences

- Swapping AI vendors means writing one new file satisfying
  `{ extractRequirements(message) }`; nothing in `furniture-brain`, `fsl`,
  or `configurator-adapter` changes.
- FSL can describe more than `/builder` can render (ten furniture types,
  twenty-four component types) — this is intentional. The compatibility
  system (`data.configurator.compatible` / `unsupported_fields`) makes that
  gap visible instead of silently truncating requests down to what one
  renderer happens to support today.
- There are now three parallel "AI understands furniture" systems in this
  repo (`api/chat.js`, CAD Lab, this one). That's an accepted, explicit
  trade-off for this task, not an oversight — each is scoped to a different
  proven surface (live static site / experimental multi-turn CAD engine /
  one-shot NL→spec for `/builder`), and unifying them is future work, not a
  prerequisite for this one to be useful now.
- The FSL→`FurnitureConfig` translation in `configurator-adapter/adapter.js`
  is a real approximation (flat door/drawer/shelf counts → discrete
  modules) that will need revisiting if `/builder`'s module model changes.
