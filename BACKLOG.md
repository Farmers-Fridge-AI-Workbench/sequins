# Sequins — Backlog

Open items only. Delete an entry when it's done — git history is the record,
this file is the "what's still hanging" list. Each entry should stand alone:
enough context to act on without the conversation that created it.

Opened 2026-08-19. Last refreshed 2026-09-03.

---

## Ready to build

### Finish the tablet pass on My Line

Cori, 2026-09-03, on priority: "I think the focus on the tablet piece is
priority". v0.5.174 added the 900px breakpoint and v0.5.175 the Start/Stop
buttons, both verified against her Galaxy Fold at 766px. What is left needs a
real device or a decision:

- **Hide the nav strip entirely for a floor-viewer-only login.** She sees seven
  nav items as an admin; a line lead sees two, and on a handheld even two is a
  row of screen given to navigation nobody uses. Flagged 2026-08-31, never
  answered — needs her call, not a guess.
- **ACTUAL UNITS still raises the alphabet keyboard.** `inputmode="numeric"`,
  one attribute. Left alone because she said the entry panel was not the focus,
  but it is a five-second fix whenever the panel matters.
- **Test on the tablet they actually buy.** The Fold unfolds to roughly 766 CSS
  px; a 10-inch tablet is nearer 1024 landscape. The layout will be close but
  the breakpoint should be confirmed on the real thing.
- **Decide the login.** If all seven tablets share one Google account, every
  actual is attributed to that account in the audit log and in `UpdatedBy`.
  Fine for testing, worth settling before it is the evidentiary record.

---

---

## Small, mine to do

_Nothing queued._

---

## Blocked on Cori

_Nothing queued._

Dropped 2026-08-31: the **go-live date for sandbox-only lines**. Cori: "for now
we will just turn it on when it's time." The manual `sandboxOnly` checkbox is
enough. Restate it here if flipping it by hand ever gets missed.

---

## Blocked on someone else

### Push run-sheet actuals into the internal system the floor already types into

Cori, 2026-08-31: "they already type in actuals - it's an internally built
system. I need to get with that team and figure out how to connect what we're
going to put in here to that system so the team doesn't have to enter it twice."

Hers to arrange with that team; ours to build once the interface is known. Do
not go looking for the destination — it is not any sheet Sequins currently
touches. Both obvious candidates were checked on 2026-08-31 and ruled out:
Assembly Sequencing 2.0 is only a fallback and is being retired, and War Room's
`Assembly $ / unit` is computed from a database ("Database DoD - Final"), not
entered.

What Sequins will have to offer, so the shape is known before the conversation:
`Run Sheet Actuals` captures **per SKU** — ActualStart, ActualEnd, ActualPeople,
ActualUnits, ActualFullTotes, ActualPartialUnits — with the planned figures
stored alongside each row. `Run Sheet Shift` holds the per-line/day header. Both
were empty as of 2026-08-31; nothing has been captured yet.

The open question for that team is grain: per SKU, or per line per day. Per-day
makes the push an aggregation and leaves the per-SKU detail as Sequins' own
contribution to the Snowflake north star.

---

## Parked — low priority, Cori's call 2026-08-31

Both need an org owner and neither is urgent: "you can stop worrying about that
for now too...very low prio." Kept on record because the exposure is real and
still open, not because it needs chasing.

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

### Off-capper moves read optimistic — NO LONGER BLOCKED

Runtime is planned at one library UPM regardless of which line runs a SKU, so a
capper SKU spilled onto a normal line is modelled as costing the same time it
would on the capper.

This said "needs real off-capper completion times from the floor tracker". That
is no longer true. The **Data Drop** (2026-09-03) carries `Line` on every run, so
per-line UPM is directly measurable and was measured: on the first pass
USDA_CHEF_SALAD_TURKEY ran 20.4 UPM on LINE-6 against 9.8 elsewhere, and
GRILLED_CHICKEN 22.1 against 12.8. The gap is real and large.

What it needs now is a decision, not data: whether the engine should hold a
per-line UPM instead of one number per SKU. That changes every runtime
calculation, so it is a deliberate change and not a quiet one.

### Overtime cannot be derived from headcount — NO LONGER BLOCKED

`sbOvertime_` prices overtime from crew size, but runtime is `qty / upm` with
`upm` a per-SKU constant, so nothing makes throughput a function of people.

Also written as blocked on the floor tracker, and also no longer true: the Data
Drop carries **Line Population** per run. UPM as a function of crew size is
measurable from data that already exists and arrives nightly.

Same shape of decision as above — the data is there, the modelling change is the
work, and it is the thing that would let Sandbox answer "how many people do we
need" rather than only "how long will it run".

---

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
