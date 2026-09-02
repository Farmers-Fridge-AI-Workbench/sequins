# Sequins — Backlog

Open items only. Delete an entry when it's done — git history is the record,
this file is the "what's still hanging" list. Each entry should stand alone:
enough context to act on without the conversation that created it.

Opened 2026-08-19. Last refreshed 2026-08-31.

---

## Ready to build

### Week labels sort as text, so Wk 1 lands at the top

`getWeeks()` in Index.html is `Object.keys(STATE.demand).sort()` — a plain
lexicographic sort on labels like `Wk 33 · 2026`. So `Wk 1 · 2027` sorts ahead
of `Wk 33 · 2026`, and `Wk 5` sorts after `Wk 33`.

Cori, 2026-08-31: "the W1 data that’s in the Compiled Forecast is for the end
of 2026 and beginning of 2027 but it’s sitting at the top of the weeks
available. We’ll need for Sequins to be smart enough to see that."

Harmless while every loaded week was Wk 33-52 of a single year and two digits
wide. Now that 2027 forecast weeks are loading it shows up in the week dropdown,
the Loaded Demand table, and anywhere else that walks getWeeks().

Fix is a comparator on (year, week) parsed out of the label, inside getWeeks()
alone — callers all go through it. Grep for other places that sort week labels
directly before assuming one change covers it. Note the label is also the
storage key, so parse it, do not renumber it.

---

## Small, mine to do

### Sandbox week table: label a line that is new in the scenario

v0.5.172 made a line switched OFF read "off in scenario" instead of a bare dash,
after Samad asked why finish times differed by hours. The mirror case is still
open: a line running in the scenario but not in the baseline — LINE-7 being
stood up — shows a bare dash under Base units / Base run time / Finish base, and
reads as the same puzzle from the other direction.

Same spot, `sbCard_` per-day line table in Index.html: the `b` half of each
ternary. Something like "not live yet". Flagged to Cori 2026-08-31, not asked
for yet.

### Confirm before Clear on Loaded Demand

Each row in Loaded Demand has a Clear button. `clearDemandDay` in Code.js calls
`deleteRow` on the Demand Store sheet and drops the legacy Script Properties
keys — and that sheet IS the storage, not a backup of it. So Clear is a
one-click permanent delete of the only copy of that day, with no confirmation.

Admin-only, which is the reason it has not bitten. A confirm naming the day and
saying the copy is the only one would fit the existing browser-confirm pattern
(popups are fine in the web app; the no-popup rule is Sheets/Apps Script UI
only). Raised 2026-08-31 while answering "we have that in the archives right?"
— the answer being yes, and this button is what removes it.

---

## Blocked on Cori

### Go-live date for sandbox-only lines

`sandboxOnly` is a boolean: a line is hidden from live planning or it isn't, and
flipping it is a manual edit. What Cori wants is a **date** in Line Config for
when a staged line joins real planning, so LINE-7 turns itself on for the
holiday weeks without anyone remembering.

Deferred 2026-08-19 to ship the sandbox modelling first. When built, the flag
becomes a date comparison at the same chokepoint in `runSequencer`, plus a date
input. Nothing else should move — every live surface already routes through
`liveLines_`. The per-sandbox `lineDays` map stays regardless; it answers "how
many days do we need it", not "when does it become real".

### Wraps → LINE-3 / Sandwiches → LINE-2

Still unconfirmed — see the "In transition" section of CLAUDE.md. The code has
moved to soft home-line preferences; whether the *stated* rule retires is Cori's
call. Don't encode either reading without asking.

---

## Blocked on someone else

### Repo visibility — public since 2026-06-30

`Farmers-Fridge-AI-Workbench/sequins` is **public to the internet**, not internal
to Farmers Fridge. Verified by anonymous fetch: the full `Code.js` downloads with
no authentication.

Cori has write, not admin, so she cannot change it. Needs an org owner
(github.com/orgs/Farmers-Fridge-AI-Workbench/people → Role: Owner) to flip
visibility to Internal/Private, or to grant her Admin.

Origin: created under the personal account `data-fairy-godmother` and later
transferred into the org. GitHub transfers preserve visibility, so the setting
was made at creation and the ability to change it moved away with the transfer.
Org audit log (`repo.access`) has the specifics.

### Org repo-creation policy

The org has **4 public repos**, so this likely is not limited to Sequins. Suggest
Settings → Member privileges → Repository creation, restricted to
private/internal. Prevents recurrence better than auditing repos one at a time.

---

## Known gaps, not bugs

### Off-capper moves read optimistic

Runtime is planned at the library UPM regardless of which line runs a SKU, so a
capper SKU spilled onto a normal line is modelled as costing the same time it
would on the capper. If the capper is genuinely faster, every off-capper move —
including LINE-6 → LINE-7 in Sandbox — understates the cost. Needs real
off-capper completion times from the floor tracker.

### Overtime cannot be derived from headcount

`sbOvertime_` prices overtime from crew size, but the engine's runtime is
`qty ÷ upm` with `upm` a per-SKU constant. Nothing makes throughput a function
of people, so the model cannot answer "how many people do we need" — only "how
long will it run". Same blocker as above.

---

## Optional — quality of life

### Permission allowlist

No `.claude/` config in this repo, so routine read-only commands (`git status`,
`node --check`, greps) prompt every time. The `/fewer-permission-prompts` skill
scans actual usage and writes a project allowlist.

### Pre-ship syntax check as one command

CLAUDE.md mandates `node --check Code.js` **and** extracting the main `<script>`
block from `Index.html` to check that too, every time. The second half is fiddly
enough to get skipped under pressure. A short script would make it one command.
Note the extraction now works via node rather than Python — Python is not
installed on this machine, so the CLAUDE.md instruction to use a Python regex is
inaccurate.
