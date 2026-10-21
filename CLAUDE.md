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

**A Sequins role grants nothing in Google Drive — settled 2026-10-14.**
`appsscript.json` sets `executeAs: USER_DEPLOYING`, so every server function
runs as Cori with Cori's file access, whoever is clicking. Two consequences
that look contradictory until you hold them together:

- Inside Sequins, a role is the ONLY thing gating anything. A floor viewer and
  an admin reach the same sheets; what separates them is the role check, not
  Drive. That is why those checks are load-bearing and re-checked server-side.
- Outside Sequins, a Sequins role is worth nothing. A script in another project
  — `SequinsDemandPush.gs` in the Production Planner, anything the warehouse
  runs — executes as the person who runs it and needs its own Drive access to
  every file it touches.

This cost a week. Cori was on PTO 10/9–10/14/2026; colleagues with full Sequins
Admin ran the Planner push and nothing arrived, because the archive Sheet was
shared with nobody but her, and the push writes its `Demand` tab from outside
the app. Admin in the Users view implied access that did not exist. A failed
Drive write leaves no trace in the Demand tab either, so it looked like the
script had never run.

When something that touches Sequins data fails for one person and not another,
check Drive sharing on the file before reading any Sequins code. The archive
Sheet is domain-writable as of 2026-10-14 — Cori's call, knowing it puts the
published-plan record in reach of anyone at FF.

## Code conventions

- **ES5 in `Index.html` — `var`, never `const`/`let`.** The client is ES5
  throughout (currently zero `const`/`let` in the whole file); keep it that
  way. `Code.js` runs V8 server-side and uses `const`/`let` freely (~700
  declarations) — match the file you're in, not a single global rule.
- **Batch multi-cell sheet writes** — build rows, one `setValues`. Never a
  `setValue` in a loop. Genuine single-cell writes are fine and exist
  (War Room cost cell, ASM20 date + start time).
- **Version stamp on every change.** `Code.js` and `Index.html` are
  versioned and delivered as a **pair**. Bump both, even when only one
  changed.
- **There are THREE stamps, not two.** All three must agree before shipping:
  1. the `Code.js` header comment (version + date + the Index.html it pairs with)
  2. the `Index.html` header comment — an HTML comment in the **first 14
     lines**, easy to miss because nothing reads it
  3. `APP_VERSION` in `Index.html` (~line 3330) — the only one the sidebar
     shows, so it is the only one anyone notices when it drifts
  Drift has happened repeatedly: the `Code.js` pairing line once sat 10
  versions behind, and the `Index.html` header 14. Both went unnoticed
  because the sidebar was correct. **Grep all three, every time.**
- **Each header carries the LATEST change only** — replace the previous
  entry, don't accumulate. `git log` is the full history. A few lines,
  no long writeups.
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

**Holidays — settled 2026-10-02 by Cori:**

- **We close.** Thanksgiving, Christmas and New Year are real closures, not
  reduced days. Do not infer otherwise from the archives — see "The archives
  test a stated rule" below.
- Demand Planning gives a **week total**; Sequins decides the day split and
  which days go dark. That inverts every other view, which takes demand as
  given. Shelf life is not a constraint on this model.
- **Holiday pay is 2x.** Through 2026 a shift that touches a holiday at all pays
  everyone a full shift at that rate, which is why being dark on the day wins.
  That rule LAPSES for 2027, so 1/1/2027 is 2x on hours actually worked — which
  is why staying open that day is reasonable and closing Thanksgiving is not.
- **A two-day closure is Thursday + Friday.** Crews A and B split on those days,
  so closing the holiday plus the day before gives one crew both days off and
  the other none.
- Closing a day closes **every** line on it, night shift included. Night Shift 1
  runs Sun–Thu, so Christmas and New Year (both Fridays) are already night-free
  and only Thanksgiving is affected.
- Cori’s standing preferences: Thanksgiving dark; Christmas Eve early finish and
  Christmas dark; New Year’s Eve half day and New Year’s Day open with a late
  start. Early finish and late start are **inputs**, not baked into the presets.

**What a holiday week COSTS — settled 2026-10-21 by Cori:**

- Cost is **labor plus holiday pay**, and labor means **assembly + processing**.
  Processing is `processingStaticPerUnit` (a rule, currently $0.11), charged on
  every unit built.
- **Food, packaging and PV are never inside a cost total.** The week builds the
  same units whichever days close, so that spend happens either way; putting it
  in buried a ~$35k decision inside a ~$476k number and reordered the options on
  a weekday-mix artifact. They answer a different question and live in their own
  table: F&P is what we would NOT spend if a SKU came out, PV is the sales we
  would NOT make.
- PV assumes **no substitution** — that a customer who cannot buy the ham sandwich
  buys nothing instead. That is the worst case and it is not labelled as a
  forecast. If the demand team ever gives a substitution rate, it belongs here.
- Where each number comes from:
  - food, packaging (labels included) — Production Planner, `Recipe Master
    (Buyer - Demand 1)`, Standard Cost in col DL, bucketed by the item number in
    col D: `E` food, `P` and `L` packaging. Summed per SKU.
  - sale price (PV) — same workbook, `Crrent Food & Pkg Cost` tab, col D. (The
    tab name's spelling is theirs.)
  - Food and packaging deliberately do NOT come from that second tab even though
    it carries them: Recipe Master is the live explosion for the planning day and
    covers 62 of 63 library SKUs against the tab's 55. They agree where both have
    a SKU, which is how the tab was validated.
- Refreshed nightly at 2am into its own Script Properties section, never into the
  SKU Library. Stale or missing, the first client that needs it refetches and
  saves. Nobody should ever have to run a function to make costs appear.

**Pilot SKUs — settled 2026-10-21 by Cori:**

- New SKUs launch **all at once, once a quarter**, and they replace SKUs
  discontinued in the fridges (the retail volume stays). Their fridge volume is a
  fill decision the team makes, not a projection, which is why the forecast
  outranks any history for them.
- A SKU whose baseline volume is under **a third** of its forecast for the same
  week is a pilot. It is left out of the day split AND the SKU mix, and takes its
  daily split from the forecast instead.
- Why: three launch SKUs had run only Thursday and Friday across the four baseline
  weeks, 200-250 units each in total. Baseline supplied a share where it had one
  and the forecast filled the rest, so those two days inherited a 0.16% trial
  share while the other five used the forecast — BUFFALO_CHICKEN_WRAP came out at
  5,699 units a week with 57 on Friday, and the cut list ranked all three top as
  'thin on a day'.
- The weeks themselves are kept; only the pilot units leave them. Measured on
  Wk 38-41 the contamination was 0.53% of Thursday and 0.55% of Friday and
  nothing elsewhere — small, but one-sided onto the two days a Thanksgiving plan
  turns on.
- **It self-corrects.** Once the baseline window sits entirely after a launch,
  nothing trips the rule. It fires again at the next quarterly launch, which is
  when it should.

**Labor share — Pick Tock sets the curfew, settled 2026-10-21:**

- On nights Pick Pack needs help, assembly finishes early and those people walk
  over. **Pick Tock decides it**; Sequins only receives the consequence.
- Pick Tock works out when assembly bodies are due on the pick line. Assembly
  must be DONE five minutes before that, and that is the Sequins curfew.
  `curfew = assembly start − 5 min`, the five being walk-over time.
- The channel is a **`Labor Share` tab in the archive Sheet**, same shape as the
  Planner's demand push. Pick Tock writes A–F, Sequins answers in G–J. A human
  can read the whole exchange with neither app running.
- Sequins applies it on the 15-minute `pushedDemandTrigger` and on page load.
- **A curfew someone set by hand is never overwritten.** The row comes back
  `conflict` and Pick Tock shows red. Provenance is a `source` field on the
  finishBy entry — a person's has none, which is what makes 'set by hand'
  detectable at all. Unticking clears, but only a curfew this sync set.
- Pick Tock is `executeAs: USER_ACCESSING`, so it writes as whoever ticked the
  box. That works only because the archive Sheet is domain-writable. Narrowing
  that sharing breaks this silently for everyone but its owner — the same way
  the demand push failed during the October PTO.
- Cori sets these on a **Wednesday for the following week**, and a person reviews
  the shift before publishing, so latency is not a concern and the curfew gets
  human eyes long before the floor sees it.
- **Holiday Planning INHERITS it.** A holiday week is the real week, so if Pick
  Pack needs bodies on Monday they need them whichever days close. It is not a
  choice between options: every option finishes by that time, and where an
  option asks for a later finish the labor-share time wins — you cannot hand
  people over at 2:05 and still be running at 3.
- **Sandbox OFFERS it**, as a button beside the Finish-by grid. A sandbox is a
  what-if about a week that may never happen, so it shows the times rather than
  taking them; once taken they are ordinary finish-by values.
- Times cross the sheet as strings and Sheets coerces them. Read the Labor Share
  tab with getDisplayValues() and compare MINUTES, never clock strings — a
  correct 14:00 came back as a 1899 Date and showed red on 2026-10-21.

**Changeover — settled 2026-10-02:**

- 11 minutes, charged between **every** consecutive SKU. That is the measured
  median across 7,837 real turns in the Data Drop, so it is right.
- **A USDA pair back-to-back costs 5 minutes**, measured across 348 turns and
  signed off by Samad. Applied through `changeoverFor_`, which every site that
  charges changeover must use — placement and the reported clock disagreeing is
  how phantom gaps appear in the Sandbox.

**Home lines are config, not code — settled 2026-08-31:**

- Wraps and sandwiches have **soft home-line preferences**, stored in
  `sequencingRules.homeLines` and edited in Line Config. They are preferences,
  not line locks, and the legend says so. Cori set wraps to `LINE-3, LINE-4`
  on 2026-08-31, which retires the older "wraps → LINE-3 only" phrasing.
  Nothing here to encode or ask about — a preference that needs changing is
  hers to change in the app.

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
- **An assumption must never look like entered data.** A SKU with no UPM runs at
  its package-type average, but the field stays blank and the row says what is
  being assumed. Same shape as "No import" vs "no allergens": the moment a
  derived value sits in the box, the gap stops being visible and nobody fills it
  in. Measured UPMs are the standard — an attribute pull FILLS a blank UPM and
  never replaces one.
- **Historical actuals are frozen evidentiary records.** Never overwrite.
  The freeze is date-aware: past days are frozen, today and future are
  re-fetchable. No manual unfreeze for historical days.
- **Automatic data deletion requires explicit per-instance sign-off.**
- **A job nobody visits does not run.** Three things broke this way and the shape
  is always the same: work that must happen on a schedule was hung off a page
  someone has to open, or a function someone has to call. The weekly UPM refresh
  sat behind opening SKU Library and went 19 days without running, then updated
  47 UPMs at once; worse, the code that reinstalls a missing trigger sat in the
  same place, so only the person who would never notice could repair it. The cost
  store needed a hand-run sync every time its shape changed. Put scheduled work
  on a trigger that demonstrably fires — `pushedDemandTrigger` runs every 15
  minutes and is checkable in the audit log — and make anything cached carry a
  version stamp so a client that wants more than the cache holds refetches and
  SAVES, rather than refetching forever.
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

**The archives test a stated rule. They never originate one.** How the
operation behaves — holidays, shutdowns, shift patterns, staffing norms,
what the floor actually does — is Cori's and Samad's to state. If nobody
has stated it, ask and wait; do not open an archive to form the premise.
Both archives are planning records: a tab or a published plan existing
means someone built a plan, not that the plant ran. And they start in May
2026, so they say nothing at all about the winter holidays. Arriving with
a question is not a worse answer than arriving with a finding.

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
3. `clasp deploy -i <deploymentId> -d "v0.5.x"`

**Deploy every change. Do not ask.** Standing instruction from Cori,
2026-08-31: "I always want you to deploy new code." Step 3 is part of shipping,
not a separate decision — code that is pushed but not deployed is invisible to
everyone, and holding it back just makes her chase you for it.

The one gate is the syntax checks above: deploy after both pass, never before.
That is the existing pre-ship bar, not a reason to hold a deploy.

`clasp deployments` lists two. Only ever update the **versioned** one — the
`@<number>` entry, which is the live `/exec` the floor and planners open. The
`@HEAD` entry already follows every push and is not what anyone loads; deploying
to it does nothing. (IDs deliberately not recorded here — the repo is public and
a deployment ID is the app URL. Read them off `clasp deployments`.)

`clasp deploy` versions **whatever was last pushed**, not the working tree —
so push first, or you ship stale code. Confirm the version number it prints
went up.

The sidebar version stamp is how Cori verifies a deploy landed. If it
disagrees with the changelog header, trust the header. A deploy can take a
minute to propagate, and she has needed a hard refresh to see it.

`SequinsDemandPush.gs` lives in the Production Planner's Apps Script
project, not this repo.

## Working with Cori

Brief, direct answers — lead with the answer, not the explanation. She
pushes back decisively on long explanations, unasked-for assumptions, and
proposals beyond what was requested.

When she says something is a certain way, take it at face value and look
for the real cause rather than re-asking.
