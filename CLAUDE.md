# Sequins ✨

Google Apps Script web app that sequences SKUs onto assembly lines at
Farmer's Fridge, CHI-CICERO. Replaces a manual Google Sheets process.
Serves planners, floor line leads, WH, QA, and USDA inspection staff.

Part of the Opsicle 🧊 ecosystem. Owner: Cori Blackburn.
Repo: `Farmers-Fridge-AI-Workbench/sequins` — **public, deliberately.**
Note: the local git remote still reads `data-fairy-godmother/sequins` — the
pre-transfer path. GitHub redirects it permanently, so pushes work and the
mismatch is cosmetic. Don't "correct" the doc to match the remote.

North star: planned-vs-actual production data into Snowflake/Hex, with
Sequins as the capture layer.

## People

- **Samad** (smunshi@) — operations expert, primary sequencing rules author,
  hands-on validator. His rules outrank older docs.
- **Fiyan** — ops stakeholder, co-authored an older vision doc with VP Alex.
  Lower precedence than Samad on rule conflicts.

Samad's stated rules are **hypotheses to validate against archive data**,
not ground truth to encode literally. Hard safety constraints (USDA,
allergen, regulatory) are non-negotiable regardless of what the data shows.

## Architecture

Four tracked files. No build step, no dependencies, no tests — correctness
rests on the inline annotations and live verification.

- `Code.js` (~3.6k lines) — server. Auth/roles, sheet I/O, storage,
  publish fan-out, triggers. **Does no sequencing.**
- `Index.html` (~5.4k lines) — the entire client SPA *and* the engine.
- `appsscript.json` — V8, America/Chicago, 3 OAuth scopes.
- `.clasp.json` — push config.

**The sequencing engine runs in the browser.** `runSequencer(ctx)` in
`Index.html` is client-side JS. This is why Sandbox and staffing scenarios
are instant — they re-run the engine on a different `ctx` and never
round-trip. The live path passes no `ctx` and reads `STATE`; every other
caller passes its own demand / rules / line config. Never move scheduling
server-side without understanding what that costs the what-if views.

Engine order: build jobs from demand × SKU Library → pool assignment
(FC-W/FC-S first-class, overrides category; then capper + size, green
belt, night) → line seeds → FC distribution across lines → allergen
compounding chain → placement (capabilities, slot cap, sausage/sesame,
USDA pairing, finish-by cap or even run-hours) → breaks → per-line chain
reorder → unplaced. Manual moves apply *after* the engine returns, via
`applyWorkbenchOverrides()` — which is why the engine must exclude
same-day-overridden SKUs from chain math up front.

**Constraints are capabilities, not hardcoded line IDs.** Lines advertise
`caps{capper, smallCup, usdaApproved, night}`; SKUs declare requirements;
the sequencer matches the two. `lineCaps()` derives caps from the older
`type`/`pool` fields when a line has none, so pre-capability deployments
keep working. Express new constraints this way — never by naming a line.

Eight views: Line Sequence, Workbench (drag/drop, undo, overrides,
scenarios), Sandbox, My Line (floor tablet — run sheet, actuals, print),
Load Demand, SKU Library, Line Config, Users. Live sync polls
`lastModified` every 8s, paused on tab hide.

Publish fan-out (`savePublishedPlan`) is ordered deliberately: archive
rows write first and are **the record**; War Room `$/unit`, the plan
email arm, and the Assembly Sequencing 2.0 fallback tab all follow and
are best-effort — none may fail a publish. Keep it that way.

Five access tiers: admin → rules editor → planner → floor viewer →
external token viewer. Nav gating is client-side; server functions
re-check independently. Two documented trade-offs worth knowing before
touching either: the external link is a **shared bearer URL** (mitigated
by rendering server-side with zero callbacks, so the page has no reach
back into the app), and Preview-as-role is **UI-only** — server calls
still execute as the real account.

## Code conventions

- **ES5 in `Index.html` — `var`, never `const`/`let`.** The client is ES5
  throughout (currently zero `const`/`let` in the whole file); keep it that
  way. `Code.js` runs V8 server-side and uses `const`/`let` freely (~700
  declarations) — match the file you're in, not a single global rule.
- **Batch multi-cell sheet writes** — build rows, one `setValues`. Never a
  `setValue` in a loop. Genuine single-cell writes are fine and exist
  (War Room cost cell, ASM20 date + start time).
- **Version stamp on every change.** `Code.js` and `Index.html` are
  versioned and delivered as a **pair**. Bump both, add a brief changelog
  entry — a few lines per version, newest-first, no long writeups.
  The client stamp is `APP_VERSION` in `Index.html` (one place, feeds the
  sidebar); the pairing is recorded in the `Code.js` header. **Check the
  two agree before shipping** — drift has happened repeatedly and is
  invisible until someone reads the header.
- Use `getDisplayValues()` for date columns — `getValues()` returns Date
  objects that re-serialize through timezone on `setValues()`. Force text
  format with `setNumberFormat('@')`.

## Popups — read carefully

No alerts, toasts, or popups **in Google Sheets / Apps Script UI**
(`SpreadsheetApp` popups, sheet-level toasts). `Logger.log` only.

This does **not** apply to browser-side `alert()` / `confirm()` in the
Sequins web app UI — those are fine for error surfacing.

## Sequencing rules

**Hard rules — never change without flagging:**

- No USDA on LINE-6
- Sausage and sesame cannot share a line
- Night shift runs the restricted SKU list only
- No night shift Fridays or Saturdays

**In transition — do not touch without explicit confirmation from Cori:**

- Wraps → LINE-3 only / Sandwiches → LINE-2 only. These predate the
  FC-W / FC-S model. **The code has already moved on** — they live in
  `DEFAULT_RULES.homeLines` as a soft preference, and the legend now reads
  "category only prefers a home line" / "soft home line." What remains
  open is whether the *stated* rule is retired. Cori has **not** confirmed.
  Do not encode either reading without asking her.

**Settled 2026-08-10 by Samad — do not reopen:**

- Allergen compounding is a **food-contact rule only**. Only FC SKUs touch
  the conveyor. Sealed jars (salads, bowls) are fully exempt — changeover
  covers cross-contact.
- FC and non-FC form two contiguous blocks. **FC block always first**,
  enforced hard.
- Food contact = conveyor contact, **not** box packaging. Boxed snacks
  like CHIPS_GUAC are not FC.
- Only LINE-2, LINE-3, LINE-4 have ever run food contact (79/79 days each).

**Allergen data — food safety critical:**

"No import" (unknown, never entered) is **not** the same as "None" /
"No Allergens" / "N/A" (confirmed allergen-free). These must never be
conflated. Menu Library owns the allergen string format — store it raw,
do not parse.

## Data rules — settled

- **SKU Library is the source of truth for assembly.** SKUs not in the
  library don't get sequenced. The library governs sequencing behavior,
  not data ingestion.
- **Historical actuals are frozen evidentiary records.** Never overwrite.
  The freeze is date-aware: past days are frozen, today and future are
  re-fetchable. No manual unfreeze for historical days.
- **Automatic data deletion requires explicit per-instance sign-off.**
- `unitsPerTote` is owned data living in Sequins, not a live fetch from
  the retiring Assembly Sequencing 2.0 workbook.
- Partial totes are excluded from the daily tote total.
- LINE-0 (green line) is excluded from the daily tote total via the
  `smallCup` capability — not a hardcoded row range.
- CPG/beverage excluded from demand at the fetch layer (Menu Library
  Package column, regex `^(beverage|cpg|bev)`).
- Pushed demand lands as `mode: 'actual'`, `source: 'assembly_summary'`.
  One push can supersede another; Demands 2025 actual still outranks a
  push. Skip requires matching quantity AND mode AND source.

## Storage — hard ceiling

**Script Properties has a ~500KB shared quota and fails silently when
exceeded.** Published plans used to live there and publishes broke.

- Published plans and sandboxes now live in the archive Sheet
  (`1oB70aPTc2SkJYA-LEXgCm7tMWOHxDzFGt39pXIkR2L0`)
- Script Properties holds bounded config only — sized by the menu and the
  staff list, never by the calendar
- Any date-keyed or growing data stays out of Script Properties. **This is
  the direction, not a finished state.** Demand and the four `[week][day]`
  sections (overrides, finishBy, breakOverrides, scenarios) read
  **sheet-first with a legacy Script Properties fallback**, so days that
  predate the migration still resolve. The fallback in `getDemandDay_()`
  and the `migrate*ToSheet` functions are load-bearing until every day has
  moved — do not "clean them up."
- `getSandboxes()` is re-fetched every time the Sandbox view opens. Keep
  it that way. `STATE.sandboxes` is a legitimate cache and is populated at
  load on purpose — a v0.5.73 bugfix **added** that assignment because its
  absence let the next save overwrite the stored list. Don't remove it;
  don't rely on it alone.

## Working rules

- **The repo is public. Never commit a secret.** No API keys, OAuth client
  secrets, tokens, service-account JSON, or the external-viewer token.
  Google file IDs and staff emails are already in the repo and that is an
  accepted trade-off — they are identifiers, not credentials, and the
  sheets enforce their own sharing. Adding a *new* ID is fine; adding
  anything that grants access on its own is not. If a sheet needs to be
  reachable, fix it in sharing settings, never by committing a credential.
- **No automatic background behavior without an explicit ask** — especially
  anything touching stored data or triggers.
- Don't change anything outside what was asked. Spot a problem elsewhere →
  say so and ask.
- **Don't fix half a thing.** Complete the fix or don't ship it.
- No unrequested refactors.
- Never push from a spreadsheet whose name matches `/master/i` — guard
  lives in `SequinsDemandPush.gs`.

## Simulate before wiring

Propose the approach in plain language before writing load-bearing code.
Simulate against real data before wiring anything into the engine.

When data appears missing, check storage directly via debug functions
before assuming loss or proposing a new fix.

## Validating rules against history

Two evidence sources. They cover different periods and different kinds of
decision — check both, and don't treat them as interchangeable.

**Assembly Sequencing Archive** — `10ErFKUZAGFsqwQqtOW6BV1MesCYTaUzLnk9m1lMA0Bw`
Two to three months of the legacy Google Sheets process. These are **pure
human sequencing decisions**, made without any tool proposing an answer
first. Best evidence for what a sequencer actually chooses on their own.
**The last dated entry in this sheet is the cutover point** — everything
after it lives in the Sequins archive.

**Sequins archive Sheet** — `1oB70aPTc2SkJYA-LEXgCm7tMWOHxDzFGt39pXIkR2L0`
More recent, and ongoing. Contains Published Plans, Demand Store, State
Store, SKU Moves, Sandboxes, Run Sheet Actuals, Run Sheet Shift. These
reflect **Sequins proposing and humans reacting** — the SKU Moves tab in
particular is where a human overrode what the engine suggested.

When a proposed rule change or a stated constraint is in question, check
it against both before encoding anything. This applies especially to
Samad's rules, which are hypotheses to validate, not ground truth. If the
archive contradicts a stated rule, surface the contradiction rather than
picking a side.

Reading either: `read_file_content` on Google Sheets truncates around row
50 and is not reliable. Use `download_file_content` with xlsx export →
`json.loads(d[0]['text'])` → base64-decode `['content']` → write `.xlsx`
→ open with openpyxl.

## Before shipping

- `node --check Code.js`
- Extract the main `<script>` block from `Index.html` via Python regex into
  a temp `.js`, then `node --check` that
- Both, every time, no exceptions

## Deploy

Windows / PowerShell — chain with `;` not `&&`.

1. `clasp push`
2. Commit and push to GitHub — **separate from the clasp push.** Version
   drift between the two has happened before.
3. **Cori deploys manually**: Manage Deployments → Edit → New Version → Deploy

Never deploy. Step 3 is hers.

The sidebar version stamp is how Cori verifies a deploy landed. If it
disagrees with the changelog header, trust the header.

`SequinsDemandPush.gs` lives in the Production Planner's Apps Script
project, not this repo.

## Working with Cori

Brief, direct answers — lead with the answer, not the explanation. She
pushes back decisively on long explanations, unasked-for assumptions, and
proposals beyond what was requested.

When she says something is a certain way, take it at face value and look
for the real cause rather than re-asking.
