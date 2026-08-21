# Sequins — Backlog

Open items only. Delete an entry when it's done — git history is the record,
this file is the "what's still hanging" list. Each entry should stand alone:
enough context to act on without the conversation that created it.

Opened 2026-08-19.

---

## Ready to build

### Sandbox needs a real "no cap" option

Since v0.5.131 a blank Finish by means **16:30**, so every sandbox day is
capped whether anyone asked for it or not. That switches the engine from
balancing on duration to balancing on projected clock finish, which makes
start times decide everything: LINE-3 (08:20) structurally gets ~2h less work
than LINE-2/LINE-4 (06:20). Samad reported exactly this — "Line 3 keeps
getting shorted hours" — on a sandbox where he had entered no curfews at all.

Before .131 the sandbox passed no finish-by and fell through to the live
view's selected day, which was usually off, so days ran uncapped on even
run-hours.

Fix: an explicit "no cap" choice per day in the Finish by table, so blank or
"none" genuinely means uncapped. Right now an uncapped day cannot be modelled
at all, which was possible before.

### Recommend how to structure a new line

Cori, 2026-08-21. When standing up a line (LINE-7 for holiday volume), have
Sequins propose what it should *be* — pool, capabilities, start time, seed —
based on where volume is actually growing. A week that is mostly wraps wants a
different 7th line than one that is mostly bowls.

The engine has no notion of what a line *should* be, only whether SKUs fit on
one, so this is a new capability rather than a readout. Inputs already exist:
46 published day-versions of real line/SKU/volume mix in the archive, plus
forecast demand out to Wk 52.

Shape it as: read the mix trend → cluster the growth by pool and package →
propose a line config → run it through the existing sandbox engine to show
the before/after. Simulate against archive history before wiring anything in,
per house rule.

---

## Blocked on Cori

### Go-live date for sandbox-only lines

`sandboxOnly` is a boolean today: a line is either hidden from live planning or
it isn't, and flipping it is a manual edit in Line Config.

What Cori actually wants: set a **date** in Line Config for when a staged line
joins real planning, so LINE-7 turns itself on for the holiday weeks without
anyone remembering to un-tick a box.

Deliberately deferred on 2026-08-19 to ship the sandbox modelling first. When
it's built: the flag becomes a date comparison at the same single chokepoint in
`runSequencer`, plus a date input in Line Config. Nothing else should need to
move — every live surface already routes through `liveLines_`.

Note the per-sandbox `lineDays` map stays regardless. It answers a different
question ("how many days do we need it") from the go-live date ("when does it
become real").

---

## Blocked on someone else

### Repo visibility — public since 2026-06-30

`Farmers-Fridge-AI-Workbench/sequins` is **public to the internet**, not
internal to Farmers Fridge. Verified by anonymous fetch: the full `Code.js`
downloads with no authentication.

Cori has write, not admin, so she can't change it. Needs an org owner
(github.com/orgs/Farmers-Fridge-AI-Workbench/people → Role: Owner) to either
flip visibility to Internal/Private, or grant her Admin on the repo.

Origin: the repo was created under the personal account `data-fairy-godmother`
and later transferred into the org. GitHub transfers preserve visibility, so
the setting was made at creation and the ability to change it moved away with
the transfer. Org audit log (`repo.access`) has the specifics.

### Org repo-creation policy

The org has **4 public repos**, so this likely isn't limited to Sequins.
Suggest to the org owner: Settings → Member privileges → Repository creation,
restricted to private/internal. Prevents recurrence better than auditing repos
one at a time.

---

## Ready to run

### Sheet sharing audit — the 9 spreadsheets in `Code.js`

The repo exposed the file IDs of all nine source/destination sheets. IDs are
addresses, not keys — what actually gates the data is each sheet's own sharing
setting.

Check all nine for "anyone with the link." Read-only, ~1 minute. Any sheet set
that way is effectively public right now regardless of what happens to the repo.

Worth doing whichever way the visibility decision lands.

---

## Decisions pending

### Wraps → LINE-3 / Sandwiches → LINE-2

Still unconfirmed — see the "In transition" section of CLAUDE.md for the full
picture. Short version: the code has already moved to soft home-line
preferences, but whether the *stated* rule retires is Cori's call. Don't encode
either reading without asking.

---

## Optional — quality of life

### Permission allowlist

No `.claude/` config in this repo yet, so routine read-only commands
(`git status`, `node --check`, greps) prompt every time. The
`/fewer-permission-prompts` skill scans actual usage and writes a sensible
project allowlist.

### Pre-ship syntax check as one command

CLAUDE.md mandates `node --check Code.js` **and** extracting the main
`<script>` block from `Index.html` via Python regex into a temp `.js` to
`node --check` that too — every time, no exceptions. The second half is fiddly
enough to get skipped under time pressure. A short script in the repo would
make it one command and remove the excuse.
