# Sequins — Backlog

Open items only. Delete an entry when it's done — git history is the record,
this file is the "what's still hanging" list. Each entry should stand alone:
enough context to act on without the conversation that created it.

Opened 2026-08-19. Last refreshed 2026-10-21.

---

## Ready to build

### Wire labor share into Holiday Planning

The mechanism exists and works as of 2026-10-21: ticking "doing it" in Pick Tock
writes a Labor Share row, Sequins sets that day’s curfew to assembly start minus
five, and Pick Tock shows a dot when they agree. See CLAUDE.md, "Labor share".

What is not wired is Holiday Planning. Its early-finish field is still whatever
hour someone types, with no idea whether Pick Pack needs the people that day —
the original complaint. The seam is `hpState_`: a day already carries
`earlyFinish`, so a holiday week would read the same Labor Share rows rather than
gaining a new lever.

Cori, 2026-10-21: "It will touch holiday planning yes but I'm not quite ready to
push that into the holiday planner yet." So this waits for her, not for code.
### A forecast week that is dated but not filled in

Written and tested on 2026-10-02, deliberately left unshipped — Cori: "we can
just wait a few days" — and then LOST when Code.js was rebuilt from v0.4.170
later the same day. It is in that session’s git history, not in the tree.

`fetchForecastWeekData` only creates a day when it finds a positive quantity, so
a week the forecast has dated and not yet filled comes back empty: nothing to
preview, nothing stored, and it never reaches the Holiday picker. That is the
New Year week today — Compiled carries seven placeholder cells for Dec 28 – Jan 3
against 427 for Wk 48.

One line seeds the day from the date columns instead. Worth shipping only if
Compiled still has not filled that week in when she wants to plan it — 19 days on,
it may well have, which would make this unnecessary.

### Finish the tablet pass on My Line

**Three of the four items were already done — checked 2026-10-21.** The numeric
keyboard shipped in v0.5.187; hiding the nav for a floor-only login shipped as
applyFloorOnlyChrome_, which also lands them straight on My Line; and Cori
confirmed individual logins per tablet (2026-09-03 and again 2026-10-21), which
is the shape floorOnly_ already assumes.

What is left needs the hardware:

- **Confirm the breakpoint on the tablet the floor actually uses.** Cori,
  2026-10-21: it will be existing equipment, model not yet known. v0.5.174 set
  the 900px breakpoint and it was verified on her Galaxy Fold at 766px. A
  10-inch tablet is nearer 1024 landscape, so the layout should hold, but the
  run sheet and the entry panel want a real look before the floor relies on it.
## Small, mine to do

### WRAP_SHAWARMA_CHICKPEA cannot be placed on any day

**Cause found 2026-10-21. Needs a Line Config decision, not code.** 437 units a
day (Wk 41), its allergen data complete.

It declares [soy, wheat, sesame] and is blocked at BOTH ends of the wrap chain:

- No milk. The greedy chain starts with ITALIAN_WRAP_202502 [milk, wheat], the
  smallest set among the wraps, so milk is in the accumulated set from slot 1
  and this wrap can never join.
- Yes sesame, which no other FC-W wrap carries. So it cannot go first either —
  nothing could follow it.

It is the only no-milk, yes-sesame SKU on a line where every other SKU is the
reverse. Moving it to the sandwich line does not help: TURKEY_CLUB_SANDWICH puts
milk in at slot 1 there too (simulated).

What works: **seed an FC line with it.** Its food-contact block is then itself
alone — about 36 minutes at UPM 12.3 — and non-FC runs after it, which the
two-block rule allows. The other wraps go on the remaining two FC lines. Both the
seed and the line assignment are config and Cori’s to set.

NAPA_CHICKPEA_WRAP [soy, wheat] has the same no-milk problem but zero volume —
in the library, not on the menu — so it never reaches the engine. If it comes
back it would place immediately before the shawarma wrap, and the pair would make
a clean two-SKU FC block.

It published fine for 59 days across 87 archived rows, always LINE-2, never
overridden — consistent with the menu since adding milk to nearly every wrap.
Cori’s 10-minute-clean argument (see CLAUDE.md, allergen compounding) would
dissolve it entirely if Samad reopened that rule.

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
